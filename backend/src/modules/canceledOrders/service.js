const prisma = require('../../config/database');
const { NotFoundError, BusinessLogicError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');

class CanceledOrderService {
  static async list(query, currentUser) {
    const { page, limit, skip } = getPaginationParams(query);
    const where = {
      ...(query.shiftId && { shiftId: parseInt(query.shiftId) }),
      ...(query.platformName && { platformName: query.platformName }),
      ...(query.userId && { userId: parseInt(query.userId) }),
    };

    if (currentUser.appRole === 'DRIVER') {
      where.userId = currentUser.id;
    } else if (currentUser.appRole === 'SUPERVISOR') {
      where.user = { appUser: { supervisorId: currentUser.appUserId } };
    }

    const [items, total] = await Promise.all([
      prisma.canceledOrderLog.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullNameAr: true, identityNumber: true } },
          shift: { select: { id: true, status: true } },
          platformAccount: { select: { id: true, username: true } },
        },
      }),
      prisma.canceledOrderLog.count({ where }),
    ]);

    const transformedItems = items.map(item => ({
      ...item,
      appUser: item.user ? { user: item.user } : null,
    }));

    return { items: transformedItems, meta: buildPaginationMeta(total, page, limit) };
  }

  static async report(userId, data, file) {
    const shift = await prisma.shift.findUnique({ where: { id: parseInt(data.shiftId) } });
    if (!shift || shift.userId !== userId) throw new NotFoundError('Shift');
    if (shift.status !== 'ACTIVE') throw new BusinessLogicError('Shift must be active to report an order');

    const platformAccount = await prisma.platformAccount.findUnique({ where: { id: parseInt(data.platformAccountId) } });
    if (!platformAccount || platformAccount.userId !== userId) throw new NotFoundError('PlatformAccount');

    return prisma.canceledOrderLog.create({
      data: {
        userId,
        shiftId: shift.id,
        platformAccountId: platformAccount.id,
        orderRef: data.orderId,
        reason: data.reason,
        discountAmount: data.amountLoss,
        photoUrl: file ? normalizeStoredUploadPath(file.path) : undefined,
        platformName: data.platformName || platformAccount.username,
        createdAt: new Date(),
      },
    });
  }
}

module.exports = CanceledOrderService;
