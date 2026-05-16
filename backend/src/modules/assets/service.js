const prisma = require('../../config/database');
const { NotFoundError, BusinessLogicError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');

class AssetService {
  // --- ASSET CATALOG ---

  static async listAssets(query) {
    const { page, limit, skip } = getPaginationParams(query);
    const where = {
      ...(query.isActive !== undefined && { isActive: query.isActive === 'true' }),
      ...(query.type && { type: query.type }),
      ...(query.search && {
        OR: [
          { nameAr: { contains: query.search } },
          { nameEn: { contains: query.search } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.asset.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.asset.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getAsset(id) {
    const asset = await prisma.asset.findUnique({
      where: { id: parseInt(id) },
      include: {
        assignments: {
          where: { status: 'ASSIGNED' },
          include: { user: { select: { id: true, fullNameAr: true } } },
        },
      },
    });
    if (!asset) throw new NotFoundError('Asset');
    return asset;
  }

  static async createAsset(data, adminId) {
    const asset = await prisma.asset.create({ data });
    await logAudit({ userId: adminId, action: 'CREATE_ASSET', entity: 'Asset', entityId: String(asset.id), newValue: data });
    return asset;
  }

  static async updateAsset(id, data, adminId) {
    const asset = await prisma.asset.findUnique({ where: { id: parseInt(id) } });
    if (!asset) throw new NotFoundError('Asset');
    const updated = await prisma.asset.update({ where: { id: parseInt(id) }, data });
    await logAudit({ userId: adminId, action: 'UPDATE_ASSET', entity: 'Asset', entityId: String(id), oldValue: asset, newValue: updated });
    return updated;
  }

  // --- ASSET ASSIGNMENTS ---

  static async listAssignments(query, currentUser) {
    const { page, limit, skip } = getPaginationParams(query);
    const where = {
      ...(query.userId && { userId: parseInt(query.userId) }),
      ...(query.assetId && { assetId: parseInt(query.assetId) }),
      ...(query.status && { status: query.status }),
    };

    if (currentUser.appRole === 'DRIVER') {
      where.userId = currentUser.id;
    } else if (currentUser.appRole === 'SUPERVISOR') {
      where.user = { appUser: { supervisorId: currentUser.appUserId } };
    }

    const [items, total] = await Promise.all([
      prisma.assetAssignment.findMany({
        where, skip, take: limit, orderBy: { assignedAt: 'desc' },
        include: {
          asset: true,
          user: { select: { id: true, fullNameAr: true, identityNumber: true } },
        },
      }),
      prisma.assetAssignment.count({ where }),
    ]);

    const transformedItems = items.map(item => ({
      ...item,
      appUser: item.user ? { user: item.user } : null,
    }));

    return { items: transformedItems, meta: buildPaginationMeta(total, page, limit) };
  }

  static async assignAsset(data, file, adminId) {
    const assetId = parseInt(data.assetId);
    const userId = parseInt(data.userId);

    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundError('Asset');
    if (!asset.isActive) throw new BusinessLogicError('Asset is not active');

    const assignment = await prisma.assetAssignment.create({
      data: {
        assetId,
        userId,
        condition: data.condition,
        notes: data.notes,
        assignedBy: adminId,
        assignPhotoUrl: file ? normalizeStoredUploadPath(file.path) : undefined,
      },
      include: { asset: true },
    });

    await logAudit({ userId: adminId, action: 'ASSIGN_ASSET', entity: 'AssetAssignment', entityId: String(assignment.id), newValue: { assetId, userId } });
    return assignment;
  }

  static async returnAsset(assignmentId, data, file, adminId) {
    const assignment = await prisma.assetAssignment.findUnique({ where: { id: parseInt(assignmentId) } });
    if (!assignment) throw new NotFoundError('AssetAssignment');
    if (assignment.status !== 'ASSIGNED') throw new BusinessLogicError('Asset is not currently assigned');

    const updated = await prisma.assetAssignment.update({
      where: { id: parseInt(assignmentId) },
      data: {
        status: data.status || 'RETURNED',
        returnedAt: new Date(),
        returnedBy: adminId,
        returnPhotoUrl: file ? normalizeStoredUploadPath(file.path) : undefined,
        notes: data.notes ? `${assignment.notes || ''}\nReturn Notes: ${data.notes}` : assignment.notes,
        ...(data.condition && { condition: data.condition }),
      },
    });

    await logAudit({ userId: adminId, action: 'RETURN_ASSET', entity: 'AssetAssignment', entityId: String(assignmentId), newValue: { status: updated.status } });
    return updated;
  }
}

module.exports = AssetService;
