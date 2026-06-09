const prisma = require('../../config/database');
const { BusinessLogicError, NotFoundError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { ADMIN_ROLES, mergeDriverNameIntoUserWhere } = require('../../utils/listScope');
const { mergeAppUserIdFilter, resolveUserIdFromDriverInput } = require('../../utils/driverIdentity');

class PenaltyService {
  static applyReadScope(where, currentUser) {
    if (currentUser.appRole === 'DRIVER') {
      return { ...where, userId: currentUser.id };
    }
    if (currentUser.appRole === 'SUPERVISOR') {
      return {
        ...where,
        user: { ...(where.user || {}), appUser: { supervisorId: currentUser.appUserId } },
      };
    }
    if (!ADMIN_ROLES.has(currentUser.role)) {
      return { ...where, userId: -1 };
    }
    return where;
  }

  static async list(query, currentUser) {
    const { page, limit, skip } = getPaginationParams(query);
    let where = {
      ...(query.type && { type: query.type }),
      ...(query.status && { status: query.status }),
      ...(query.userId && { userId: parseInt(query.userId) }),
    };

    where = PenaltyService.applyReadScope(where, currentUser);
    where = mergeAppUserIdFilter(where, query.appUserId);

    where = mergeDriverNameIntoUserWhere(where, query);

    const [items, total] = await Promise.all([
      prisma.penalty.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, fullNameAr: true, identityNumber: true, accountStatus: true } } },
      }),
      prisma.penalty.count({ where }),
    ]);

    const transformedItems = items.map(item => ({
      ...item,
      user: item.user,
      appUser: item.user ? { user: item.user } : null,
    }));


    return { items: transformedItems, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getTotals(currentUser, query = {}) {
    let where = {
      status: 'APPLIED',
      ...(query.type && { type: query.type }),
    };
    where = PenaltyService.applyReadScope(where, currentUser);

    return prisma.penalty.aggregate({
      _sum: { amount: true },
      _count: true,
      where,
    });
  }

  static async getById(id, currentUser) {
    const item = await prisma.penalty.findFirst({
      where: PenaltyService.applyReadScope({ id: parseInt(id) }, currentUser),
      include: { user: { select: { id: true, fullNameAr: true, fullNameEn: true } } },
    });

    if (!item) throw new NotFoundError('Penalty');

    return item;
  }

  static async appeal(id, currentUser, data = {}) {
    if (currentUser.appRole !== 'DRIVER') {
      throw new NotFoundError('Penalty');
    }

    const penalty = await prisma.penalty.findFirst({
      where: { id: parseInt(id), userId: currentUser.id },
    });
    if (!penalty) throw new NotFoundError('Penalty');
    if (!['PENDING', 'APPLIED'].includes(penalty.status)) {
      throw new BusinessLogicError('لا يمكن الاعتراض على هذا الجزاء حالياً');
    }

    const notes = data.reason || data.notes
      ? [penalty.notes, `Driver appeal: ${data.reason || data.notes}`].filter(Boolean).join('\n')
      : penalty.notes;

    const updated = await prisma.penalty.update({
      where: { id: penalty.id },
      data: { status: 'APPEALED', notes },
    });

    await logAudit({
      userId: currentUser.id,
      action: 'APPEAL_PENALTY',
      entity: 'Penalty',
      entityId: String(penalty.id),
      newValue: { reason: data.reason || data.notes || null },
    });

    return updated;
  }

  static async create(adminId, data) {
    const item = await prisma.penalty.create({
      data: {
        ...data,
        userId: await resolveUserIdFromDriverInput(data),
        amount: data.amount ? parseFloat(data.amount) : undefined,
        penaltyDate: data.penaltyDate ? new Date(data.penaltyDate) : new Date(),
        linkedEntityId: data.linkedEntityId ? parseInt(data.linkedEntityId) : undefined,
        createdBy: adminId,
      },
    });

    await logAudit({ userId: adminId, action: 'CREATE_PENALTY', entity: 'Penalty', entityId: String(item.id) });
    return item;
  }

  static async update(id, adminId, data) {
    const existing = await prisma.penalty.findUnique({ where: { id: parseInt(id) } });
    if (!existing) throw new NotFoundError('Penalty');

    const updateData = {};
    const allowedFields = ['amount', 'type', 'reason', 'notes', 'status', 'penaltyDate', 'linkedEntityId', 'linkedEntityType'];

    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    });

    if (updateData.amount) updateData.amount = parseFloat(updateData.amount);
    if (updateData.penaltyDate) updateData.penaltyDate = new Date(updateData.penaltyDate);
    if (updateData.linkedEntityId) updateData.linkedEntityId = parseInt(updateData.linkedEntityId);

    const updated = await prisma.penalty.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    await logAudit({ userId: adminId, action: 'UPDATE_PENALTY', entity: 'Penalty', entityId: String(id), newValue: updateData });
    return updated;
  }

  static async updateStatus(id, adminId, { status }) {
    const existing = await prisma.penalty.findUnique({ where: { id: parseInt(id) } });
    if (!existing) throw new NotFoundError('Penalty');

    const effectiveStatus = status === 'APPROVED' ? 'APPLIED' : status;
    const updateData = { status: effectiveStatus };
    if (effectiveStatus === 'APPLIED') {
      updateData.approvedBy = adminId;
      updateData.approvedAt = new Date();
    }

    const updated = await prisma.penalty.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    await logAudit({ userId: adminId, action: 'REVIEW_PENALTY', entity: 'Penalty', entityId: String(id), newValue: { status } });
    return updated;
  }

  static async delete(id, adminId) {
    const existing = await prisma.penalty.findUnique({ where: { id: parseInt(id) } });
    if (!existing) throw new NotFoundError('Penalty');

    await prisma.penalty.delete({ where: { id: parseInt(id) } });

    await logAudit({ userId: adminId, action: 'DELETE_PENALTY', entity: 'Penalty', entityId: String(id) });
    return true;
  }
}

module.exports = PenaltyService;
