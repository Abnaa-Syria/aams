const prisma = require('../../config/database');
const { NotFoundError, BusinessLogicError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');

class SubstituteVehicleService {
  static async list(query, currentUser) {
    const { page, limit, skip } = getPaginationParams(query);
    const where = {
      ...(query.userId && { userId: parseInt(query.userId) }),
      ...(query.vehicleId && { vehicleId: parseInt(query.vehicleId) }),
      ...(query.status === 'ACTIVE' && { isActive: true }),
      ...(query.status === 'RETURNED' && { isActive: false }),
    };
    
    if (currentUser?.appRole === 'DRIVER') {
      where.userId = currentUser.id;
    } else if (currentUser?.appRole === 'SUPERVISOR') {
      where.user = { appUser: { supervisorId: currentUser.appUserId } };
    }

    const [items, total] = await Promise.all([
      prisma.substituteVehicleAssignment.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          vehicle: { select: { id: true, plateNumber: true } },
          user: { select: { id: true, fullNameAr: true, identityNumber: true } },
          assigner: { select: { id: true, fullNameAr: true } },
        },
      }),
      prisma.substituteVehicleAssignment.count({ where }),
    ]);

    const transformedItems = items.map(item => ({
      ...item,
      appUser: item.user ? { user: item.user } : null,
    }));

    return { items: transformedItems, meta: buildPaginationMeta(total, page, limit) };
  }

  static async assign(data, adminId) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: data.vehicleId } });
    if (!vehicle || vehicle.status !== 'ACTIVE') throw new BusinessLogicError('Vehicle is not active');

    // Check if user already has an active substitute vehicle
    const activeAssign = await prisma.substituteVehicleAssignment.findFirst({
      where: { userId: data.userId, isActive: true },
    });
    if (activeAssign) throw new BusinessLogicError('User already has an active substitute vehicle');

    return prisma.substituteVehicleAssignment.create({
      data: {
        userId: data.userId,
        vehicleId: data.vehicleId,
        assignedBy: adminId,
        reason: data.reason,
        startDate: new Date(),
        isActive: true,
      },
    });
  }

  static async returnVehicle(id, adminId, data) {
    const assign = await prisma.substituteVehicleAssignment.findUnique({ where: { id: parseInt(id) } });
    if (!assign) throw new NotFoundError('SubstituteVehicleAssignment');
    if (!assign.isActive) throw new BusinessLogicError('Already returned');

    return prisma.substituteVehicleAssignment.update({
      where: { id: parseInt(id) },
      data: {
        endDate: new Date(),
        isActive: false,
      },
    });
  }
}

module.exports = SubstituteVehicleService;
