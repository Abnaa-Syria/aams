const prisma = require('../../config/database');
const { NotFoundError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');

class AdminRequestService {
  static async list(query, currentUser) {
    const { page, limit, skip } = getPaginationParams(query);
    const where = {
      ...(query.status && { status: query.status }),
      ...(query.type && { type: query.type }),
    };

    if (currentUser.role === 'DRIVER') {
      where.userId = currentUser.id;
    } else if (currentUser.role === 'SUPERVISOR') {
      where.user = { supervisorId: currentUser.id };
    }

    const [items, total] = await Promise.all([
      prisma.adminRequest.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, fullNameAr: true, identityNumber: true } } },
      }),
      prisma.adminRequest.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getById(id, currentUser) {
    const adminReq = await prisma.adminRequest.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: { select: { id: true, fullNameAr: true, identityNumber: true, mobileNumber: true } },
        reviewedByAdmin: { select: { id: true, fullNameAr: true } },
      },
    });

    if (!adminReq) throw new NotFoundError('AdminRequest');
    if (currentUser.role === 'DRIVER' && adminReq.userId !== currentUser.id) throw new NotFoundError('AdminRequest');
    
    return adminReq;
  }

  static async create(userId, data) {
    const adminReq = await prisma.adminRequest.create({
      data: {
        userId,
        type: data.type,
        reason: data.reason,
        notes: data.notes,
      },
    });
    return adminReq;
  }

  static async review(id, adminId, data) {
    const adminReq = await prisma.adminRequest.findUnique({ where: { id: parseInt(id) } });
    if (!adminReq) throw new NotFoundError('AdminRequest');

    const updated = await prisma.adminRequest.update({
      where: { id: parseInt(id) },
      data: {
        status: data.status,
        adminNotes: data.adminNotes,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    await logAudit({ userId: adminId, action: 'REVIEW_ADMIN_REQUEST', entity: 'AdminRequest', entityId: String(id), newValue: { status: data.status } });
    return updated;
  }

  static async cancel(id, userId) {
    const adminReq = await prisma.adminRequest.findUnique({ where: { id: parseInt(id) } });
    if (!adminReq) throw new NotFoundError('AdminRequest');
    if (adminReq.userId !== userId) throw new NotFoundError('AdminRequest');

    const updated = await prisma.adminRequest.update({
      where: { id: parseInt(id) },
      data: { status: 'CANCELLED' },
    });

    return updated;
  }
}

module.exports = AdminRequestService;
