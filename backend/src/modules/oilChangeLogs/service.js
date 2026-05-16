const prisma = require('../../config/database');
const { NotFoundError, BusinessLogicError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');

class OilChangeLogService {
  static async list(query, currentUser) {
    const { page, limit, skip } = getPaginationParams(query);
    const where = {
      ...(query.vehicleId && { vehicleId: parseInt(query.vehicleId) }),
      ...((query.reportedById || query.userId) && { performedBy: parseInt(query.reportedById || query.userId) }),
    };

    if (currentUser.appRole === 'DRIVER') {
      where.performedBy = currentUser.id;
    } else if (currentUser.appRole === 'SUPERVISOR') {
      // Typically Supervisors can see oil logs for any vehicle driven by their drivers,
      // but a simpler scope is to just not restrict them, or restrict to vehicles they manage.
      // For now, no strict scope for supervisors as fleet manages vehicles.
    }

    const [items, total] = await Promise.all([
      prisma.oilChangeLog.findMany({
        where, skip, take: limit, orderBy: { changeDate: 'desc' },
        include: {
          vehicle: { select: { id: true, plateNumber: true } },
          performer: { select: { id: true, fullNameAr: true, identityNumber: true } },
        },
      }),
      prisma.oilChangeLog.count({ where }),
    ]);

    const transformedItems = items.map(item => ({
      ...item,
      appUser: item.performer ? { user: item.performer } : null,
    }));

    return { items: transformedItems, meta: buildPaginationMeta(total, page, limit) };
  }

  static async report(userId, data, file) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: data.vehicleId } });
    if (!vehicle) throw new NotFoundError('Vehicle');

    if (data.odometerAtChange > data.nextChangeOdometer) {
      throw new BusinessLogicError('Next change odometer must be greater than current odometer');
    }

    return prisma.$transaction(async (tx) => {
      const log = await tx.oilChangeLog.create({
        data: {
          vehicleId: data.vehicleId,
          changeDate: data.changeDate ? new Date(data.changeDate) : new Date(),
          odometerAtChange: data.odometerAtChange,
          nextDueOdometer: data.nextChangeOdometer,
          notes: data.notes,
          performedBy: userId,
        },
      });

      // Update vehicle's odometer reading just in case
      await tx.vehicle.update({
        where: { id: data.vehicleId },
        data: {
          odometerKm: Math.max(vehicle.odometerKm || 0, data.odometerAtChange),
        },
      });

      return log;
    });
  }
}

module.exports = OilChangeLogService;
