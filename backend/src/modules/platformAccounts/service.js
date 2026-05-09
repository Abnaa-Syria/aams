const prisma = require('../../config/database');
const { NotFoundError, AuthorizationError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { ADMIN_ROLES, mergeDriverNameIntoUserWhere } = require('../../utils/listScope');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');

class PlatformAccountService {
  static async list(query, currentUser) {
    const { page, limit, skip } = getPaginationParams(query);
    let where = {
      deletedAt: null,
      ...(query.userId && { userId: parseInt(query.userId) }),
      ...(query.platformId && { platformId: parseInt(query.platformId) }),
      ...(query.status && { status: query.status }),
    };
    where = mergeDriverNameIntoUserWhere(where, query);

    const [items, total] = await Promise.all([
      prisma.platformAccount.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullNameAr: true, identityNumber: true } },
          platform: { select: { id: true, nameAr: true, nameEn: true } },
        },
      }),
      prisma.platformAccount.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getById(id, currentUser) {
    const item = await prisma.platformAccount.findFirst({
      where: { id: parseInt(id), deletedAt: null },
      include: { user: { select: { id: true, fullNameAr: true } }, platform: true },
    });
    if (!item) throw new NotFoundError('Platform Account');
    
    // Access check
    if (!ADMIN_ROLES.has(currentUser.role) && item.userId !== currentUser.id) {
       throw new NotFoundError('Platform Account');
    }

    return item;
  }

  static async create(userId, data, file = null, adminId) {
    const insertData = {
      ...data,
      userId: parseInt(userId),
      platformId: data.platformId ? parseInt(data.platformId) : undefined,
      isAlternate: data.isAlternate === 'true' || data.isAlternate === true,
      receiptDate: data.receiptDate ? new Date(data.receiptDate) : undefined,
      returnDate: data.returnDate ? new Date(data.returnDate) : undefined,
      startWorkDate: data.startWorkDate ? new Date(data.startWorkDate) : undefined,
    };

    if (file) insertData.fileUrl = normalizeStoredUploadPath(file.path);

    const item = await prisma.platformAccount.create({ data: insertData });
    await logAudit({ userId: adminId, action: 'CREATE_PLATFORM_ACCOUNT', entity: 'PlatformAccount', entityId: String(item.id) });
    return item;
  }

  static async update(id, adminId, data, file = null, currentUser) {
    const existing = await prisma.platformAccount.findUnique({ where: { id: parseInt(id) } });
    if (!existing || existing.deletedAt) throw new NotFoundError('Platform Account');

    const updateData = {};
    const allowedFields = ['username', 'password', 'status', 'isAlternate', 'receiptDate', 'returnDate', 'startWorkDate', 'notes'];
    
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    });

    if (data.userId !== undefined) {
      const newUid = parseInt(data.userId);
      if (!ADMIN_ROLES.has(currentUser.role) && newUid !== existing.userId) {
        throw new AuthorizationError('Unauthorized user transfer');
      }
      updateData.userId = newUid;
    }
    if (updateData.platformId) updateData.platformId = parseInt(updateData.platformId);
    if (updateData.isAlternate !== undefined) updateData.isAlternate = updateData.isAlternate === 'true' || updateData.isAlternate === true;
    if (updateData.receiptDate) updateData.receiptDate = new Date(updateData.receiptDate);
    if (updateData.returnDate) updateData.returnDate = new Date(updateData.returnDate);
    if (updateData.startWorkDate) updateData.startWorkDate = new Date(updateData.startWorkDate);
    if (file) updateData.fileUrl = normalizeStoredUploadPath(file.path);

    const item = await prisma.platformAccount.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    await logAudit({ userId: adminId, action: 'UPDATE_PLATFORM_ACCOUNT', entity: 'PlatformAccount', entityId: String(id), newValue: updateData });
    return item;
  }

  static async verify(id, adminId, { status }) {
    const item = await prisma.platformAccount.update({
      where: { id: parseInt(id) },
      data: { status, verifiedBy: adminId, verifiedAt: new Date() },
    });
    await logAudit({ userId: adminId, action: 'VERIFY_PLATFORM_ACCOUNT', entity: 'PlatformAccount', entityId: String(id), newValue: { status } });
    return item;
  }

  static async delete(id, adminId) {
    await prisma.platformAccount.update({ where: { id: parseInt(id) }, data: { deletedAt: new Date() } });
    await logAudit({ userId: adminId, action: 'DELETE_PLATFORM_ACCOUNT', entity: 'PlatformAccount', entityId: String(id) });
    return true;
  }
}

module.exports = PlatformAccountService;
