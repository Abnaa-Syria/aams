const prisma = require('../../config/database');
const { NotFoundError, BusinessLogicError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { ADMIN_ROLES, mergeDriverNameIntoUserWhere } = require('../../utils/listScope');
const { mergeAppUserIdFilter } = require('../../utils/driverIdentity');
const {
  assertCanAccessOwnOrDriverRecord,
  assertSupervisorCanInitialReview,
  assertSupervisorCannotFinalReviewOwn,
  buildSupervisorTeamOrSelfFilter,
  isSupervisor,
} = require('../../utils/recordAccess');

class SalaryAdvanceService {
  static async list(query, currentUser) {
    const { page, limit, skip } = getPaginationParams(query);
    let where = {
      ...(query.status && { status: query.status }),
      ...(query.userId && { userId: parseInt(query.userId) }),
    };

    if (currentUser.appRole === 'DRIVER') {
      where.userId = currentUser.id;
    } else if (currentUser.appRole === 'SUPERVISOR') {
      where = { ...where, ...buildSupervisorTeamOrSelfFilter(currentUser) };
    } else if (!ADMIN_ROLES.has(currentUser.role)) {
      where.userId = -1;
    }
    where = mergeAppUserIdFilter(where, query.appUserId);
    where = mergeDriverNameIntoUserWhere(where, query);

    const [items, total] = await Promise.all([
      prisma.salaryAdvance.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, fullNameAr: true, identityNumber: true, accountStatus: true } } },
      }),
      prisma.salaryAdvance.count({ where }),
    ]);

    const transformedItems = items.map(item => ({
      ...item,
      user: item.user,
      appUser: item.user ? { user: item.user } : null,
    }));

    return { items: transformedItems, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getById(id, currentUser) {
    const item = await prisma.salaryAdvance.findUnique({
      where: { id: parseInt(id) },
      include: { user: { select: { id: true, fullNameAr: true, fullNameEn: true } } },
    });

    if (!item) throw new NotFoundError('Salary Advance');

    if (currentUser.appRole === 'DRIVER' && item.userId !== currentUser.id) {
      throw new NotFoundError('Salary Advance');
    }
    if (currentUser.appRole === 'SUPERVISOR') {
      await assertCanAccessOwnOrDriverRecord(currentUser, item.userId);
    }

    return item;
  }

  static async create(userId, data, adminId) {
    const item = await prisma.salaryAdvance.create({
      data: {
        userId: parseInt(userId),
        amount: parseFloat(data.amount),
        reason: data.reason,
        notes: data.notes,
        deductionType: data.deduction_type || data.deductionType,
        numberOfMonths: data.numberOfMonths ? parseInt(data.numberOfMonths) : (data.deduction_type === 'full_month' ? 1 : undefined),
        installmentAmount: data.installmentAmount ? parseFloat(data.installmentAmount) : undefined,
        deductFromCurrent: data.deductFromCurrent === true || data.deductFromCurrent === 'true',
      },
    });

    if (adminId) {
      await logAudit({ userId: adminId, action: 'CREATE_SALARY_ADVANCE', entity: 'SalaryAdvance', entityId: String(item.id) });
    }

    return item;
  }

  static async update(id, adminId, data) {
    const existing = await prisma.salaryAdvance.findUnique({ where: { id: parseInt(id) } });
    if (!existing) throw new NotFoundError('Salary Advance');

    const updateData = {};
    if (data.amount !== undefined) updateData.amount = parseFloat(data.amount);
    if (data.reason !== undefined) updateData.reason = data.reason;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.numberOfMonths !== undefined) updateData.numberOfMonths = parseInt(data.numberOfMonths);
    if (data.installmentAmount !== undefined) updateData.installmentAmount = parseFloat(data.installmentAmount);
    if (data.deductFromCurrent !== undefined) updateData.deductFromCurrent = data.deductFromCurrent === true || data.deductFromCurrent === 'true';

    const updated = await prisma.salaryAdvance.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    await logAudit({ userId: adminId, action: 'UPDATE_SALARY_ADVANCE', entity: 'SalaryAdvance', entityId: String(id), newValue: updateData });
    return updated;
  }

  static async supervisorReview(id, currentUser, data) {
    const existing = await prisma.salaryAdvance.findUnique({ where: { id: parseInt(id) } });
    if (!existing) throw new NotFoundError('Salary Advance');
    if (existing.status !== 'PENDING') {
      throw new BusinessLogicError('يمكن مراجعة الطلبات المعلقة فقط');
    }

    await assertSupervisorCanInitialReview(currentUser, existing.userId);

    const approved = data.approved === true || data.status === 'APPROVED';
    const updated = await prisma.salaryAdvance.update({
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
      action: 'SUPERVISOR_REVIEW_SALARY_ADVANCE',
      entity: 'SalaryAdvance',
      entityId: String(id),
      newValue: { supervisorApproved: approved },
    });
    return updated;
  }

  static async review(id, adminId, data, currentUser = null) {
    const existing = await prisma.salaryAdvance.findUnique({ where: { id: parseInt(id) } });
    if (!existing) throw new NotFoundError('Salary Advance');

    if (currentUser && isSupervisor(currentUser)) {
      throw new BusinessLogicError('استخدم مراجعة المشرف المبدئية لهذا الطلب');
    }
    if (currentUser) {
      assertSupervisorCannotFinalReviewOwn(currentUser, existing.userId);
    }

    const updated = await prisma.salaryAdvance.update({
      where: { id: parseInt(id) },
      data: {
        status: data.status,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewNotes: data.reviewNotes,
        financeNotes: data.financeNotes,
        ...(data.numberOfMonths !== undefined && { numberOfMonths: parseInt(data.numberOfMonths) }),
        ...(data.installmentAmount !== undefined && { installmentAmount: parseFloat(data.installmentAmount) }),
        ...(data.deductFromCurrent !== undefined && { deductFromCurrent: data.deductFromCurrent === true || data.deductFromCurrent === 'true' }),
      },
    });

    await logAudit({ userId: adminId, action: 'REVIEW_SALARY_ADVANCE', entity: 'SalaryAdvance', entityId: String(id), newValue: { status: data.status } });
    return updated;
  }

  static async cancel(id, userId) {
    const existing = await prisma.salaryAdvance.findUnique({ where: { id: parseInt(id) } });
    if (!existing) throw new NotFoundError('Salary Advance');
    if (existing.userId !== userId) throw new Error('Unauthorized');

    const updated = await prisma.salaryAdvance.update({
      where: { id: parseInt(id) },
      data: { status: 'CANCELLED' },
    });

    return updated;
  }
}

module.exports = SalaryAdvanceService;
