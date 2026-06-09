const prisma = require('../../config/database');
const { NotFoundError, BusinessLogicError, ValidationError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta, buildOrderBy } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { buildDriverNameUserFilter } = require('../../utils/listScope');
const { parsePositiveInt } = require('../../utils/driverIdentity');

const BLOCKED_STATUSES = ['TEMPORARILY_SUSPENDED', 'RESTRICTED', 'ARCHIVED'];

const ADMIN_ROLES = ['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'HR_ADMIN', 'FLEET_ADMIN', 'FINANCE_ADMIN'];

class ShiftService {
  static async list(query, currentUser = null) {
    const { page, limit, skip } = getPaginationParams(query);
    const orderBy = buildOrderBy(query, ['createdAt', 'requestedAt', 'startedAt']);
    const isAdmin = currentUser && ADMIN_ROLES.includes(currentUser.role);
    const appRole = currentUser?.appUser?.appRole;
    const isSupervisor = appRole === 'SUPERVISOR';

    // Use userId for all operational identity checks
    const scope =
      appRole === 'DRIVER'
        ? { userId: currentUser.id }
        : isSupervisor
          ? { user: { appUser: { supervisorId: currentUser.appUserId } } }
          : {};

    const nameFilter = buildDriverNameUserFilter(query);
    const queryAppUserId = parsePositiveInt(query.appUserId);

    const scopedUserWhere = scope.user && typeof scope.user === 'object' ? scope.user : null;
    const userFilter = {
      ...(scopedUserWhere || {}),
      ...((queryAppUserId || scopedUserWhere?.appUser) && {
        appUser: {
          ...(scopedUserWhere?.appUser || {}),
          ...(queryAppUserId && { id: queryAppUserId }),
        },
      }),
      ...(nameFilter || {}),
    };

    const where = {
      ...scope,
      ...((isAdmin || isSupervisor) && query.userId && { 
        userId: parseInt(query.userId)
      }),
      ...(query.status && { status: query.status }),
      ...(query.vehicleId && { vehicleId: parseInt(query.vehicleId) }),
      ...(query.dateFrom && { requestedAt: { gte: new Date(query.dateFrom) } }),
      ...(query.dateTo && { requestedAt: { ...((query.dateFrom && { gte: new Date(query.dateFrom) }) || {}), lte: new Date(query.dateTo) } }),
      ...((queryAppUserId || nameFilter) && { user: userFilter }),
    };

    const [items, total] = await Promise.all([
      prisma.shift.findMany({
        where, skip, take: limit, orderBy,
        include: {
          user: { select: { id: true, fullNameAr: true, identityNumber: true } },
          vehicle: { select: { id: true, plateNumber: true, model: true } },
          platformAccount: { include: { platform: { select: { id: true, nameAr: true } } } },
        },
      }),
      prisma.shift.count({ where }),
    ]);
    
    // Collect all vehicle IDs from requested/approved shifts
    const pendingShifts = items.filter(s => ['REQUESTED', 'APPROVED'].includes(s.status));
    const vehicleIds = [...new Set(pendingShifts.map(s => s.vehicleId))];
    
    // Fetch all active shifts for these vehicles
    const activeVehicleShifts = vehicleIds.length > 0 ? await prisma.shift.findMany({
      where: {
        vehicleId: { in: vehicleIds },
        status: 'ACTIVE'
      },
      include: {
        user: { select: { id: true, fullNameAr: true } }
      }
    }) : [];
    
    const activeShiftsMap = {};
    for (const s of activeVehicleShifts) {
      activeShiftsMap[s.vehicleId] = s;
    }
    
    const transformedItems = items.map(item => {
      const activeShiftOnVehicle = activeShiftsMap[item.vehicleId];
      return {
        ...item,
        user: item.user,
        vehicle: item.vehicle,
        appUser: item.user ? { user: item.user } : null,
        conflictingActiveShift: (['REQUESTED', 'APPROVED'].includes(item.status) && activeShiftOnVehicle && activeShiftOnVehicle.userId !== item.userId) ? {
          id: activeShiftOnVehicle.id,
          driverName: activeShiftOnVehicle.user?.fullNameAr || 'سائق آخر',
          driverId: activeShiftOnVehicle.user?.id
        } : null
      };
    });

    return { items: transformedItems, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getById(id, currentUser = null) {
    const shift = await prisma.shift.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: { select: { id: true, fullNameAr: true, fullNameEn: true, identityNumber: true, mobileNumber: true } },
        vehicle: true,
        platformAccount: { include: { platform: true } },
        midShiftRecords: { orderBy: { createdAt: 'desc' } },
        fuelLogs: true,
        violations: true,
        incidents: true,
        dailyReports: {
          include: { appBreakdowns: true },
          orderBy: { reportDate: 'desc' },
        },
        shiftLogs: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!shift) throw new NotFoundError('Shift');

    const appRole = currentUser?.appUser?.appRole;
    
    if (appRole === 'DRIVER' && shift.userId !== currentUser.id) {
      throw new NotFoundError('Shift');
    }
    
    if (appRole === 'SUPERVISOR') {
      const isAssigned = await prisma.appUser.findFirst({
        where: { 
          user: { id: shift.userId }, 
          supervisorId: currentUser.appUserId
        },
        select: { id: true },
      });
      if (!isAssigned) throw new NotFoundError('Shift');
    }

    const kilometersDriven =
      typeof shift.startOdometer === 'number' && typeof shift.endOdometer === 'number'
        ? shift.endOdometer - shift.startOdometer
        : null;

    const breakdownMap = new Map();
    let totalOrders = null;
    let totalHours = null;

    if (Array.isArray(shift.dailyReports) && shift.dailyReports.length > 0) {
      let ordersSum = 0;
      let hoursSum = 0;
      let hasAnyOrders = false;
      let hasAnyHours = false;

      for (const report of shift.dailyReports) {
        if (typeof report.totalOrders === 'number') {
          ordersSum += report.totalOrders;
          hasAnyOrders = true;
        }

        if (report.totalHours != null) {
          const v = typeof report.totalHours === 'number' ? report.totalHours : Number(report.totalHours);
          if (!Number.isNaN(v)) {
            hoursSum += v;
            hasAnyHours = true;
          }
        }

        if (Array.isArray(report.appBreakdowns)) {
          for (const b of report.appBreakdowns) {
            const key = b.platformName || '—';
            const prev = breakdownMap.get(key) || { platformName: key, orders: 0, hours: 0, hasOrders: false, hasHours: false };

            if (typeof b.orders === 'number') {
              prev.orders += b.orders;
              prev.hasOrders = true;
            }

            if (b.hours != null) {
              const hv = typeof b.hours === 'number' ? b.hours : Number(b.hours);
              if (!Number.isNaN(hv)) {
                prev.hours += hv;
                prev.hasHours = true;
              }
            }

            breakdownMap.set(key, prev);
          }
        }
      }

      totalOrders = hasAnyOrders ? ordersSum : null;
      totalHours = hasAnyHours ? Number(hoursSum.toFixed(2)) : null;
    }

    const platformBreakdown = Array.from(breakdownMap.values())
      .map((b) => ({
        platformName: b.platformName,
        orders: b.hasOrders ? b.orders : null,
        hours: b.hasHours ? Number(b.hours.toFixed(2)) : null,
      }))
      .sort((a, b) => String(a.platformName).localeCompare(String(b.platformName), 'ar'));

    const activeShiftOnVehicle = ['REQUESTED', 'APPROVED'].includes(shift.status) ? await prisma.shift.findFirst({
      where: {
        vehicleId: shift.vehicleId,
        status: 'ACTIVE',
        id: { not: shift.id }
      },
      include: {
        user: { select: { id: true, fullNameAr: true } }
      }
    }) : null;

    return {
      ...shift,
      appUser: shift.user ? { user: shift.user } : null,
      kilometersDriven,
      platformBreakdown,
      totals: {
        totalOrders,
        totalHours,
      },
      conflictingActiveShift: (activeShiftOnVehicle && activeShiftOnVehicle.userId !== shift.userId) ? {
        id: activeShiftOnVehicle.id,
        driverName: activeShiftOnVehicle.user?.fullNameAr || 'سائق آخر',
        driverId: activeShiftOnVehicle.user?.id
      } : null
    };
  }

  static parseShiftDateTime(value) {
    if (!value) return null;
    const normalized = String(value).trim().replace(' ', 'T');
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
      throw new ValidationError(`Invalid date: ${value}`);
    }
    return date;
  }

  static async requestStart(userId, data) {
    if (!data || typeof data !== 'object') {
      throw new ValidationError('Request body is required');
    }

    const vehicleId = parseInt(data.vehicleId, 10);
    const platformAccountId = parseInt(data.platformAccountId, 10);
    const startOdometer = parseInt(data.startOdometer, 10);

    if (Number.isNaN(vehicleId)) throw new ValidationError('vehicleId is required');
    if (Number.isNaN(platformAccountId)) throw new ValidationError('platformAccountId is required');
    if (Number.isNaN(startOdometer)) throw new ValidationError('startOdometer is required');

    const requestedStartTime = data.requestedStartTime
      ? ShiftService.parseShiftDateTime(data.requestedStartTime)
      : null;
    const requestedEndTime = data.requestedEndTime
      ? ShiftService.parseShiftDateTime(data.requestedEndTime)
      : null;

    if (requestedStartTime && requestedEndTime && requestedEndTime <= requestedStartTime) {
      throw new BusinessLogicError('requestedEndTime must be after requestedStartTime');
    }

    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      include: { appUser: true }
    });
    if (!user) throw new NotFoundError('User');
    if (BLOCKED_STATUSES.includes(user.accountStatus)) {
      throw new BusinessLogicError(`Cannot start shift: account status is ${user.accountStatus}`);
    }

    const activeShift = await prisma.shift.findFirst({ where: { userId, status: { in: ['REQUESTED', 'APPROVED', 'ACTIVE'] } } });
    if (activeShift) throw new BusinessLogicError('You already have an active or pending shift');

    const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, status: 'ACTIVE', deletedAt: null } });
    if (!vehicle) throw new BusinessLogicError('Vehicle is not available');

    const activeVehicleShift = await prisma.shift.findFirst({
      where: { vehicleId, status: 'ACTIVE' },
      include: { user: { select: { fullNameAr: true } } },
    });
    if (activeVehicleShift) {
      const driverName = activeVehicleShift.user?.fullNameAr || 'سائق آخر';
      throw new BusinessLogicError(`المركبة مستخدمة حالياً في شفت نشط مع السائق (${driverName})`);
    }

    const platformAccount = await prisma.platformAccount.findFirst({
      where: { id: platformAccountId, userId, status: 'ACTIVE', deletedAt: null },
    });
    if (!platformAccount) throw new BusinessLogicError('Platform account not found or inactive');

    // Odometer validation: must not be less than vehicle's last recorded odometer
    if (startOdometer < (vehicle.odometerKm || 0)) {
      throw new BusinessLogicError(`Start odometer (${startOdometer}) cannot be less than vehicle's last recorded reading (${vehicle.odometerKm})`);
    }

    const shift = await prisma.shift.create({
      data: {
        userId,
        appUserId: user.appUser?.id || null, // Set appUserId for operational queries
        vehicleId,
        platformAccountId,
        requestedStartTime,
        requestedEndTime,
        startPhotoUrl: data.startPhotoUrl,
        startVehiclePhotoUrl: data.startVehiclePhotoUrl,
        startAppPhotoUrl: data.startAppPhotoUrl,
        startOdometer,
        notes: data.notes,
        status: 'REQUESTED',
      },
    });

    // Log the starting odometer
    await prisma.vehicleOdometerLog.create({
      data: {
        vehicleId,
        userId,
        shiftId: shift.id,
        reading: startOdometer,
        photoUrl: data.startOdometerPhotoUrl || data.startPhotoUrl,
        type: 'START_SHIFT',
      },
    });

    await prisma.shiftLog.create({ data: { shiftId: shift.id, action: 'SHIFT_REQUESTED', performedBy: userId } });
    return shift;
  }

  static async approve(shiftId, adminUser) {
    const shift = await prisma.shift.findUnique({ where: { id: parseInt(shiftId) } });
    if (!shift) throw new NotFoundError('Shift');
    if (shift.status !== 'REQUESTED') throw new BusinessLogicError('Shift is not in REQUESTED status');

    const updated = await prisma.shift.update({
      where: { id: parseInt(shiftId) },
      data: { status: 'APPROVED', approvedAt: new Date(), approvedBy: adminUser.id },
    });

    await prisma.shiftLog.create({ data: { shiftId: parseInt(shiftId), action: 'SHIFT_APPROVED', performedBy: adminUser.id } });
    await logAudit({ userId: adminUser.id, action: 'APPROVE_SHIFT', entity: 'Shift', entityId: String(shiftId) });
    return updated;
  }

  static async reject(shiftId, reason, adminUser) {
    const shift = await prisma.shift.findUnique({ where: { id: parseInt(shiftId) } });
    if (!shift) throw new NotFoundError('Shift');
    if (shift.status !== 'REQUESTED') throw new BusinessLogicError('Shift is not in REQUESTED status');

    const updated = await prisma.shift.update({
      where: { id: parseInt(shiftId) },
      data: { status: 'REJECTED', rejectedAt: new Date(), rejectedBy: adminUser.id, rejectionReason: reason },
    });

    await prisma.shiftLog.create({ data: { shiftId: parseInt(shiftId), action: 'SHIFT_REJECTED', performedBy: adminUser.id, notes: reason } });
    return updated;
  }

  static async startShift(shiftId, userId) {
    const shift = await prisma.shift.findUnique({ where: { id: parseInt(shiftId) } });
    if (!shift) throw new NotFoundError('Shift');
    if (shift.userId !== userId) throw new BusinessLogicError('Not your shift');
    if (shift.status !== 'APPROVED') throw new BusinessLogicError('Shift is not approved');

    const activeVehicleShift = await prisma.shift.findFirst({
      where: { vehicleId: shift.vehicleId, status: 'ACTIVE', id: { not: shift.id } },
      include: { user: { select: { fullNameAr: true } } },
    });
    if (activeVehicleShift) {
      const driverName = activeVehicleShift.user?.fullNameAr || 'سائق آخر';
      throw new BusinessLogicError(`المركبة مستخدمة حالياً في شفت نشط مع السائق (${driverName})`);
    }

    const updated = await prisma.shift.update({
      where: { id: parseInt(shiftId) },
      data: { status: 'ACTIVE', startedAt: new Date() },
    });

    await prisma.user.update({ where: { id: shift.userId }, data: { availabilityStatus: 'ON_SHIFT' } });
    await prisma.appUser.updateMany({ where: { userId: shift.userId }, data: { availabilityStatus: 'ON_SHIFT' } });
    await prisma.shiftLog.create({ data: { shiftId: parseInt(shiftId), action: 'SHIFT_STARTED', performedBy: userId } });
    return updated;
  }

  static async endShift(shiftId, userId, data = {}, bypassReportCheck = false) {
    const shift = await prisma.shift.findUnique({ where: { id: parseInt(shiftId) } });
    if (!shift) throw new NotFoundError('Shift');
    if (shift.userId !== userId) throw new BusinessLogicError('Not your shift');
    if (shift.status !== 'ACTIVE') throw new BusinessLogicError('Shift is not active');
    
    // Validate that a daily report has been submitted for this shift before ending
    if (!bypassReportCheck) {
      const reportCount = await prisma.dailyReport.count({
        where: { shiftId: parseInt(shiftId) }
      });
      if (reportCount === 0) {
        throw new BusinessLogicError('You must submit a daily report before ending your shift');
      }
    }

    // Odometer validation: must not be less than start odometer
    if (data.endOdometer && data.endOdometer < (shift.startOdometer || 0)) {
      throw new BusinessLogicError(`End odometer (${data.endOdometer}) cannot be less than start reading (${shift.startOdometer})`);
    }

    const updated = await prisma.shift.update({
      where: { id: parseInt(shiftId) },
      data: {
        status: 'ENDED',
        endedAt: new Date(),
        endPhotoUrl: data.endPhotoUrl,
        endAppPhotoUrl: data.endAppPhotoUrl,
        endOdometer: data.endOdometer,
        notes: data.notes,
        closureRequested: true,
      },
    });

    // Log the ending odometer and update vehicle current odometer
    if (data.endOdometer) {
      await prisma.vehicleOdometerLog.create({
        data: {
          vehicleId: shift.vehicleId,
          userId,
          shiftId: shift.id,
          reading: data.endOdometer,
          photoUrl: data.endOdometerPhotoUrl || data.endPhotoUrl,
          type: 'END_SHIFT',
        },
      });

      await prisma.vehicle.update({
        where: { id: shift.vehicleId },
        data: { odometerKm: data.endOdometer },
      });
    }

    await prisma.user.update({ where: { id: userId }, data: { availabilityStatus: 'AVAILABLE' } });
    await prisma.appUser.updateMany({ where: { userId: userId }, data: { availabilityStatus: 'AVAILABLE' } });
    await prisma.shiftLog.create({ data: { shiftId: parseInt(shiftId), action: 'SHIFT_ENDED', performedBy: userId } });
    return updated;
  }

  static async approveClosure(shiftId, adminUser) {
    const shift = await prisma.shift.findUnique({ where: { id: parseInt(shiftId) } });
    if (!shift) throw new NotFoundError('Shift');
    if (shift.status !== 'ENDED') throw new BusinessLogicError('Shift is not ENDED');
    if (shift.closureApprovedAt) throw new BusinessLogicError('Closure already approved');

    const updated = await prisma.shift.update({
      where: { id: parseInt(shiftId) },
      data: {
        closureApprovedBy: adminUser.id,
        closureApprovedAt: new Date(),
      },
    });

    await prisma.shiftLog.create({ data: { shiftId: parseInt(shiftId), action: 'SHIFT_CLOSURE_APPROVED', performedBy: adminUser.id } });
    await logAudit({ userId: adminUser.id, action: 'APPROVE_SHIFT_CLOSURE', entity: 'Shift', entityId: String(shiftId) });
    return updated;
  }

  static async updateStatus(shiftId, status, reason, adminUser) {
    const shift = await prisma.shift.findUnique({
      where: { id: parseInt(shiftId) },
      include: { vehicle: true }
    });
    if (!shift) throw new NotFoundError('Shift');

    if (status === shift.status) return shift;

    switch (status) {
      case 'APPROVED':
        return await ShiftService.approve(shiftId, adminUser);
      case 'REJECTED':
        return await ShiftService.reject(shiftId, reason || 'Status updated by admin', adminUser);
      case 'ACTIVE':
        return await ShiftService.startShift(shiftId, shift.userId);
      case 'ENDED':
        return await ShiftService.endShift(shiftId, shift.userId, {
          endOdometer: shift.vehicle?.odometerKm || shift.startOdometer || 0,
          notes: reason || 'Ended by admin',
        }, true);
      case 'CANCELLED':
        return await ShiftService.cancel(shiftId, reason || 'Cancelled by admin', adminUser);
      default:
        throw new ValidationError(`Invalid shift status: ${status}`);
    }
  }

  static async cancel(shiftId, reason, userOrUserId) {
    const shift = await prisma.shift.findUnique({ where: { id: parseInt(shiftId) } });
    if (!shift) throw new NotFoundError('Shift');

    const isId = typeof userOrUserId === 'number' || typeof userOrUserId === 'string';
    const performingUserId = isId ? parseInt(userOrUserId) : userOrUserId?.id;
    const isDriver = !isId && userOrUserId?.appUser?.appRole === 'DRIVER';

    if (isDriver && shift.userId !== performingUserId) {
      throw new BusinessLogicError('Not your shift');
    }

    if (!['REQUESTED', 'APPROVED'].includes(shift.status)) {
      const statusTranslations = {
        ACTIVE: 'نشط',
        ENDED: 'منتهي',
        CANCELLED: 'ملغي بالفعل',
        REJECTED: 'مرفوض',
      };
      const statusAr = statusTranslations[shift.status] || shift.status;
      throw new BusinessLogicError(`لا يمكن إلغاء هذا الشفت لأن حالته الحالية هي (${statusAr})، ويُسمح فقط بإلغاء الشفتات التي بحالة "مطلب شفت" أو "مقبول".`);
    }

    const updated = await prisma.shift.update({
      where: { id: parseInt(shiftId) },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: reason },
    });

    await prisma.shiftLog.create({ data: { shiftId: parseInt(shiftId), action: 'SHIFT_CANCELLED', performedBy: performingUserId, notes: reason } });
    return updated;
  }
}

module.exports = ShiftService;
