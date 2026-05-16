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

    if (currentUser.appRole === 'DRIVER') {
      where.userId = currentUser.id;
    } else if (currentUser.appRole === 'SUPERVISOR') {
      where.user = { appUser: { supervisorId: currentUser.appUserId } };
    }

    const [items, total] = await Promise.all([
      prisma.vehicleSwapRequest.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          shift: { select: { id: true, userId: true, user: { select: { fullNameAr: true } } } },
          currentVehicle: { select: { id: true, plateNumber: true } },
          newVehicle: { select: { id: true, plateNumber: true } },
          user: { select: { id: true, fullNameAr: true, identityNumber: true } },
        },
      }),
      prisma.vehicleSwapRequest.count({ where }),
    ]);

    const transformedItems = items.map(item => ({
      ...item,
      appUser: item.user ? { user: item.user } : null,
    }));

    return { items: transformedItems, meta: buildPaginationMeta(total, page, limit) };
  }

  static async create(userId, data) {
    const shift = await prisma.shift.findUnique({ where: { id: data.shiftId } });
    if (!shift || shift.userId !== userId) throw new NotFoundError('Shift');
    if (shift.status !== 'ACTIVE') throw new BusinessLogicError('Shift must be active to request a swap');

    const activeSwap = await prisma.vehicleSwapRequest.findFirst({
      where: { shiftId: data.shiftId, status: 'REQUESTED' },
    });
    if (activeSwap) throw new BusinessLogicError('You already have a pending swap request');

    return prisma.vehicleSwapRequest.create({
      data: {
        userId,
        shiftId: data.shiftId,
        currentVehicleId: data.currentVehicleId,
        newVehicleId: data.requestedVehicleId ? parseInt(data.requestedVehicleId) : null,
        reason: data.reason,
        status: 'REQUESTED',
      },
    });
  }

  static async review(id, adminId, data) {
    const swapReq = await prisma.vehicleSwapRequest.findUnique({
      where: { id: parseInt(id) },
      include: { shift: true },
    });
    if (!swapReq) throw new NotFoundError('VehicleSwapRequest');
    if (swapReq.status !== 'REQUESTED') throw new BusinessLogicError('Can only review REQUESTED requests');

    const assignedVehicleId = data.assignedVehicleId || swapReq.newVehicleId;

    if (data.status === 'APPROVED' && !assignedVehicleId) {
      throw new BusinessLogicError('Must specify an assignedVehicleId to approve the swap');
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.vehicleSwapRequest.update({
        where: { id: parseInt(id) },
        data: {
          status: data.status,
          newVehicleId: data.status === 'APPROVED' ? assignedVehicleId : swapReq.newVehicleId,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          reviewNotes: data.notes,
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
