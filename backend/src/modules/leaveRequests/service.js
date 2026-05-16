const prisma = require('../../config/database');
const { NotFoundError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { ADMIN_ROLES, mergeDriverNameIntoUserWhere } = require('../../utils/listScope');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');

class LeaveRequestService {
  static async list(query, currentUser) {
    const { page, limit, skip } = getPaginationParams(query);
    let where = {
      ...(query.status && { status: query.status }),
      ...(query.leaveType && { leaveType: query.leaveType }),
      ...(query.userId && { userId: parseInt(query.userId) }),
    };

    // Scoping using userId and appRole
    if (currentUser.appRole === 'DRIVER') {
      where.userId = currentUser.id;
    } else if (currentUser.appRole === 'SUPERVISOR') {
      where.user = { appUser: { supervisorId: currentUser.appUserId } };
    } else if (!ADMIN_ROLES.has(currentUser.role)) {
      where.userId = -1;
    }
    
    where = mergeDriverNameIntoUserWhere(where, query);


    const [items, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, fullNameAr: true, identityNumber: true } } },
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    const transformedItems = items.map(item => ({
      ...item,
      user: item.user,
      appUser: item.user ? { user: item.user } : null,
    }));


    return { items: transformedItems, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getById(id, currentUser) {
    const item = await prisma.leaveRequest.findUnique({
      where: { id: parseInt(id) },
      include: { user: { select: { id: true, fullNameAr: true, fullNameEn: true } } },
    });

    if (!item) throw new NotFoundError('Leave Request');
    
    if (currentUser.appRole === 'DRIVER' && item.userId !== currentUser.id) {
      throw new NotFoundError('Leave Request');
    }

    return item;
  }

  static async getBalances(userId) {
    const uid = parseInt(userId, 10);
    const balances = await prisma.leaveBalance.findMany({
      where: { userId: uid, year: new Date().getFullYear() },
    });
    return balances;
  }

  static async create(userId, data, file = null, adminId) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    const insertData = {
      userId: parseInt(userId),
      leaveType: data.leaveType,
      startDate,
      endDate,
      totalDays,
      reason: data.reason,
    };

    if (file) insertData.attachmentUrl = normalizeStoredUploadPath(file.path);

    const item = await prisma.leaveRequest.create({ data: insertData });

    if (adminId) {
      await logAudit({ userId: adminId, action: 'CREATE_LEAVE_REQUEST', entity: 'LeaveRequest', entityId: String(item.id) });
    }

    return item;
  }

  static async update(id, adminId, data) {
    const existing = await prisma.leaveRequest.findUnique({ where: { id: parseInt(id) } });
    if (!existing) throw new NotFoundError('Leave Request');

    const updateData = {};
    if (data.leaveType !== undefined) updateData.leaveType = data.leaveType;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
    if (data.reason !== undefined) updateData.reason = data.reason;
    if (data.status !== undefined) updateData.status = data.status;
    
    // Recalculate totalDays if dates change
    if (updateData.startDate || updateData.endDate) {
      const s = updateData.startDate || existing.startDate;
      const e = updateData.endDate || existing.endDate;
      updateData.totalDays = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
    }

    const updated = await prisma.leaveRequest.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    await logAudit({ userId: adminId, action: 'UPDATE_LEAVE_REQUEST', entity: 'LeaveRequest', entityId: String(id), newValue: updateData });
    return updated;
  }

  static async review(id, adminId, data) {
    const leaveReq = await prisma.leaveRequest.findUnique({ where: { id: parseInt(id) } });
    if (!leaveReq) throw new NotFoundError('Leave Request');

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.leaveRequest.update({
        where: { id: parseInt(id) },
        data: {
          status: data.status,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          reviewNotes: data.reviewNotes,
        },
      });

      // Update leave balance if approved
      if (data.status === 'APPROVED') {
        const year = new Date().getFullYear();
        await tx.leaveBalance.upsert({
          where: { userId_leaveType_year: { userId: leaveReq.userId, leaveType: leaveReq.leaveType, year } },
          create: { userId: leaveReq.userId, leaveType: leaveReq.leaveType, year, totalDays: 30, usedDays: leaveReq.totalDays, remainingDays: 30 - leaveReq.totalDays },
          update: { usedDays: { increment: leaveReq.totalDays }, remainingDays: { decrement: leaveReq.totalDays } },
        });
        await tx.user.update({ where: { id: leaveReq.userId }, data: { availabilityStatus: 'ON_LEAVE' } });
      }

      return updated;
    });

    await logAudit({ userId: adminId, action: 'REVIEW_LEAVE_REQUEST', entity: 'LeaveRequest', entityId: String(id), newValue: { status: data.status } });
    return result;
  }

  static async cancel(id, userId) {
    const existing = await prisma.leaveRequest.findUnique({ where: { id: parseInt(id) } });
    if (!existing) throw new NotFoundError('Leave Request');
    if (existing.userId !== userId) throw new Error('Unauthorized');

    const updated = await prisma.leaveRequest.update({
      where: { id: parseInt(id) },
      data: { status: 'CANCELLED' },
    });

    return updated;
  }
}

module.exports = LeaveRequestService;
