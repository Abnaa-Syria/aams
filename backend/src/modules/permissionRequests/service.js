const prisma = require('../../config/database');
const { NotFoundError, BusinessLogicError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { applyUserOwnedListScope, mergeDriverNameIntoUserWhere } = require('../../utils/listScope');
const { mergeAppUserIdFilter } = require('../../utils/driverIdentity');
const {
  assertCanAccessOwnOrDriverRecord,
  assertSupervisorCanInitialReview,
  isSupervisor,
} = require('../../utils/recordAccess');
const { dispatchNotification } = require('../../services/notificationDispatcher');

class PermissionRequestService {
  static async list(query, currentUser, req) {
    const { page, limit, skip } = getPaginationParams(query);
    let where = {
      ...(query.status && { status: query.status }),
      ...(query.userId && { userId: parseInt(query.userId) }),
    };

    if (query.from || query.to || query.date || query.dateFrom || query.dateTo) {
      const from = query.dateFrom || query.from;
      const to = query.dateTo || query.to;
      if (query.date) {
        const day = new Date(query.date);
        const next = new Date(day);
        next.setDate(next.getDate() + 1);
        where.permissionDate = { gte: day, lt: next };
      } else if (from || to) {
        where.permissionDate = {};
        if (from) where.permissionDate.gte = new Date(from);
        if (to) where.permissionDate.lte = new Date(to);
      }
    }

    where = applyUserOwnedListScope(where, req);
    where = mergeAppUserIdFilter(where, query.appUserId);
    where = mergeDriverNameIntoUserWhere(where, query);

    const [items, total] = await Promise.all([
      prisma.permissionRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { permissionDate: 'desc' },
        include: {
          user: { select: { id: true, fullNameAr: true, identityNumber: true } },
        },
      }),
      prisma.permissionRequest.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        appUser: item.user ? { user: item.user } : null,
      })),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  static async getById(id, currentUser) {
    const item = await prisma.permissionRequest.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: { select: { id: true, fullNameAr: true, fullNameEn: true, identityNumber: true } },
      },
    });
    if (!item) throw new NotFoundError('Permission Request');
    await assertCanAccessOwnOrDriverRecord({ user: currentUser }, item.userId);
    return item;
  }

  static async create(userId, data, appUserId = null) {
    if (!data.permissionDate) throw new BusinessLogicError('permissionDate is required');
    if (!data.reason?.trim()) throw new BusinessLogicError('reason is required');

    return prisma.permissionRequest.create({
      data: {
        userId,
        appUserId,
        permissionDate: new Date(data.permissionDate),
        startTime: data.startTime || null,
        endTime: data.endTime || null,
        reason: data.reason.trim(),
        status: 'PENDING',
      },
    });
  }

  static async review(id, reviewer, { status, reviewNotes }) {
    const item = await prisma.permissionRequest.findUnique({ where: { id: parseInt(id) } });
    if (!item) throw new NotFoundError('Permission Request');
    if (item.status !== 'PENDING') throw new BusinessLogicError('Can only review pending requests');

    if (isSupervisor(reviewer)) {
      await assertSupervisorCanInitialReview(reviewer, item.userId);
    }

    const updated = await prisma.permissionRequest.update({
      where: { id: parseInt(id) },
      data: {
        status,
        reviewedBy: reviewer.id,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null,
      },
    });

    await logAudit({
      userId: reviewer.id,
      action: 'REVIEW_PERMISSION_REQUEST',
      entity: 'PermissionRequest',
      entityId: String(id),
      newValue: { status },
    });
    await dispatchNotification({
      userId: item.userId,
      title: status === 'APPROVED' ? 'تمت الموافقة على الاستئذان' : 'تم رفض طلب الاستئذان',
      body: reviewNotes || '',
      category: 'HR',
      metadata: { permissionRequestId: parseInt(id), status },
    });
    return updated;
  }

  static async cancel(id, userId) {
    const item = await prisma.permissionRequest.findUnique({ where: { id: parseInt(id) } });
    if (!item) throw new NotFoundError('Permission Request');
    if (item.userId !== userId) throw new BusinessLogicError('Not your request');
    if (item.status !== 'PENDING') throw new BusinessLogicError('Can only cancel pending requests');

    return prisma.permissionRequest.update({
      where: { id: parseInt(id) },
      data: { status: 'CANCELLED' },
    });
  }
}

module.exports = PermissionRequestService;
