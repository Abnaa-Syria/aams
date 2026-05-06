const prisma = require('../../config/database');
const { NotFoundError, BusinessLogicError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');

class SubstituteVehicleService {
  static async list(query) {
    const { page, limit, skip } = getPaginationParams(query);
    const where = {
      ...(query.userId && { userId: parseInt(query.userId) }),
      ...(query.vehicleId && { vehicleId: parseInt(query.vehicleId) }),
      ...(query.status === 'ACTIVE' && { returnedAt: null }),
      ...(query.status === 'RETURNED' && { returnedAt: { not: null } }),
    };

    const [items, total] = await Promise.all([
      prisma.substituteVehicleAssignment.findMany({
        where, skip, take: limit, orderBy: { assignedAt: 'desc' },
        include: {
          user: { select: { id: true, fullNameAr: true } },
          vehicle: { select: { id: true, plateNumber: true } },
          assignedByAdmin: { select: { id: true, fullNameAr: true } },
          returnedByAdmin: { select: { id: true, fullNameAr: true } },
        },
      }),
      prisma.substituteVehicleAssignment.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(total, page, limit) };
  }

  static async assign(data, adminId) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: data.vehicleId } });
    if (!vehicle || vehicle.status !== 'ACTIVE') throw new BusinessLogicError('Vehicle is not active');

    // Check if user already has an active substitute vehicle
    const activeAssign = await prisma.substituteVehicleAssignment.findFirst({
      where: { userId: data.userId, returnedAt: null },
    });
    if (activeAssign) throw new BusinessLogicError('User already has an active substitute vehicle');

    return prisma.substituteVehicleAssignment.create({
      data: {
        userId: data.userId,
        vehicleId: data.vehicleId,
        assignedBy: adminId,
        reason: data.reason,
        notes: data.notes,
      },
    });
  }

  static async returnVehicle(id, adminId, data) {
    const assign = await prisma.substituteVehicleAssignment.findUnique({ where: { id: parseInt(id) } });
    if (!assign) throw new NotFoundError('SubstituteVehicleAssignment');
    if (assign.returnedAt) throw new BusinessLogicError('Already returned');

    return prisma.substituteVehicleAssignment.update({
      where: { id: parseInt(id) },
      data: {
        returnedAt: new Date(),
        returnedBy: adminId,
        notes: data.notes ? `${assign.notes || ''}\nReturn notes: ${data.notes}` : assign.notes,
      },
    });
  }
}

module.exports = SubstituteVehicleService;
