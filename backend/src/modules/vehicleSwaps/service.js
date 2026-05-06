const prisma = require('../../config/database');
const { NotFoundError, BusinessLogicError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');

class VehicleSwapService {
  static async list(query, currentUser) {
    const { page, limit, skip } = getPaginationParams(query);
    const where = {
      ...(query.status && { status: query.status }),
      ...(query.shiftId && { shiftId: parseInt(query.shiftId) }),
    };

    if (currentUser.role === 'DRIVER') {
      where.shift = { userId: currentUser.id };
    } else if (currentUser.role === 'SUPERVISOR') {
      where.shift = { user: { supervisorId: currentUser.id } };
    }

    const [items, total] = await Promise.all([
      prisma.vehicleSwapRequest.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          shift: { select: { id: true, userId: true, user: { select: { fullNameAr: true } } } },
          currentVehicle: { select: { id: true, plateNumber: true } },
          requestedVehicle: { select: { id: true, plateNumber: true } },
        },
      }),
      prisma.vehicleSwapRequest.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(total, page, limit) };
  }

  static async create(userId, data) {
    const shift = await prisma.shift.findUnique({ where: { id: data.shiftId } });
    if (!shift || shift.userId !== userId) throw new NotFoundError('Shift');
    if (shift.status !== 'ACTIVE') throw new BusinessLogicError('Shift must be active to request a swap');

    const activeSwap = await prisma.vehicleSwapRequest.findFirst({
      where: { shiftId: data.shiftId, status: 'PENDING' },
    });
    if (activeSwap) throw new BusinessLogicError('You already have a pending swap request');

    return prisma.vehicleSwapRequest.create({
      data: {
        shiftId: data.shiftId,
        currentVehicleId: data.currentVehicleId,
        requestedVehicleId: data.requestedVehicleId,
        reason: data.reason,
      },
    });
  }

  static async review(id, adminId, data) {
    const swapReq = await prisma.vehicleSwapRequest.findUnique({
      where: { id: parseInt(id) },
      include: { shift: true },
    });
    if (!swapReq) throw new NotFoundError('VehicleSwapRequest');
    if (swapReq.status !== 'PENDING') throw new BusinessLogicError('Can only review PENDING requests');

    const assignedVehicleId = data.assignedVehicleId || swapReq.requestedVehicleId;

    if (data.status === 'APPROVED' && !assignedVehicleId) {
      throw new BusinessLogicError('Must specify an assignedVehicleId to approve the swap');
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.vehicleSwapRequest.update({
        where: { id: parseInt(id) },
        data: {
          status: data.status,
          assignedVehicleId: data.status === 'APPROVED' ? assignedVehicleId : null,
          approvedBy: data.status === 'APPROVED' ? adminId : null,
          notes: data.notes,
        },
      });

      // If approved, update the shift to use the new vehicle
      if (data.status === 'APPROVED') {
        await tx.shift.update({
          where: { id: swapReq.shiftId },
          data: { vehicleId: assignedVehicleId },
        });

        // Log this change in the shift history
        await tx.shiftLog.create({
          data: {
            shiftId: swapReq.shiftId,
            action: 'VEHICLE_SWAPPED',
            performedBy: adminId,
            notes: `Swapped from vehicle ${swapReq.currentVehicleId} to ${assignedVehicleId}`,
          },
        });
      }

      return updated;
    });
  }
}

module.exports = VehicleSwapService;
