const prisma = require('../../config/database');
const { NotFoundError, BusinessLogicError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta, buildOrderBy, buildSearchFilter } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');

class VehicleService {
  static async list(query) {
    const { page, limit, skip } = getPaginationParams(query);
    const orderBy = buildOrderBy(query, ['createdAt', 'plateNumber', 'manufacturer']);
    const searchFilter = buildSearchFilter(query, ['plateNumber', 'manufacturer', 'model']);

    const where = {
      deletedAt: null,
      ...searchFilter,
      ...(query.status && { status: query.status }),
      ...(query.ownershipStatus && { ownershipStatus: query.ownershipStatus }),
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
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: parseInt(id), deletedAt: null },
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

  static async update(id, data, adminUser) {
    const vehicle = await prisma.vehicle.findFirst({ where: { id: parseInt(id), deletedAt: null } });
    if (!vehicle) throw new NotFoundError('Vehicle');

    const updated = await prisma.vehicle.update({ where: { id: parseInt(id) }, data });

    await logAudit({ userId: adminUser.id, action: 'UPDATE_VEHICLE', entity: 'Vehicle', entityId: String(id) });
    return updated;
  }

  static async assignDriver(vehicleId, userId, notes, adminUser) {
    const vehicle = await prisma.vehicle.findFirst({ where: { id: parseInt(vehicleId), deletedAt: null } });
    if (!vehicle) throw new NotFoundError('Vehicle');

    const user = await prisma.user.findFirst({ where: { id: parseInt(userId), deletedAt: null } });
    if (!user) throw new NotFoundError('Driver');

    // Release existing assignment
    await prisma.vehicleAssignment.updateMany({
      where: { vehicleId: parseInt(vehicleId), isActive: true },
      data: { isActive: false, releasedAt: new Date() },
    });

    const assignment = await prisma.vehicleAssignment.create({
      data: { vehicleId: parseInt(vehicleId), userId: parseInt(userId), notes },
    });

    await logAudit({
      userId: adminUser.id, action: 'ASSIGN_VEHICLE', entity: 'VehicleAssignment',
      entityId: String(assignment.id), newValue: { vehicleId, userId },
    });

    return assignment;
  }

  static async releaseDriver(vehicleId, adminUser) {
    await prisma.vehicleAssignment.updateMany({
      where: { vehicleId: parseInt(vehicleId), isActive: true },
      data: { isActive: false, releasedAt: new Date() },
    });

    await logAudit({
      userId: adminUser.id, action: 'RELEASE_VEHICLE', entity: 'Vehicle', entityId: String(vehicleId),
    });
  }

  static async softDelete(id, adminUser) {
    const vehicle = await prisma.vehicle.findFirst({ where: { id: parseInt(id), deletedAt: null } });
    if (!vehicle) throw new NotFoundError('Vehicle');

    await prisma.vehicle.update({ where: { id: parseInt(id) }, data: { deletedAt: new Date(), status: 'DECOMMISSIONED' } });
    await logAudit({ userId: adminUser.id, action: 'DELETE_VEHICLE', entity: 'Vehicle', entityId: String(id) });
  }
}

module.exports = VehicleService;
