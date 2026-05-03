const prisma = require('../../config/database');
const { NotFoundError, BusinessLogicError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta, buildOrderBy } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');

const BLOCKED_STATUSES = ['TEMPORARILY_SUSPENDED', 'RESTRICTED', 'ARCHIVED'];

const ADMIN_ROLES = ['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'HR_ADMIN', 'FLEET_ADMIN', 'FINANCE_ADMIN'];

class ShiftService {
  static async list(query, currentUser = null) {
    const { page, limit, skip } = getPaginationParams(query);
    const orderBy = buildOrderBy(query, ['createdAt', 'requestedAt', 'startedAt']);
    const isAdmin = currentUser && ADMIN_ROLES.includes(currentUser.role);
    const isSupervisor = currentUser?.role === 'SUPERVISOR';

    const scope =
      currentUser?.role === 'DRIVER'
        ? { userId: currentUser.id }
        : isSupervisor
          ? { user: { supervisorId: currentUser.id, role: 'DRIVER' } }
          : {};

    const where = {
      ...scope,
      ...(isAdmin && query.userId && { userId: parseInt(query.userId) }),
      ...(query.status && { status: query.status }),
      ...(query.vehicleId && { vehicleId: parseInt(query.vehicleId) }),
      ...(query.dateFrom && { requestedAt: { gte: new Date(query.dateFrom) } }),
      ...(query.dateTo && { requestedAt: { ...((query.dateFrom && { gte: new Date(query.dateFrom) }) || {}), lte: new Date(query.dateTo) } }),
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
    return { items, meta: buildPaginationMeta(total, page, limit) };
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
        dailyReports: true,
        shiftLogs: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!shift) throw new NotFoundError('Shift');

    const isAdmin = currentUser && ADMIN_ROLES.includes(currentUser.role);
    const isSupervisor = currentUser?.role === 'SUPERVISOR';

    if (currentUser?.role === 'DRIVER' && shift.userId !== currentUser.id) {
      throw new NotFoundError('Shift');
    }
    if (isSupervisor) {
      const driver = await prisma.user.findFirst({
        where: { id: shift.userId, supervisorId: currentUser.id, role: 'DRIVER' },
        select: { id: true },
      });
      if (!driver) throw new NotFoundError('Shift');
    }
    return shift;
  }

  static async requestStart(userId, data) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');
    if (BLOCKED_STATUSES.includes(user.accountStatus)) {
      throw new BusinessLogicError(`Cannot start shift: account status is ${user.accountStatus}`);
    }

    const activeShift = await prisma.shift.findFirst({ where: { userId, status: { in: ['REQUESTED', 'APPROVED', 'ACTIVE'] } } });
    if (activeShift) throw new BusinessLogicError('You already have an active or pending shift');

    const vehicle = await prisma.vehicle.findFirst({ where: { id: data.vehicleId, status: 'ACTIVE', deletedAt: null } });
    if (!vehicle) throw new BusinessLogicError('Vehicle is not available');

    const platformAccount = await prisma.platformAccount.findFirst({ where: { id: data.platformAccountId, userId, status: 'ACTIVE', deletedAt: null } });
    if (!platformAccount) throw new BusinessLogicError('Platform account not found or inactive');

    const shift = await prisma.shift.create({
      data: {
        userId, vehicleId: data.vehicleId, platformAccountId: data.platformAccountId,
        startPhotoUrl: data.startPhotoUrl, notes: data.notes, status: 'REQUESTED',
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
    await prisma.user.update({ where: { id: shift.userId }, data: { availabilityStatus: 'ON_SHIFT' } });
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

    const updated = await prisma.shift.update({
      where: { id: parseInt(shiftId) },
      data: { status: 'ACTIVE', startedAt: new Date() },
    });

    await prisma.shiftLog.create({ data: { shiftId: parseInt(shiftId), action: 'SHIFT_STARTED', performedBy: userId } });
    return updated;
  }

  static async endShift(shiftId, userId, data = {}) {
    const shift = await prisma.shift.findUnique({ where: { id: parseInt(shiftId) } });
    if (!shift) throw new NotFoundError('Shift');
    if (shift.userId !== userId) throw new BusinessLogicError('Not your shift');
    if (shift.status !== 'ACTIVE') throw new BusinessLogicError('Shift is not active');

    const updated = await prisma.shift.update({
      where: { id: parseInt(shiftId) },
      data: { status: 'ENDED', endedAt: new Date(), endPhotoUrl: data.endPhotoUrl, notes: data.notes },
    });

    await prisma.user.update({ where: { id: userId }, data: { availabilityStatus: 'AVAILABLE' } });
    await prisma.shiftLog.create({ data: { shiftId: parseInt(shiftId), action: 'SHIFT_ENDED', performedBy: userId } });
    return updated;
  }

  static async cancel(shiftId, reason, userId) {
    const shift = await prisma.shift.findUnique({ where: { id: parseInt(shiftId) } });
    if (!shift) throw new NotFoundError('Shift');
    if (!['REQUESTED', 'APPROVED'].includes(shift.status)) throw new BusinessLogicError('Cannot cancel this shift');

    const updated = await prisma.shift.update({
      where: { id: parseInt(shiftId) },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: reason },
    });

    await prisma.shiftLog.create({ data: { shiftId: parseInt(shiftId), action: 'SHIFT_CANCELLED', performedBy: userId, notes: reason } });
    return updated;
  }
}

module.exports = ShiftService;
