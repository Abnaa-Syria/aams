const prisma = require('../../config/database');
const { NotFoundError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');

class FuelLogService {
  static async list(query, currentUser) {
    const { page, limit, skip } = getPaginationParams(query);
    
    let where = {
      ...(query.vehicleId && { vehicleId: parseInt(query.vehicleId) }),
      ...(query.status && { status: query.status }),
      ...(query.shiftId && { shiftId: parseInt(query.shiftId) }),
      ...(query.userId && { userId: parseInt(query.userId) }),
    };

    if (query.dateFrom || query.dateTo) {
      where.fuelDate = {};
      if (query.dateFrom) where.fuelDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.fuelDate.lte = new Date(query.dateTo);
    }

    // Scoping
    if (currentUser.role === 'DRIVER') {
      where.userId = currentUser.id;
    } else if (currentUser.role === 'SUPERVISOR') {
      where.user = { supervisorId: currentUser.id };
    }

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

    return { items, meta: buildPaginationMeta(total, page, limit) };
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

    return item;
  }

  static async create(userId, data, file = null) {
    const vehicleId = parseInt(data.vehicleId);
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundError('Vehicle');

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
      newValue: { amount, liters, paymentMethod },
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
