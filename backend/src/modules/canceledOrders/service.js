const prisma = require('../../config/database');
const { NotFoundError, BusinessLogicError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');

class CanceledOrderService {
  static async list(query, currentUser) {
    const { page, limit, skip } = getPaginationParams(query);
    const where = {
      ...(query.shiftId && { shiftId: parseInt(query.shiftId) }),
      ...(query.platformAccountId && { platformAccountId: parseInt(query.platformAccountId) }),
    };

    if (currentUser.role === 'DRIVER') {
      where.userId = currentUser.id;
    } else if (currentUser.role === 'SUPERVISOR') {
      where.user = { supervisorId: currentUser.id };
    }

    const [items, total] = await Promise.all([
      prisma.canceledOrderLog.findMany({
        where, skip, take: limit, orderBy: { reportedAt: 'desc' },
        include: {
          user: { select: { id: true, fullNameAr: true } },
          platformAccount: { include: { platform: { select: { nameAr: true } } } },
        },
      }),
      prisma.canceledOrderLog.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(total, page, limit) };
  }

  static async report(userId, data, file) {
    const shift = await prisma.shift.findUnique({ where: { id: data.shiftId } });
    if (!shift || shift.userId !== userId) throw new NotFoundError('Shift');
    if (shift.status !== 'ACTIVE') throw new BusinessLogicError('Shift must be active to report an order');

    const platformAccount = await prisma.platformAccount.findUnique({ where: { id: data.platformAccountId } });
    if (!platformAccount || platformAccount.userId !== userId) throw new NotFoundError('PlatformAccount');

    return prisma.canceledOrderLog.create({
      data: {
        userId,
        shiftId: data.shiftId,
        platformAccountId: data.platformAccountId,
        orderId: data.orderId,
        reason: data.reason,
        amountLoss: data.amountLoss,
        photoUrl: file ? normalizeStoredUploadPath(file.path) : undefined,
      },
    });
  }
}

module.exports = CanceledOrderService;
