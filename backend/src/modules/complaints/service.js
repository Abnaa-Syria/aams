const prisma = require('../../config/database');
const { NotFoundError, BusinessLogicError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');

class ComplaintService {
  static async list(query, currentUser) {
    const { page, limit, skip } = getPaginationParams(query);
    const where = {
      ...(query.status && { status: query.status }),
      ...(query.type && { type: query.type }),
    };

    // Scoping logic (Drivers see only theirs, Supervisors see their team)
    if (currentUser.role === 'DRIVER') {
      where.userId = currentUser.id;
    } else if (currentUser.role === 'SUPERVISOR') {
      // If supervisor specifies a userId, it must be one of their drivers
      if (query.userId) {
        where.userId = parseInt(query.userId);
        where.user = { supervisorId: currentUser.id };
      } else {
        where.user = { supervisorId: currentUser.id };
      }
    } else if (query.userId) {
      // Admins and other roles can filter by userId freely
      where.userId = parseInt(query.userId);
    }

    const [items, total] = await Promise.all([
      prisma.complaint.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, fullNameAr: true, identityNumber: true } } },
      }),
      prisma.complaint.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getById(id, currentUser) {
    const complaint = await prisma.complaint.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: { select: { id: true, fullNameAr: true, identityNumber: true, mobileNumber: true } },
        resolvedByAdmin: { select: { id: true, fullNameAr: true } },
      },
    });

    if (!complaint) throw new NotFoundError('Complaint');
    if (currentUser.role === 'DRIVER' && complaint.userId !== currentUser.id) throw new NotFoundError('Complaint');
    
    return complaint;
  }

  static async create(userId, data, file) {
    const complaint = await prisma.complaint.create({
      data: {
        userId,
        type: data.type,
        title: data.title,
        description: data.description,
        photoUrl: file ? normalizeStoredUploadPath(file.path) : undefined,
      },
    });
    return complaint;
  }

  static async resolve(id, adminId, data) {
    const complaint = await prisma.complaint.findUnique({ where: { id: parseInt(id) } });
    if (!complaint) throw new NotFoundError('Complaint');

    const updated = await prisma.complaint.update({
      where: { id: parseInt(id) },
      data: {
        status: data.status,
        resolutionNotes: data.resolutionNotes,
        resolvedBy: adminId,
        resolvedAt: data.status === 'RESOLVED' || data.status === 'REJECTED' ? new Date() : null,
      },
    });

    await logAudit({ userId: adminId, action: 'RESOLVE_COMPLAINT', entity: 'Complaint', entityId: String(id), newValue: { status: data.status } });
    return updated;
  }
}

module.exports = ComplaintService;
