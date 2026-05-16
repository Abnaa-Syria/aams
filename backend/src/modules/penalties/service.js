const prisma = require('../../config/database');
const { NotFoundError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { ADMIN_ROLES, mergeDriverNameIntoUserWhere } = require('../../utils/listScope');

class PenaltyService {
  static async list(query, currentUser) {
    const { page, limit, skip } = getPaginationParams(query);
    let where = {
      ...(query.type && { type: query.type }),
      ...(query.status && { status: query.status }),
      ...(query.userId && { userId: parseInt(query.userId) }),
    };

    // Scoping using userId and appRole
    if (currentUser.appRole === 'DRIVER') {
      where.userId = currentUser.id;
    } else if (currentUser.appRole === 'SUPERVISOR') {
      where.user = { appUser: { supervisorId: currentUser.appUserId } };
    } else if (!ADMIN_ROLES.has(currentUser.role)) {
      where.userId = -1;
    }

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

  static async getTotals() {
    return prisma.penalty.aggregate({
      _sum: { amount: true },
      _count: true,
      where: { status: 'APPLIED' },
    });
  }

  static async getById(id, currentUser) {
    const item = await prisma.penalty.findUnique({
      where: { id: parseInt(id) },
      include: { user: { select: { id: true, fullNameAr: true, fullNameEn: true } } },
    });

    if (!item) throw new NotFoundError('Penalty');

    if (currentUser.appRole === 'DRIVER' && item.userId !== currentUser.id) {
      throw new NotFoundError('Penalty');
    }

    return item;
  }

  static async create(adminId, data) {
    const item = await prisma.penalty.create({
      data: {
        ...data,
        userId: parseInt(data.userId),
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
