const prisma = require('../../config/database');
const { NotFoundError, AuthorizationError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { ADMIN_ROLES } = require('../../utils/listScope');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');

class InvestigationService {
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
      prisma.investigation.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullNameAr: true, identityNumber: true } },
          createdBy: { select: { id: true, fullNameAr: true } },
          _count: { select: { attachments: true, eventLogs: true } },
        },
      }),
      prisma.investigation.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getById(id, currentUser) {
    const item = await prisma.investigation.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: { select: { id: true, fullNameAr: true, fullNameEn: true, identityNumber: true } },
        createdBy: { select: { id: true, fullNameAr: true } },
        attachments: true,
        eventLogs: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!item) throw new NotFoundError('Investigation');
    
    // Access check
    if (!ADMIN_ROLES.has(currentUser.role)) {
      if (currentUser.role === 'DRIVER' && item.userId !== currentUser.id) {
        throw new NotFoundError('Investigation');
      }
    }

    return item;
  }

  static async create(adminId, data, files = []) {
    const investigation = await prisma.investigation.create({
      data: {
        userId: parseInt(data.userId),
        createdById: adminId,
        category: data.category,
        title: data.title,
        details: data.details,
        internalNotes: data.internalNotes,
      },
    });

    if (files.length) {
      await prisma.investigationAttachment.createMany({
        data: files.map(f => ({ investigationId: investigation.id, fileUrl: normalizeStoredUploadPath(f.path), fileName: f.originalname, uploadedBy: adminId })),
      });
    }

    await prisma.investigationEvent.create({ data: { investigationId: investigation.id, action: 'Investigation opened', performedBy: adminId } });
    await logAudit({ userId: adminId, action: 'CREATE_INVESTIGATION', entity: 'Investigation', entityId: String(investigation.id) });

    if (data.updateUserStatus === 'true' || data.updateUserStatus === true) {
      await prisma.user.update({ where: { id: parseInt(data.userId) }, data: { accountStatus: 'UNDER_INVESTIGATION' } });
    }

    return prisma.investigation.findUnique({ where: { id: investigation.id }, include: { attachments: true, eventLogs: true } });
  }

  static async respond(id, userId, response, files = []) {
    const invId = parseInt(id);
    const inv = await prisma.investigation.findUnique({ where: { id: invId } });
    if (!inv) throw new NotFoundError('Investigation');
    if (inv.userId !== userId) throw new AuthorizationError('Unauthorized');

    const updated = await prisma.investigation.update({
      where: { id: invId },
      data: { employeeResponse: response, respondedAt: new Date(), status: 'UNDER_REVIEW' },
    });

    if (files.length) {
      await prisma.investigationAttachment.createMany({
        data: files.map(f => ({ investigationId: invId, fileUrl: normalizeStoredUploadPath(f.path), fileName: f.originalname, uploadedBy: userId })),
      });
    }

    await prisma.investigationEvent.create({ data: { investigationId: invId, action: 'Employee responded', performedBy: userId } });
    return updated;
  }

  static async update(id, adminId, data) {
    const existing = await prisma.investigation.findUnique({ where: { id: parseInt(id) } });
    if (!existing) throw new NotFoundError('Investigation');

    const updateData = {};
    const allowedFields = ['category', 'title', 'details', 'status', 'internalNotes', 'outcome', 'employeeResponse'];
    
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    });

    const updated = await prisma.investigation.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    await logAudit({ userId: adminId, action: 'UPDATE_INVESTIGATION', entity: 'Investigation', entityId: String(id), newValue: updateData });
    return updated;
  }

  static async updateStatus(id, adminId, data) {
    const invId = parseInt(id);
    const updateData = { status: data.status };
    if (data.status === 'CLOSED') {
      updateData.closedAt = new Date();
      updateData.closedBy = adminId;
      updateData.outcome = data.outcome;
    }
    if (data.internalNotes) updateData.internalNotes = data.internalNotes;

    const item = await prisma.investigation.update({ where: { id: invId }, data: updateData });

    await prisma.investigationEvent.create({
      data: { investigationId: invId, action: `Status changed to ${data.status}`, performedBy: adminId, notes: data.outcome },
    });
    await logAudit({ userId: adminId, action: 'REVIEW_INVESTIGATION', entity: 'Investigation', entityId: String(invId), newValue: { status: data.status } });
    return item;
  }
}

module.exports = InvestigationService;
