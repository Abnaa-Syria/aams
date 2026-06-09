const prisma = require('../../config/database');
const { NotFoundError, BusinessLogicError, ConflictError, ValidationError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta, buildOrderBy, buildSearchFilter } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { buildDriverNameUserFilter } = require('../../utils/listScope');
const { mergeAppUserIdFilter } = require('../../utils/driverIdentity');

class VehicleService {
  static async list(query, currentUser = null) {
    const { page, limit, skip } = getPaginationParams(query);
    const orderBy = buildOrderBy(query, ['createdAt', 'plateNumber', 'manufacturer']);
    const searchFilter = buildSearchFilter(query, ['plateNumber', 'manufacturer', 'model']);
    const driverNameFilter = buildDriverNameUserFilter(query);

    // Operational scoping for DRIVER: active assignment + own pending submissions
    const appRole = currentUser?.appUser?.appRole;
    const isDriver = appRole === 'DRIVER';
    const scope = isDriver ? {
      assignments: {
        some: {
          userId: currentUser.id,
          OR: [
            { isActive: true },
            {
              isActive: false,
              releasedAt: null,
              vehicle: {
                status: { in: ['PENDING_VERIFICATION', 'PENDING_REPLACEMENT'] },
              },
            },
          ],
        },
      },
    } : {};

    const where = {
      deletedAt: null,
      ...scope,
      ...searchFilter,
      ...(query.status && { status: query.status }),
      ...(query.ownershipStatus && { ownershipStatus: query.ownershipStatus }),
      ...(driverNameFilter && {
        assignments: {
          some: {
            isActive: true,
            user: driverNameFilter,
          },
        },
      }),
    };

    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where, skip, take: limit, orderBy,
        include: {
          assignments: {
            where: { isActive: true },
            include: { user: { select: { id: true, fullNameAr: true, fullNameEn: true } } },
          },
        },
      }),
      prisma.vehicle.count({ where }),
    ]);

    return { vehicles, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getById(id) {
    const vid = parseInt(id);
    if (isNaN(vid)) throw new NotFoundError('Vehicle');
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vid, deletedAt: null },
      include: {
        assignments: {
          include: { user: { select: { id: true, fullNameAr: true, fullNameEn: true, identityNumber: true } } },
          orderBy: { assignedAt: 'desc' },
        },
        _count: { select: { fuelLogs: true, violations: true, maintenanceReqs: true, shifts: true } },
      },
    });
    if (!vehicle) throw new NotFoundError('Vehicle');
    return vehicle;
  }

  static async create(data) {
    return prisma.vehicle.create({ data });
  }

  static parseOptionalInt(value) {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) throw new ValidationError('Invalid numeric value');
    return parsed;
  }

  static parseOptionalDate(value) {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new ValidationError('Invalid date value');
    return date;
  }

  static buildDriverVehicleData(data) {
    const plateNumber = String(data.plateNumber || '').trim();
    if (!plateNumber) throw new ValidationError('plateNumber is required');

    return {
      plateNumber,
      manufacturer: data.manufacturer || data.make || data.brand || undefined,
      model: data.model || undefined,
      year: VehicleService.parseOptionalInt(data.year),
      color: data.color || undefined,
      odometerKm: VehicleService.parseOptionalInt(data.odometerKm ?? data.odometer),
      ownershipStatus: 'DRIVER_OWNED',
      insuranceCompany: data.insuranceCompany || undefined,
      insurancePolicyNo: data.insurancePolicyNo || data.insurancePolicyNumber || undefined,
      insuranceStartDate: VehicleService.parseOptionalDate(data.insuranceStartDate),
      insuranceExpiryDate: VehicleService.parseOptionalDate(data.insuranceExpiryDate || data.insuranceEndDate),
      registrationNumber: data.registrationNumber || data.istimaraNumber || undefined,
      registrationExpiry: VehicleService.parseOptionalDate(data.registrationExpiry || data.registrationExpiryDate || data.istimaraExpiryDate),
      tankCapacity: VehicleService.parseOptionalInt(data.tankCapacity),
      fuelType: data.fuelType || undefined,
      notes: data.notes || undefined,
    };
  }

  static async findDriverPendingSubmission(userId) {
    return prisma.vehicleAssignment.findFirst({
      where: {
        userId,
        isActive: false,
        releasedAt: null,
        vehicle: {
          deletedAt: null,
          ownershipStatus: 'DRIVER_OWNED',
          status: { in: ['PENDING_VERIFICATION', 'PENDING_REPLACEMENT'] },
        },
      },
      include: {
        vehicle: { select: { id: true, plateNumber: true, status: true } },
      },
    });
  }

  static async createForDriver(currentUser, data) {
    if (currentUser?.appRole !== 'DRIVER') {
      throw new BusinessLogicError('Only drivers can add their own vehicles');
    }

    const vehicleData = VehicleService.buildDriverVehicleData(data);

    const existingVehicle = await prisma.vehicle.findFirst({
      where: { plateNumber: vehicleData.plateNumber, deletedAt: null },
      select: { id: true },
    });
    if (existingVehicle) {
      throw new ConflictError('رقم اللوحة مسجل مسبقاً');
    }

    const pendingSubmission = await VehicleService.findDriverPendingSubmission(currentUser.id);
    if (pendingSubmission) {
      throw new BusinessLogicError('لديك طلب مركبة قيد المراجعة بالفعل');
    }

    const activeAssignment = await prisma.vehicleAssignment.findFirst({
      where: { userId: currentUser.id, isActive: true },
      select: { id: true, vehicleId: true },
    });

    const submissionType = activeAssignment ? 'PENDING_REPLACEMENT' : 'PENDING_VERIFICATION';

    const result = await prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.create({
        data: {
          ...vehicleData,
          status: submissionType,
        },
      });
      const assignment = await tx.vehicleAssignment.create({
        data: {
          vehicleId: vehicle.id,
          userId: currentUser.id,
          isActive: false,
          notes: data.assignmentNotes || (
            submissionType === 'PENDING_REPLACEMENT'
              ? `Replacement request while active vehicle #${activeAssignment.vehicleId}`
              : 'Driver submitted vehicle for verification'
          ),
        },
      });

      return { vehicle, assignment, submissionType };
    });

    await logAudit({
      userId: currentUser.id,
      action: 'DRIVER_SUBMIT_VEHICLE',
      entity: 'Vehicle',
      entityId: String(result.vehicle.id),
      newValue: {
        plateNumber: vehicleData.plateNumber,
        ownershipStatus: 'DRIVER_OWNED',
        submissionType,
      },
    });

    return result;
  }

  static async approveDriverSubmission(vehicleId, adminUser, data = {}) {
    const vid = parseInt(vehicleId, 10);
    if (Number.isNaN(vid)) throw new NotFoundError('Vehicle');

    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vid, deletedAt: null },
      include: {
        assignments: {
          where: { isActive: false, releasedAt: null },
          orderBy: { assignedAt: 'desc' },
          take: 1,
          include: { user: { include: { appUser: true } } },
        },
      },
    });
    if (!vehicle) throw new NotFoundError('Vehicle');
    if (!['PENDING_VERIFICATION', 'PENDING_REPLACEMENT'].includes(vehicle.status)) {
      throw new BusinessLogicError('المركبة ليست في انتظار الموافقة');
    }
    if (vehicle.ownershipStatus !== 'DRIVER_OWNED') {
      throw new BusinessLogicError('هذا الطلب ليس لمركبة مقدمة من سائق');
    }

    const pendingAssignment = vehicle.assignments[0];
    if (!pendingAssignment) {
      throw new BusinessLogicError('لا يوجد طلب تعيين مرتبط بهذه المركبة');
    }

    const driverId = pendingAssignment.userId;
    const isDriver = pendingAssignment.user?.userType === 'APP_USER'
      && pendingAssignment.user?.appUser?.appRole === 'DRIVER';
    if (!isDriver) {
      throw new BusinessLogicError('المستخدم المرتبط بالطلب ليس سائقاً');
    }

    const result = await prisma.$transaction(async (tx) => {
      if (vehicle.status === 'PENDING_REPLACEMENT') {
        const activeAssignment = await tx.vehicleAssignment.findFirst({
          where: { userId: driverId, isActive: true },
        });
        if (activeAssignment) {
          await tx.vehicleAssignment.update({
            where: { id: activeAssignment.id },
            data: { isActive: false, releasedAt: new Date() },
          });
          await tx.vehicle.update({
            where: { id: activeAssignment.vehicleId },
            data: { status: 'RESERVED' },
          });
        }
      } else {
        const existingActive = await tx.vehicleAssignment.findFirst({
          where: { userId: driverId, isActive: true },
        });
        if (existingActive) {
          throw new BusinessLogicError('السائق لديه مركبة نشطة بالفعل');
        }
      }

      await tx.vehicleAssignment.update({
        where: { id: pendingAssignment.id },
        data: {
          isActive: true,
          notes: data.notes || pendingAssignment.notes,
        },
      });

      return tx.vehicle.update({
        where: { id: vid },
        data: { status: 'ACTIVE' },
      });
    });

    await logAudit({
      userId: adminUser.id,
      action: 'APPROVE_DRIVER_VEHICLE',
      entity: 'Vehicle',
      entityId: String(vid),
      newValue: { driverId, previousStatus: vehicle.status },
    });

    return result;
  }

  static async rejectDriverSubmission(vehicleId, adminUser, data = {}) {
    const vid = parseInt(vehicleId, 10);
    if (Number.isNaN(vid)) throw new NotFoundError('Vehicle');

    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vid, deletedAt: null },
      include: {
        assignments: {
          where: { isActive: false, releasedAt: null },
          orderBy: { assignedAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!vehicle) throw new NotFoundError('Vehicle');
    if (!['PENDING_VERIFICATION', 'PENDING_REPLACEMENT'].includes(vehicle.status)) {
      throw new BusinessLogicError('المركبة ليست في انتظار الموافقة');
    }
    if (vehicle.ownershipStatus !== 'DRIVER_OWNED') {
      throw new BusinessLogicError('هذا الطلب ليس لمركبة مقدمة من سائق');
    }

    const pendingAssignment = vehicle.assignments[0];
    if (!pendingAssignment) {
      throw new BusinessLogicError('لا يوجد طلب تعيين مرتبط بهذه المركبة');
    }

    const rejectionNote = data.reason || data.notes || 'Driver vehicle submission rejected';

    const result = await prisma.$transaction(async (tx) => {
      await tx.vehicleAssignment.update({
        where: { id: pendingAssignment.id },
        data: {
          releasedAt: new Date(),
          notes: rejectionNote,
        },
      });

      return tx.vehicle.update({
        where: { id: vid },
        data: {
          status: 'DECOMMISSIONED',
          notes: vehicle.notes
            ? `${vehicle.notes}\n\nRejected: ${rejectionNote}`
            : `Rejected: ${rejectionNote}`,
        },
      });
    });

    await logAudit({
      userId: adminUser.id,
      action: 'REJECT_DRIVER_VEHICLE',
      entity: 'Vehicle',
      entityId: String(vid),
      newValue: { reason: rejectionNote },
    });

    return result;
  }

  static async update(id, data, adminUser) {
    const vehicle = await prisma.vehicle.findFirst({ where: { id: parseInt(id), deletedAt: null } });
    if (!vehicle) throw new NotFoundError('Vehicle');

    const updateData = {};
    const allowedFields = [
      'plateNumber', 'manufacturer', 'model', 'year', 'color', 'odometerKm', 
      'status', 'ownershipStatus', 'tankCapacity', 'fuelType', 'notes',
      'insuranceCompany', 'insurancePolicyNo', 'insuranceStartDate', 'insuranceExpiryDate',
      'registrationNumber', 'registrationExpiry'
    ];

    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    });

    // Normalize and validate status
    const validStatuses = [
      'ACTIVE', 'IN_MAINTENANCE', 'OUT_OF_SERVICE', 'RESERVED', 'DECOMMISSIONED',
      'PENDING_VERIFICATION', 'PENDING_REPLACEMENT',
    ];
    if (updateData.status) {
      if (!validStatuses.includes(updateData.status)) {
        // If legacy "APPROVED" or invalid, default to ACTIVE or current valid status
        updateData.status = validStatuses.includes(vehicle.status) ? vehicle.status : 'ACTIVE';
      }
    }

    // Sanitize numeric fields
    if (updateData.year) updateData.year = parseInt(updateData.year);
    if (updateData.odometerKm) updateData.odometerKm = parseInt(updateData.odometerKm);
    if (updateData.tankCapacity) updateData.tankCapacity = parseInt(updateData.tankCapacity);

    // Sanitize dates
    ['insuranceStartDate', 'insuranceExpiryDate', 'registrationExpiry'].forEach(d => {
      if (updateData[d]) updateData[d] = new Date(updateData[d]);
    });

    const updated = await prisma.vehicle.update({ 
      where: { id: parseInt(id) }, 
      data: updateData 
    });

    await logAudit({ userId: adminUser.id, action: 'UPDATE_VEHICLE', entity: 'Vehicle', entityId: String(id) });
    return updated;
  }

  static async assignDriver(vehicleId, userId, notes, adminUser) {
    const vid = parseInt(vehicleId);
    const uid = parseInt(userId);

    const vehicle = await prisma.vehicle.findFirst({ where: { id: vid, deletedAt: null } });
    if (!vehicle) throw new NotFoundError('Vehicle');
    
    // 1. Check if vehicle is available
    if (vehicle.status !== 'ACTIVE') {
      throw new BusinessLogicError('المركبة ليست في حالة نشطة حالياً (Active). يرجى التأكد من حالتها أولاً.');
    }

    const user = await prisma.user.findFirst({ 
      where: { id: uid, deletedAt: null },
      include: { appUser: true }
    });
    if (!user) throw new NotFoundError('Driver');

    // 2. Check if driver is eligible
    const isDriver = user.userType === 'APP_USER' && user.appUser?.appRole === 'DRIVER';
    if (!isDriver) throw new BusinessLogicError('المستخدم المحدد ليس سائقاً');
    if (user.accountStatus !== 'ACTIVE') throw new BusinessLogicError('حساب السائق غير نشط حالياً');

    // 3. Check if driver already has an active vehicle
    const existingAssignment = await prisma.vehicleAssignment.findFirst({
      where: { userId: uid, isActive: true }
    });
    if (existingAssignment) {
      throw new BusinessLogicError('هذا السائق لديه مركبة مستلمة حالياً بالفعل');
    }

    // 4. Perform assignment
    const result = await prisma.$transaction(async (tx) => {
      // Release any lingering assignments for this vehicle (shouldn't be any if status was ACTIVE, but safety first)
      await tx.vehicleAssignment.updateMany({
        where: { vehicleId: vid, isActive: true },
        data: { isActive: false, releasedAt: new Date() }
      });

      // Create new assignment
      const assignment = await tx.vehicleAssignment.create({
        data: { vehicleId: vid, userId: uid, notes, isActive: true },
      });

      // Update vehicle status
      await tx.vehicle.update({
        where: { id: vid },
        data: { status: 'ACTIVE' } // Keep ACTIVE but linked via assignment
      });

      return assignment;
    });

    await logAudit({
      userId: adminUser.id, action: 'ASSIGN_VEHICLE', entity: 'VehicleAssignment',
      entityId: String(result.id), newValue: { vehicleId: vid, userId: uid, notes },
    });

    return result;
  }

  static async releaseDriver(vehicleId, adminUser) {
    const vid = parseInt(vehicleId);
    
    await prisma.$transaction(async (tx) => {
      const activeShifts = await tx.shift.findMany({
        where: { vehicleId: vid, status: { in: ['REQUESTED', 'APPROVED', 'ACTIVE'] } },
        select: { userId: true }
      });

      // 1. Release assignment
      await tx.vehicleAssignment.updateMany({
        where: { vehicleId: vid, isActive: true },
        data: { isActive: false, releasedAt: new Date() },
      });
      
      // 2. End any active shifts for this vehicle
      await tx.shift.updateMany({
        where: { vehicleId: vid, status: { in: ['REQUESTED', 'APPROVED', 'ACTIVE'] } },
        data: { status: 'CANCELLED', endedAt: new Date(), notes: 'Shift ended automatically due to vehicle release' },
      });

      // 3. Reset availability for users who were on those shifts
      if (activeShifts.length > 0) {
        const userIds = activeShifts.map(s => s.userId);
        await tx.user.updateMany({
          where: { id: { in: userIds } },
          data: { availabilityStatus: 'AVAILABLE' }
        });
        await tx.appUser.updateMany({
          where: { userId: { in: userIds } },
          data: { availabilityStatus: 'AVAILABLE' }
        });
      }
      
      // 4. Update vehicle status
      await tx.vehicle.update({
        where: { id: vid },
        data: { status: 'ACTIVE' }
      });
    });

    await logAudit({
      userId: adminUser.id, action: 'RELEASE_VEHICLE', entity: 'Vehicle', entityId: String(vid),
    });
  }

  static async softDelete(id, adminUser) {
    const vehicle = await prisma.vehicle.findFirst({ where: { id: parseInt(id), deletedAt: null } });
    if (!vehicle) throw new NotFoundError('Vehicle');

    await prisma.vehicle.update({ where: { id: parseInt(id) }, data: { deletedAt: new Date(), status: 'DECOMMISSIONED' } });
    await logAudit({ userId: adminUser.id, action: 'DELETE_VEHICLE', entity: 'Vehicle', entityId: String(id) });
  }

  /**
   * Automated cron service method: Checks for vehicles that have exceeded their next oil change odometer threshold.
   */
  static async checkOilChangeReminders() {
    console.log('[Cron] Running checkOilChangeReminders...');
    
    // Find all active vehicles
    const vehicles = await prisma.vehicle.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      select: {
        id: true,
        plateNumber: true,
        odometerKm: true,
        oilChangeLogs: {
          orderBy: { changeDate: 'desc' },
          take: 1,
          select: { nextDueOdometer: true }
        }
      }
    });

    if (vehicles.length === 0) return 0;

    // We need an admin to notify. Find the first super admin.
    const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN', deletedAt: null } });
    if (!admin) return 0;

    let remindersCreated = 0;

    for (const vehicle of vehicles) {
      if (vehicle.odometerKm == null) continue;

      const lastLog = vehicle.oilChangeLogs[0];
      if (!lastLog || lastLog.nextDueOdometer == null) continue;

      // Check if threshold is reached
      if (vehicle.odometerKm >= lastLog.nextDueOdometer) {
        const title = `تنبيه صيانة دورية: مركبة ${vehicle.plateNumber}`;
        
        // Avoid duplicate active reminders
        const existingReminder = await prisma.scheduledReminder.findFirst({
          where: {
            targetUserId: admin.id,
            title: { equals: title },
            status: 'PENDING'
          }
        });

        if (!existingReminder) {
          await prisma.scheduledReminder.create({
            data: {
              title: title,
              body: `المركبة ${vehicle.plateNumber} تجاوزت حد تغيير الزيت. العداد الحالي: ${vehicle.odometerKm}، الحد المسموح: ${lastLog.nextDueOdometer}. الرجاء إجراء الصيانة اللازمة.`,
              triggerDate: new Date(),
              targetUserId: admin.id, // Notify the admin
              createdById: admin.id, // Attributed to admin for now
              status: 'PENDING'
            }
          });
          remindersCreated++;
        }
      }
    }

    console.log(`[Cron] checkOilChangeReminders completed. Created ${remindersCreated} reminders.`);
    return remindersCreated;
  }

  static async getVehicleProfileSummary(id, currentUser = null) {
    const vid = parseInt(id);
    if (isNaN(vid)) throw new NotFoundError('Vehicle');
    
    // 1. Basic Info & Existence check
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vid, deletedAt: null },
    });
    if (!vehicle) throw new NotFoundError('Vehicle');

    // Operational scoping for DRIVER: active assignment or own pending submission
    if (currentUser?.appUser?.appRole === 'DRIVER') {
      const isAssigned = await prisma.vehicleAssignment.findFirst({
        where: {
          vehicleId: vid,
          userId: currentUser.id,
          OR: [
            { isActive: true },
            {
              isActive: false,
              releasedAt: null,
              vehicle: { status: { in: ['PENDING_VERIFICATION', 'PENDING_REPLACEMENT'] } },
            },
          ],
        },
        select: { id: true },
      });
      if (!isAssigned) {
        throw new NotFoundError('Vehicle');
      }
    }

    const [activeAssignment, activeShift, fuelKPIs, violationKPIs, maintenanceCount, oilCount, latestOilLog, assignmentCount] = await Promise.all([
      // 2. Current Long-term Assignee
      prisma.vehicleAssignment.findFirst({
        where: { vehicleId: vid, isActive: true },
        include: { user: { select: { id: true, fullNameAr: true, mobileNumber: true } } },
      }),
      // 3. Current Active Driver (On Shift)
      prisma.shift.findFirst({
        where: { vehicleId: vid, status: 'ACTIVE' },
        orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
        include: { user: { select: { id: true, fullNameAr: true, mobileNumber: true } } },
      }),
      // 4. Fuel KPIs
      prisma.fuelLog.aggregate({
        where: { vehicleId: vid, status: 'APPROVED' },
        _sum: { amount: true, liters: true },
      }),
      // 5. Violations KPIs
      prisma.violation.aggregate({
        where: { vehicleId: vid },
        _count: { id: true },
        _sum: { amount: true },
      }),
      // 6. Maintenance Count
      prisma.maintenanceRequest.count({ where: { vehicleId: vid } }),
      // Oil Logs Count
      prisma.oilChangeLog.count({ where: { vehicleId: vid } }),
      // Next Change Odometer
      prisma.oilChangeLog.findFirst({
        where: { vehicleId: vid },
        orderBy: { changeDate: 'desc' },
        select: { nextDueOdometer: true }
      }),
      // 7. Assignment History Count
      prisma.vehicleAssignment.count({ where: { vehicleId: vid } })
    ]);

    return {
      vehicle,
      // activeDriver prioritizes the on-shift driver, falls back to assignee
      activeDriver: activeShift?.user || activeAssignment?.user || null,
      activeAssignment: activeAssignment || null,
      activeShiftId: activeShift?.id || null,
      stats: {
        totalFuelCost: fuelKPIs._sum.amount || 0,
        totalFuelLiters: fuelKPIs._sum.liters || 0,
        violationCount: violationKPIs._count.id || 0,
        totalViolationFees: violationKPIs._sum.amount || 0,
        maintenanceLogsCount: maintenanceCount + oilCount,
        nextOilChangeAt: latestOilLog?.nextDueOdometer || null,
        totalAssignments: assignmentCount
      }
    };
  }

  static async listAssignments(query) {
    const { page, limit, skip } = getPaginationParams(query);
    let where = {
      ...(query.vehicleId && { vehicleId: parseInt(query.vehicleId) }),
      ...(query.userId && { userId: parseInt(query.userId) }),
      ...(query.isActive !== undefined && { isActive: query.isActive === 'true' }),
    };
    where = mergeAppUserIdFilter(where, query.appUserId);

    const [items, total] = await Promise.all([
      prisma.vehicleAssignment.findMany({
        where, skip, take: limit,
        orderBy: { assignedAt: 'desc' },
        include: {
          user: { select: { id: true, fullNameAr: true, identityNumber: true } },
          vehicle: { select: { id: true, plateNumber: true, model: true } },
        },
      }),
      prisma.vehicleAssignment.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(total, page, limit) };
  }
}

module.exports = VehicleService;
