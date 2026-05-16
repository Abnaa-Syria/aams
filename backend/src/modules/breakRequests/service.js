const prisma = require('../../config/database');
const { NotFoundError, BusinessLogicError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');

class BreakRequestService {
  static async list(query, currentUser) {
    const { page, limit, skip } = getPaginationParams(query);
    const where = {
      ...(query.status && { status: query.status }),
      ...(query.shiftId && { shiftId: parseInt(query.shiftId) }),
    };

    if (currentUser.appRole === 'DRIVER') {
      where.shift = { userId: currentUser.id };
    } else if (currentUser.appRole === 'SUPERVISOR') {
      where.shift = { user: { appUser: { supervisorId: currentUser.appUserId } } };
    }

    const [items, total] = await Promise.all([
      prisma.breakRequest.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { shift: { select: { id: true, userId: true, user: { select: { id: true, fullNameAr: true, identityNumber: true } } } } },
      }),
      prisma.breakRequest.count({ where }),
    ]);

    const transformedItems = items.map(item => ({
      ...item,
      appUser: item.shift?.user ? { user: item.shift.user } : null,
    }));

    return { items: transformedItems, meta: buildPaginationMeta(total, page, limit) };
  }

  static async create(userId, data) {
    const shift = await prisma.shift.findUnique({ where: { id: data.shiftId } });
    if (!shift || shift.userId !== userId) throw new NotFoundError('Shift');
    if (shift.status !== 'ACTIVE') throw new BusinessLogicError('Shift must be active to request a break');

    const activeBreak = await prisma.breakRequest.findFirst({
      where: { shiftId: data.shiftId, status: { in: ['PENDING', 'APPROVED', 'ACTIVE'] } },
    });
    if (activeBreak) throw new BusinessLogicError('You already have an active or pending break request');

    return prisma.breakRequest.create({
      data: {
        shiftId: data.shiftId,
        requestedDurationMinutes: data.requestedDurationMinutes,
        reason: data.reason,
      },
    });
  }

  static async review(id, adminId, data) {
    const breakReq = await prisma.breakRequest.findUnique({ where: { id: parseInt(id) } });
    if (!breakReq) throw new NotFoundError('BreakRequest');
    if (breakReq.status !== 'PENDING') throw new BusinessLogicError('Can only review PENDING requests');

    return prisma.breakRequest.update({
      where: { id: parseInt(id) },
      data: {
        status: data.status,
        approvedBy: data.status === 'APPROVED' ? adminId : null,
      },
    });
  }

  static async startBreak(id, userId) {
    const breakReq = await prisma.breakRequest.findUnique({
      where: { id: parseInt(id) },
      include: { shift: true },
    });
    if (!breakReq || breakReq.shift.userId !== userId) throw new NotFoundError('BreakRequest');
    if (breakReq.status !== 'APPROVED') throw new BusinessLogicError('Break request must be approved to start');

    return prisma.breakRequest.update({
      where: { id: parseInt(id) },
      data: {
        status: 'ACTIVE',
        startedAt: new Date(),
      },
    });
  }

  static async endBreak(id, userId) {
    const breakReq = await prisma.breakRequest.findUnique({
      where: { id: parseInt(id) },
      include: { shift: true },
    });
    if (!breakReq || breakReq.shift.userId !== userId) throw new NotFoundError('BreakRequest');
    if (breakReq.status !== 'ACTIVE') throw new BusinessLogicError('Break request is not active');

    return prisma.breakRequest.update({
      where: { id: parseInt(id) },
      data: {
        status: 'COMPLETED',
        endedAt: new Date(),
      },
    });
  }
}

module.exports = BreakRequestService;
