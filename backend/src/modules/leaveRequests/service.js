const prisma = require('../../config/database');
const { NotFoundError, BusinessLogicError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { ADMIN_ROLES, mergeDriverNameIntoUserWhere } = require('../../utils/listScope');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');
const { mergeAppUserIdFilter } = require('../../utils/driverIdentity');
const {
  assertCanAccessOwnOrDriverRecord,
  assertSupervisorCanInitialReview,
  assertSupervisorCannotFinalReviewOwn,
  buildSupervisorTeamOrSelfFilter,
  isSupervisor,
} = require('../../utils/recordAccess');
const { dispatchNotification } = require('../../services/notificationDispatcher');

class LeaveRequestService {
  static async list(query, currentUser) {
    const { page, limit, skip } = getPaginationParams(query);
    let where = {
      ...(query.status && { status: query.status }),
      ...(query.leaveType && { leaveType: query.leaveType }),
      ...(query.userId && { userId: parseInt(query.userId) }),
    };

    if (query.from || query.to || query.date || query.dateFrom || query.dateTo) {
      const from = query.dateFrom || query.from;
      const to = query.dateTo || query.to;
      if (query.date) {
        const day = new Date(query.date);
        const next = new Date(day);
        next.setDate(next.getDate() + 1);
        where.AND = [
          { startDate: { lt: next } },
          { endDate: { gte: day } },
        ];
      } else if (from || to) {
        const dateFilter = {};
        if (from) dateFilter.gte = new Date(from);
        if (to) dateFilter.lte = new Date(to);
        if (Object.keys(dateFilter).length) where.startDate = dateFilter;
      }
    }

    if (currentUser.appRole === 'DRIVER') {
      where.userId = currentUser.id;
    } else if (currentUser.appRole === 'SUPERVISOR') {
      // Supervisors see all drivers (#16)
      if (!where.userId) {
        where.user = { appUser: { appRole: 'DRIVER' } };
      }
    } else if (!ADMIN_ROLES.has(currentUser.role)) {
      where.userId = -1;
    }
    where = mergeAppUserIdFilter(where, query.appUserId);
    where = mergeDriverNameIntoUserWhere(where, query);

    const [items, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, fullNameAr: true, identityNumber: true } } },
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    const transformedItems = items.map(item => ({
      ...item,
      user: item.user,
      appUser: item.user ? { user: item.user } : null,
    }));

    return { items: transformedItems, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getById(id, currentUser) {
    const item = await prisma.leaveRequest.findUnique({
      where: { id: parseInt(id) },
      include: { user: { select: { id: true, fullNameAr: true, fullNameEn: true } } },
    });

    if (!item) throw new NotFoundError('Leave Request');

    if (currentUser.appRole === 'DRIVER' && item.userId !== currentUser.id) {
      throw new NotFoundError('Leave Request');
    }
    if (currentUser.appRole === 'SUPERVISOR') {
      await assertCanAccessOwnOrDriverRecord(currentUser, item.userId);
    }

    return item;
  }

  static async getBalances(userId) {
    const uid = parseInt(userId, 10);
    const balances = await prisma.leaveBalance.findMany({
      where: { userId: uid, year: new Date().getFullYear() },
    });
    return balances;
  }

  static async create(userId, data, file = null, adminId) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    const insertData = {
      userId: parseInt(userId),
      leaveType: data.leaveType || data.type,
      startDate,
      endDate,
      totalDays,
      reason: data.reason,
    };

    if (file) insertData.attachmentUrl = normalizeStoredUploadPath(file.path);

    const item = await prisma.leaveRequest.create({ data: insertData });

    if (adminId) {
      await logAudit({ userId: adminId, action: 'CREATE_LEAVE_REQUEST', entity: 'LeaveRequest', entityId: String(item.id) });
    }

    return item;
  }

  static async update(id, adminId, data) {
    const existing = await prisma.leaveRequest.findUnique({ where: { id: parseInt(id) } });
    if (!existing) throw new NotFoundError('Leave Request');

    const updateData = {};
    if (data.leaveType !== undefined || data.type !== undefined) {
      updateData.leaveType = data.leaveType !== undefined ? data.leaveType : data.type;
    }
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
    if (data.reason !== undefined) updateData.reason = data.reason;
    if (data.status !== undefined) updateData.status = data.status;

    if (updateData.startDate || updateData.endDate) {
      const s = updateData.startDate || existing.startDate;
      const e = updateData.endDate || existing.endDate;
      updateData.totalDays = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
    }

    const updated = await prisma.leaveRequest.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    await logAudit({ userId: adminId, action: 'UPDATE_LEAVE_REQUEST', entity: 'LeaveRequest', entityId: String(id), newValue: updateData });
    return updated;
  }

  static async supervisorReview(id, currentUser, data) {
    const leaveReq = await prisma.leaveRequest.findUnique({ where: { id: parseInt(id) } });
    if (!leaveReq) throw new NotFoundError('Leave Request');
    if (leaveReq.status !== 'PENDING') {
      throw new BusinessLogicError('يمكن مراجعة الطلبات المعلقة فقط');
    }

    await assertSupervisorCanInitialReview(currentUser, leaveReq.userId);

    const approved = data.approved === true || data.status === 'APPROVED';
    const updated = await prisma.leaveRequest.update({
      where: { id: parseInt(id) },
      data: {
        supervisorReviewedBy: currentUser.id,
        supervisorReviewedAt: new Date(),
        supervisorReviewNotes: data.reviewNotes || data.supervisorReviewNotes || null,
        supervisorApproved: approved,
        ...(approved === false && data.status === 'REJECTED' ? { status: 'REJECTED' } : {}),
      },
    });

    await logAudit({
      userId: currentUser.id,
      action: 'SUPERVISOR_REVIEW_LEAVE',
      entity: 'LeaveRequest',
      entityId: String(id),
      newValue: { supervisorApproved: approved },
    });
    return updated;
  }

  static async review(id, adminId, data, currentUser = null) {
    const leaveReq = await prisma.leaveRequest.findUnique({ where: { id: parseInt(id) } });
    if (!leaveReq) throw new NotFoundError('Leave Request');

    if (currentUser && isSupervisor(currentUser)) {
      throw new BusinessLogicError('استخدم مراجعة المشرف المبدئية لهذا الطلب');
    }
    if (currentUser) {
      assertSupervisorCannotFinalReviewOwn(currentUser, leaveReq.userId);
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.leaveRequest.update({
        where: { id: parseInt(id) },
        data: {
          status: data.status,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          reviewNotes: data.reviewNotes,
        },
      });

      if (data.status === 'APPROVED') {
        const year = new Date().getFullYear();
        await tx.leaveBalance.upsert({
          where: { userId_leaveType_year: { userId: leaveReq.userId, leaveType: leaveReq.leaveType, year } },
          create: { userId: leaveReq.userId, leaveType: leaveReq.leaveType, year, totalDays: 30, usedDays: leaveReq.totalDays, remainingDays: 30 - leaveReq.totalDays },
          update: { usedDays: { increment: leaveReq.totalDays }, remainingDays: { decrement: leaveReq.totalDays } },
        });
        await tx.user.update({ where: { id: leaveReq.userId }, data: { availabilityStatus: 'ON_LEAVE' } });
        await tx.appUser.updateMany({ where: { userId: leaveReq.userId }, data: { availabilityStatus: 'ON_LEAVE' } });
      }

      return updated;
    });

    await logAudit({ userId: adminId, action: 'REVIEW_LEAVE_REQUEST', entity: 'LeaveRequest', entityId: String(id), newValue: { status: data.status } });
    await dispatchNotification({
      userId: leaveReq.userId,
      title: data.status === 'APPROVED' ? 'تمت الموافقة على الإجازة' : 'تم رفض طلب الإجازة',
      body: data.reviewNotes || '',
      category: 'HR',
      metadata: { leaveRequestId: parseInt(id), status: data.status },
    });
    return result;
  }

  static async cancel(id, userId) {
    const existing = await prisma.leaveRequest.findUnique({ where: { id: parseInt(id) } });
    if (!existing) throw new NotFoundError('Leave Request');
    if (existing.userId !== userId) throw new Error('Unauthorized');

    const updated = await prisma.leaveRequest.update({
      where: { id: parseInt(id) },
      data: { status: 'CANCELLED' },
    });

    return updated;
  }
}

module.exports = LeaveRequestService;
