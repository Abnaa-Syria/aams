const prisma = require('../../config/database');
const { NotFoundError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { ADMIN_ROLES } = require('../../utils/listScope');

class RewardService {
  static async list(query, currentUser) {
    const { page, limit, skip } = getPaginationParams(query);
    let where = {
      ...(query.status && { status: query.status }),
      ...(query.category && { category: query.category }),
      ...(query.userId && { userId: parseInt(query.userId) }),
    };

    // Scoping
    if (!ADMIN_ROLES.has(currentUser.role)) {
      if (currentUser.role === 'DRIVER') {
        where.userId = currentUser.id;
      } else if (currentUser.role === 'SUPERVISOR') {
        where.user = { supervisorId: currentUser.id, role: 'DRIVER' };
      } else {
        where.userId = -1;
      }
    }

    const [items, total] = await Promise.all([
      prisma.reward.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, fullNameAr: true, identityNumber: true } } },
      }),
      prisma.reward.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getSummary() {
    return prisma.reward.aggregate({ _sum: { amount: true, points: true }, _count: true, where: { status: 'APPROVED' } });
  }

  static async getById(id, currentUser) {
    const item = await prisma.reward.findUnique({
      where: { id: parseInt(id) },
      include: { user: { select: { id: true, fullNameAr: true } } }
    });

    if (!item) throw new NotFoundError('Reward');
    
    // Access check
    if (!ADMIN_ROLES.has(currentUser.role)) {
      if (currentUser.role === 'DRIVER' && item.userId !== currentUser.id) {
        throw new NotFoundError('Reward');
      }
    }

    return item;
  }

  static async create(adminId, data) {
    const item = await prisma.reward.create({
      data: {
        ...data,
        userId: parseInt(data.userId),
        amount: data.amount ? parseFloat(data.amount) : undefined,
        points: data.points ? parseInt(data.points) : undefined,
        periodStart: data.periodStart ? new Date(data.periodStart) : undefined,
        periodEnd: data.periodEnd ? new Date(data.periodEnd) : undefined,
        createdBy: adminId,
      },
    });

    await logAudit({ userId: adminId, action: 'CREATE_REWARD', entity: 'Reward', entityId: String(item.id) });
    return item;
  }

  static async update(id, adminId, data) {
    const existing = await prisma.reward.findUnique({ where: { id: parseInt(id) } });
    if (!existing) throw new NotFoundError('Reward');

    const updateData = {};
    const allowedFields = ['amount', 'points', 'category', 'title', 'reason', 'notes', 'status', 'periodStart', 'periodEnd'];
    
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    });

    if (updateData.amount) updateData.amount = parseFloat(updateData.amount);
    if (updateData.points) updateData.points = parseInt(updateData.points);
    if (updateData.periodStart) updateData.periodStart = new Date(updateData.periodStart);
    if (updateData.periodEnd) updateData.periodEnd = new Date(updateData.periodEnd);

    const updated = await prisma.reward.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    await logAudit({ userId: adminId, action: 'UPDATE_REWARD', entity: 'Reward', entityId: String(id), newValue: updateData });
    return updated;
  }

  static async updateStatus(id, adminId, { status }) {
    const existing = await prisma.reward.findUnique({ where: { id: parseInt(id) } });
    if (!existing) throw new NotFoundError('Reward');

    const updateData = { status };
    if (status === 'APPROVED') {
      updateData.approvedBy = adminId;
      updateData.approvedAt = new Date();
    }

    const updated = await prisma.reward.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    await logAudit({ userId: adminId, action: 'REVIEW_REWARD', entity: 'Reward', entityId: String(id), newValue: { status } });
    return updated;
  }

  static async delete(id, adminId) {
    const existing = await prisma.reward.findUnique({ where: { id: parseInt(id) } });
    if (!existing) throw new NotFoundError('Reward');

    await prisma.reward.delete({ where: { id: parseInt(id) } });

    await logAudit({ userId: adminId, action: 'DELETE_REWARD', entity: 'Reward', entityId: String(id) });
    return true;
  }
}

module.exports = RewardService;
