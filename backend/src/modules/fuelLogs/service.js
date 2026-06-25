const prisma = require('../../config/database');
const { NotFoundError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');
const { mergeDriverNameIntoUserWhere } = require('../../utils/listScope');
const { mergeAppUserIdFilter } = require('../../utils/driverIdentity');

class FuelLogService {
  static async list(query, currentUser) {
    const { page, limit, skip } = getPaginationParams(query);
    
    let where = {
      ...(query.vehicleId && { vehicleId: parseInt(query.vehicleId) }),
      ...(query.status && { status: query.status }),
      ...(query.shiftId && { shiftId: parseInt(query.shiftId) }),
      ...(query.userId && { userId: parseInt(query.userId) }),
    };
    where = mergeAppUserIdFilter(where, query.appUserId);

    if (query.dateFrom || query.dateTo) {
      where.fuelDate = {};
      if (query.dateFrom) where.fuelDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.fuelDate.lte = new Date(query.dateTo);
    }

    const appRole = currentUser?.appUser?.appRole;
    if (appRole === 'DRIVER') {
      where.userId = currentUser.id;
    } else if (appRole === 'SUPERVISOR') {
      where.user = { appUser: { supervisorId: currentUser.appUserId } };
    }

    where = mergeDriverNameIntoUserWhere(where, query);

    const [items, total] = await Promise.all([
      prisma.fuelLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fuelDate: 'desc' },
        include: {
          user: { select: { id: true, fullNameAr: true, identityNumber: true } },
          vehicle: { select: { id: true, plateNumber: true, manufacturer: true, model: true, tankCapacity: true } },
          shift: { select: { id: true, startedAt: true } },
        },
      }),
      prisma.fuelLog.count({ where }),
    ]);

    const transformedItems = items.map(item => ({
      ...item,
      appUser: item.user ? { user: item.user } : null,
    }));

    return { items: transformedItems, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getById(id) {
    const item = await prisma.fuelLog.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: { select: { id: true, fullNameAr: true, fullNameEn: true } },
        vehicle: true,
        shift: true,
      },
    });
    
    if (!item) throw new NotFoundError('Fuel Log');

    return {
      ...item,
      appUser: item.user ? { user: item.user } : null,
    };
  }

  static async create(currentUser, data, file = null) {
    const userId = currentUser.id;
    const vehicleId = parseInt(data.vehicleId);
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundError('Vehicle');

    // Get user with appUser
    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      include: { appUser: true }
    });
    if (!user) throw new NotFoundError('User');
    
    // Ensure driver has an active shift if they are reporting
    const { ensureActiveShift } = require('../../utils/shiftSecurity');
    const activeShift = await ensureActiveShift(currentUser);

    const amount = parseFloat(data.amount);
    const liters = data.liters ? parseFloat(data.liters) : null;

    let status = 'PENDING';
    let reviewNotes = '';

    if (liters && vehicle.tankCapacity && liters > vehicle.tankCapacity) {
      status = 'FLAGGED';
      reviewNotes = `Warning: Fuel liters (${liters}) exceeds vehicle tank capacity (${vehicle.tankCapacity})`;
    }

    const recent = await prisma.fuelLog.findFirst({
      where: {
        userId,
        vehicleId,
        createdAt: { gte: new Date(Date.now() - 15 * 60000) },
      },
    });

    const log = await prisma.fuelLog.create({
      data: {
        userId,
        appUserId: user.appUser?.id || null, // Set appUserId for operational queries
        vehicleId,
        shiftId: data.shiftId ? parseInt(data.shiftId) : (activeShift ? activeShift.id : undefined),
        amount,
        liters,
        fuelDate: data.fuelDate ? new Date(data.fuelDate) : new Date(),
        receiptUrl: file ? normalizeStoredUploadPath(file.path) : undefined,
        status,
        reviewNotes,
        isDuplicate: !!recent,
      },
    });

    await logAudit({
      userId,
      action: 'CREATE_FUEL_LOG',
      entity: 'FuelLog',
      entityId: String(log.id),
      newValue: { amount, liters },
    });

    return log;
  }

  static async review(id, adminId, { status, reviewNotes }) {
    const log = await prisma.fuelLog.findUnique({ where: { id: parseInt(id) } });
    if (!log) throw new NotFoundError('Fuel Log');

    const updated = await prisma.fuelLog.update({
      where: { id: parseInt(id) },
      data: {
        status,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewNotes,
      },
    });

    await logAudit({
      userId: adminId,
      action: 'REVIEW_FUEL_LOG',
      entity: 'FuelLog',
      entityId: String(id),
      newValue: { status },
    });

    return updated;
  }

  static async update(id, adminId, data) {
    const existing = await prisma.fuelLog.findUnique({ where: { id: parseInt(id) } });
    if (!existing) throw new NotFoundError('Fuel Log');

    const updateData = {};
    const allowedFields = ['amount', 'liters', 'odometerReading', 'fuelDate', 'status', 'receiptUrl', 'notes', 'isDuplicate', 'reviewNotes'];
    
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    });

    if (updateData.amount) updateData.amount = parseFloat(updateData.amount);
    if (updateData.liters) updateData.liters = parseFloat(updateData.liters);
    if (updateData.odometerReading) updateData.odometerReading = parseInt(updateData.odometerReading);
    if (updateData.fuelDate) updateData.fuelDate = new Date(updateData.fuelDate);

    const updated = await prisma.fuelLog.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    await logAudit({ userId: adminId, action: 'UPDATE_FUEL_LOG', entity: 'FuelLog', entityId: String(id), newValue: updateData });
    return updated;
  }

  static async delete(id, adminId) {
    const log = await prisma.fuelLog.findUnique({ where: { id: parseInt(id) } });
    if (!log) throw new NotFoundError('Fuel Log');

    await prisma.fuelLog.delete({ where: { id: parseInt(id) } });

    await logAudit({
      userId: adminId,
      action: 'DELETE_FUEL_LOG',
      entity: 'FuelLog',
      entityId: String(id),
    });

    return true;
  }

  static async getDailySummary(query, currentUser) {
    let where = {
      ...(query.vehicleId && { vehicleId: parseInt(query.vehicleId) }),
      ...(query.status && { status: query.status }),
      ...(query.userId && { userId: parseInt(query.userId) }),
    };
    where = mergeAppUserIdFilter(where, query.appUserId);

    if (query.dateFrom || query.dateTo) {
      where.fuelDate = {};
      if (query.dateFrom) where.fuelDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.fuelDate.lte = new Date(query.dateTo);
    }

    const appRole = currentUser?.appUser?.appRole;
    if (appRole === 'DRIVER') {
      where.userId = currentUser.id;
    } else if (appRole === 'SUPERVISOR') {
      where.user = { appUser: { supervisorId: currentUser.appUserId } };
    }

    const logs = await prisma.fuelLog.findMany({
      where,
      select: {
        amount: true,
        liters: true,
        fuelDate: true,
      },
    });

    const summaryMap = {};
    for (const log of logs) {
      const dateStr = new Date(log.fuelDate).toISOString().split('T')[0];
      if (!summaryMap[dateStr]) {
        summaryMap[dateStr] = {
          date: dateStr,
          totalAmount: 0,
          totalLiters: 0,
          count: 0,
        };
      }
      summaryMap[dateStr].totalAmount += parseFloat(log.amount || 0);
      summaryMap[dateStr].totalLiters += parseFloat(log.liters || 0);
      summaryMap[dateStr].count += 1;
    }

    const summaries = Object.values(summaryMap).sort((a, b) => b.date.localeCompare(a.date));

    if (query.date) {
      const targetDate = query.date.split('T')[0];
      return summaryMap[targetDate] || { date: targetDate, totalAmount: 0, totalLiters: 0, count: 0 };
    }

    return summaries;
  }
}

module.exports = FuelLogService;
