const prisma = require('../../config/database');
const { NotFoundError, AuthorizationError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { ADMIN_ROLES, mergeDriverNameIntoUserWhere, applyUserOwnedListScope } = require('../../utils/listScope');
const { assertCanAccessDriverRecord } = require('../../utils/recordAccess');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');
const { isPlatformAccountScreenshotField } = require('../../utils/platformAccountUpload');
const { resolveUserIdFromDriverInput, stripOperationalIdentityFields } = require('../../utils/driverIdentity');

class PlatformAccountService {
  static async list(query, currentUser) {
    const { page, limit, skip } = getPaginationParams(query);
    let where = {
      deletedAt: null,
      ...(query.userId && { userId: parseInt(query.userId) }),
      ...(query.platformId && { platformId: parseInt(query.platformId) }),
      ...(query.status && { status: query.status }),
    };
    where = applyUserOwnedListScope(where, { user: currentUser, query });
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

    const transformedItems = items.map(item => ({
      ...item,
      appUser: item.user ? { user: item.user } : null,
    }));

    return { items: transformedItems, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getById(id, currentUser) {
    const accountId = parseInt(id);
    const item = await prisma.platformAccount.findFirst({
      where: { id: accountId, deletedAt: null },
      include: { 
        user: { select: { id: true, fullNameAr: true, identityNumber: true, mobileNumber: true } }, 
        platform: true 
      },
    });
    if (!item) throw new NotFoundError('Platform Account');
    await assertCanAccessDriverRecord(currentUser, item.userId);

    const workHistory = await prisma.platformAccountWorkHistory.findMany({
      where: { platformAccountId: accountId },
      orderBy: { startDate: 'desc' },
    });
    const shifts = await prisma.shift.findMany({
      where: { platformAccountId: accountId },
      include: {
        user: { select: { id: true, fullNameAr: true } },
        dailyReports: { select: { totalOrders: true } }
      },
      orderBy: { startedAt: 'desc' },
      take: 50
    });

    // Fetch Audit Logs (Assignment History)
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entity: 'PlatformAccount',
        entityId: String(accountId),
      },
      include: {
        user: { select: { id: true, fullNameAr: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      ...item,
      workHistory,
      shifts: shifts.map(s => ({
        ...s,
        totalOrders: s.dailyReports.reduce((sum, r) => sum + (r.totalOrders || 0), 0)
      })),
      auditLogs
    };
  }

  static async create(userId, data, file = null, adminId) {
    const insertData = {
      userId: parseInt(userId),
      platformId: data.platformId ? parseInt(data.platformId) : undefined,
      username: data.username,
      accountId: data.accountId,
      notes: data.notes,
      isAlternate: data.isAlternate === 'true' || data.isAlternate === true,
      alternateUsername: data.alternateUsername,
      receiptDate: data.receiptDate ? new Date(data.receiptDate) : undefined,
      returnDate: data.returnDate ? new Date(data.returnDate) : undefined,
      startWorkDate: data.startWorkDate ? new Date(data.startWorkDate) : undefined,
    };

    if (file) {
      const storedPath = normalizeStoredUploadPath(file.path);
      if (isPlatformAccountScreenshotField(file.fieldname)) {
        insertData.accountScreenshotUrl = storedPath;
      } else {
        insertData.fileUrl = storedPath;
      }
    }

    const item = await prisma.platformAccount.create({ data: insertData });
    if (insertData.startWorkDate) {
      await prisma.platformAccountWorkHistory.create({
        data: {
          platformAccountId: item.id,
          startDate: insertData.startWorkDate,
          assignedBy: adminId,
          notes: 'بدء العمل على الحساب',
        },
      });
    }
    await logAudit({ userId: adminId, action: 'CREATE_PLATFORM_ACCOUNT', entity: 'PlatformAccount', entityId: String(item.id) });
    return item;
  }

  static async update(id, adminId, data, file = null, currentUser) {
    const existing = await prisma.platformAccount.findUnique({ where: { id: parseInt(id) } });
    if (!existing || existing.deletedAt) throw new NotFoundError('Platform Account');

    const updateData = {};
    const allowedFields = ['username', 'accountId', 'status', 'isAlternate', 'alternateUsername', 'receiptDate', 'returnDate', 'startWorkDate', 'notes'];
    
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    });

    if (data.userId !== undefined || data.appUserId !== undefined) {
      const newUid = await resolveUserIdFromDriverInput(data, currentUser);
      if (!ADMIN_ROLES.has(currentUser.role) && newUid !== existing.userId) {
        throw new AuthorizationError('Unauthorized user transfer');
      }
      updateData.userId = newUid;
    }
    data = stripOperationalIdentityFields(data);
    if (updateData.platformId) updateData.platformId = parseInt(updateData.platformId);
    if (updateData.isAlternate !== undefined) updateData.isAlternate = updateData.isAlternate === 'true' || updateData.isAlternate === true;
    if (updateData.receiptDate) updateData.receiptDate = new Date(updateData.receiptDate);
    if (updateData.returnDate) updateData.returnDate = new Date(updateData.returnDate);
    if (updateData.startWorkDate) updateData.startWorkDate = new Date(updateData.startWorkDate);
    if (file) {
      const storedPath = normalizeStoredUploadPath(file.path);
      if (isPlatformAccountScreenshotField(file.fieldname)) {
        updateData.accountScreenshotUrl = storedPath;
      } else {
        updateData.fileUrl = storedPath;
      }
    }

    if (updateData.startWorkDate) {
      const newStart = new Date(updateData.startWorkDate);
      const prevStart = existing.startWorkDate ? new Date(existing.startWorkDate).getTime() : null;
      if (!prevStart || prevStart !== newStart.getTime()) {
        await prisma.platformAccountWorkHistory.create({
          data: {
            platformAccountId: parseInt(id, 10),
            startDate: newStart,
            assignedBy: adminId,
            notes: data.workHistoryNotes || 'تحديث تاريخ بدء العمل',
          },
        });
      }
    }

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
