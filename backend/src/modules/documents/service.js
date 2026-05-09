const prisma = require('../../config/database');
const { NotFoundError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta, buildOrderBy } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');

class DocumentService {
  static async list(query) {
    const { page, limit, skip } = getPaginationParams(query);
    const orderBy = buildOrderBy(query, ['createdAt', 'expiryDate', 'type']);

    const where = {
      deletedAt: null,
      ...(query.userId && { userId: parseInt(query.userId) }),
      ...(query.type && { type: query.type }),
      ...(query.status && { status: query.status }),
    };

    const [items, total] = await Promise.all([
      prisma.document.findMany({
        where, skip, take: limit, orderBy,
        include: { user: { select: { id: true, fullNameAr: true, identityNumber: true } } },
      }),
      prisma.document.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getById(id) {
    const doc = await prisma.document.findFirst({
      where: { id: parseInt(id), deletedAt: null },
      include: { user: { select: { id: true, fullNameAr: true, fullNameEn: true, identityNumber: true } } },
    });
    if (!doc) throw new NotFoundError('Document');
    return doc;
  }

  static async create(data) {
    return prisma.document.create({ data: { ...data, expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined, issueDate: data.issueDate ? new Date(data.issueDate) : undefined } });
  }

  static async update(id, data, adminUser) {
    const doc = await prisma.document.findFirst({ where: { id: parseInt(id), deletedAt: null } });
    if (!doc) throw new NotFoundError('Document');
    const updateData = {};
    const allowedFields = ['title', 'type', 'status', 'expiryDate', 'issueDate', 'reviewNotes', 'fileUrl', 'fileName'];
    
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    });

    if (updateData.expiryDate) updateData.expiryDate = new Date(updateData.expiryDate);
    if (updateData.issueDate) updateData.issueDate = new Date(updateData.issueDate);
    
    return prisma.document.update({ where: { id: parseInt(id) }, data: updateData });
  }

  static async review(id, status, reviewNotes, adminUser) {
    const doc = await prisma.document.findFirst({ where: { id: parseInt(id), deletedAt: null } });
    if (!doc) throw new NotFoundError('Document');

    const updated = await prisma.document.update({
      where: { id: parseInt(id) },
      data: { status, reviewedBy: adminUser.id, reviewedAt: new Date(), reviewNotes },
    });

    await logAudit({ userId: adminUser.id, action: 'REVIEW_DOCUMENT', entity: 'Document', entityId: String(id), newValue: { status, reviewNotes } });
    return updated;
  }

  static async getExpiringDocuments(daysAhead = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return prisma.document.findMany({
      where: { deletedAt: null, expiryDate: { lte: futureDate, gte: new Date() }, status: { not: 'EXPIRED' } },
      include: { user: { select: { id: true, fullNameAr: true, identityNumber: true } } },
      orderBy: { expiryDate: 'asc' },
    });
  }

  /**
   * Automated cron service method: Checks for documents expiring in 30 days and alerts admins.
   */
  static async checkExpiringDocuments() {
    console.log('[Cron] Running checkExpiringDocuments...');
    
    // 1. Get documents that are expiring within 30 days
    const expiringDocs = await this.getExpiringDocuments(30);
    if (expiringDocs.length === 0) return 0;

    // 2. We need an admin to notify. For simplicity, find the first super admin.
    const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN', deletedAt: null } });
    if (!admin) return 0;

    let remindersCreated = 0;
    
    for (const doc of expiringDocs) {
      // Check if we already created a reminder for this document recently
      const existingReminder = await prisma.scheduledReminder.findFirst({
        where: {
          targetUserId: admin.id,
          title: { contains: `تنبيه انتهاء مستند: ${doc.title}` }
        }
      });

      if (!existingReminder) {
        await prisma.scheduledReminder.create({
          data: {
            title: `تنبيه انتهاء مستند: ${doc.title}`,
            body: `المستند الخاص بـ ${doc.user?.fullNameAr} ينتهي بتاريخ ${new Date(doc.expiryDate).toLocaleDateString('ar-SA')}`,
            triggerDate: new Date(),
            targetUserId: admin.id, // Notify the admin
            createdById: admin.id, // System generated, attributed to admin for now
            status: 'PENDING'
          }
        });
        remindersCreated++;
      }
    }
    
    console.log(`[Cron] checkExpiringDocuments completed. Created ${remindersCreated} reminders.`);
    return remindersCreated;
  }

  static async remove(id, adminUser) {
    await prisma.document.update({ where: { id: parseInt(id) }, data: { deletedAt: new Date() } });
    await logAudit({ userId: adminUser.id, action: 'DELETE_DOCUMENT', entity: 'Document', entityId: String(id) });
  }
}

module.exports = DocumentService;
