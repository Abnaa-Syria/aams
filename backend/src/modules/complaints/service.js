const prisma = require('../../config/database');
const { NotFoundError, BusinessLogicError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');
const { parsePositiveInt } = require('../../utils/driverIdentity');

class ComplaintService {
  static async list(query, currentUser) {
    const { page, limit, skip } = getPaginationParams(query);
    const where = {
      ...(query.status && { status: query.status }),
      ...(query.type && { type: query.type }),
    };
    const queryAppUserId = parsePositiveInt(query.appUserId);

    // Scoping logic (Drivers see only theirs, Supervisors see their team)
    if (currentUser.appRole === 'DRIVER') {
      where.filedById = currentUser.id;
    } else if (currentUser.appRole === 'SUPERVISOR') {
      // If supervisor specifies a filedById, it must be one of their drivers
      if (query.userId) {
        where.filedById = parseInt(query.userId);
        where.filedBy = { appUser: { supervisorId: currentUser.appUserId, ...(queryAppUserId && { id: queryAppUserId }) } };
      } else {
        where.filedBy = { appUser: { supervisorId: currentUser.appUserId, ...(queryAppUserId && { id: queryAppUserId }) } };
      }
    } else if (query.userId) {
      where.filedById = parseInt(query.userId);
    } else if (queryAppUserId) {
      where.filedBy = { appUser: { id: queryAppUserId } };
    }

    const [items, total] = await Promise.all([
      prisma.complaint.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { 
          filedBy: { select: { id: true, fullNameAr: true, identityNumber: true } },
          subject: { select: { id: true, fullNameAr: true } }
        },
      }),
      prisma.complaint.count({ where }),
    ]);

    const transformedItems = items.map(item => ({
      ...item,
      appUser: item.filedBy ? { user: item.filedBy } : null,
    }));

    return { items: transformedItems, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getById(id, currentUser) {
    const complaint = await prisma.complaint.findUnique({
      where: { id: parseInt(id) },
      include: {
        filedBy: { select: { id: true, fullNameAr: true, identityNumber: true, mobileNumber: true } },
        subject: { select: { id: true, fullNameAr: true } },
      },
    });

    if (!complaint) throw new NotFoundError('Complaint');
    if (currentUser.appRole === 'DRIVER' && complaint.filedById !== currentUser.id) throw new NotFoundError('Complaint');
    
    return {
      ...complaint,
      appUser: complaint.filedBy ? { user: complaint.filedBy } : null,
    };
  }

  static async create(userId, data, file) {
    const complaint = await prisma.complaint.create({
      data: {
        filedById: userId,
        subjectId: data.subjectId || userId, // Fallback if not provided
        type: data.type,
        title: data.title,
        details: data.description,
        attachmentUrl: file ? normalizeStoredUploadPath(file.path) : undefined,
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
        reviewNotes: data.resolutionNotes,
        reviewedBy: adminId,
        reviewedAt: data.status === 'RESOLVED' || data.status === 'REJECTED' ? new Date() : null,
      },
    });

    await logAudit({ userId: adminId, action: 'RESOLVE_COMPLAINT', entity: 'Complaint', entityId: String(id), newValue: { status: data.status } });
    return updated;
  }
}

module.exports = ComplaintService;
