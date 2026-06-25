const prisma = require('../../config/database');
const { NotFoundError, AuthorizationError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { ADMIN_ROLES, mergeDriverNameIntoUserWhere } = require('../../utils/listScope');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');
const { mergeAppUserIdFilter, resolveUserIdFromDriverInput } = require('../../utils/driverIdentity');

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
      if (currentUser.appRole === 'DRIVER') {
        where.userId = currentUser.id;
      } else if (currentUser.appRole === 'SUPERVISOR') {
        where.user = { appUser: { appRole: 'DRIVER' } };
        if (query.userId) where.userId = parseInt(query.userId);
      } else {
        where.userId = -1;
      }
    }
    where = mergeAppUserIdFilter(where, query.appUserId);

    where = mergeDriverNameIntoUserWhere(where, query);

    const [items, total] = await Promise.all([
      prisma.investigation.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullNameAr: true, identityNumber: true, accountStatus: true } },
          createdBy: { select: { id: true, fullNameAr: true } },
          _count: { select: { attachments: true, eventLogs: true } },
        },
      }),

      prisma.investigation.count({ where }),
    ]);

    const transformedItems = items.map(item => ({
      ...item,
      user: item.user,
      appUser: item.user ? { user: item.user } : null,
    }));


    return { items: transformedItems, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getById(id, currentUser) {
    const item = await prisma.investigation.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            fullNameAr: true,
            fullNameEn: true,
            identityNumber: true,
            appUser: { select: { id: true } },
          },
        },
        createdBy: { select: { id: true, fullNameAr: true } },
        attachments: true,
        eventLogs: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!item) throw new NotFoundError('Investigation');

    // Access check
    if (!ADMIN_ROLES.has(currentUser.role)) {
      if (currentUser.appRole === 'DRIVER' && item.userId !== currentUser.id) {
        throw new NotFoundError('Investigation');
      }
      // Supervisors: access all driver investigations (requirement #16)
    }

    return item;
  }

  static async create(adminId, data, files = []) {
    const userId = await resolveUserIdFromDriverInput(data);
    const investigation = await prisma.investigation.create({
      data: {
        userId,
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
      await prisma.user.update({ where: { id: userId }, data: { accountStatus: 'UNDER_INVESTIGATION' } });
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
    const existing = await prisma.investigation.findUnique({ where: { id: invId } });
    if (!existing) throw new NotFoundError('Investigation');

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
