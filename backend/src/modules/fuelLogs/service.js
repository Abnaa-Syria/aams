const prisma = require('../../config/database');
const { NotFoundError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');
const { mergeDriverNameIntoUserWhere } = require('../../utils/listScope');

class FuelLogService {
  static async list(query, currentUser) {
    const { page, limit, skip } = getPaginationParams(query);
    
    let where = {
      ...(query.vehicleId && { vehicleId: parseInt(query.vehicleId) }),
      ...(query.status && { status: query.status }),
      ...(query.shiftId && { shiftId: parseInt(query.shiftId) }),
      ...(query.userId && { appUser: { user: { id: parseInt(query.userId) } } }),
    };

    if (query.dateFrom || query.dateTo) {
      where.fuelDate = {};
      if (query.dateFrom) where.fuelDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.fuelDate.lte = new Date(query.dateTo);
    }

    // Scoping using appUserId and appRole
    if (currentUser.appRole === 'DRIVER') {
      where.appUserId = currentUser.appUserId;
    } else if (currentUser.appRole === 'SUPERVISOR') {
      where.appUser = { supervisorId: currentUser.appUserId };
    }

    const [items, total] = await Promise.all([
      prisma.fuelLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fuelDate: 'desc' },
        include: {
          appUser: { select: { id: true, user: { select: { id: true, fullNameAr: true, identityNumber: true } } } },
          vehicle: { select: { id: true, plateNumber: true, manufacturer: true, model: true, tankCapacity: true } },
          shift: { select: { id: true, startedAt: true } },
        },
      }),
      prisma.fuelLog.count({ where }),
    ]);

    // Transform to keep same response format
    const transformedItems = items.map(item => ({
      ...item,
      userId: item.appUser?.user?.id || item.userId,
      user: item.appUser?.user || item.user,
    }));

    return { items: transformedItems, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getById(id) {
    const item = await prisma.fuelLog.findUnique({
      where: { id: parseInt(id) },
      include: {
        appUser: { select: { id: true, user: { select: { id: true, fullNameAr: true, fullNameEn: true } } } },
        vehicle: true,
        shift: true,
      },
    });
    
    // Transform to keep same response format
    if (item) {
      return {
        ...item,
        userId: item.appUser?.user?.id || item.userId,
        user: item.appUser?.user || item.user,
      };
    }

    if (!item) throw new NotFoundError('Fuel Log');

    return item;
  }

  static async create(userId, data, file = null) {
    const vehicleId = parseInt(data.vehicleId);
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundError('Vehicle');

    // Get user with appUser
    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      include: { appUser: true }
    });
    if (!user) throw new NotFoundError('User');

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
        shiftId: data.shiftId ? parseInt(data.shiftId) : undefined,
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
}

module.exports = FuelLogService;
