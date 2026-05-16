const prisma = require('../../config/database');
const { NotFoundError, BusinessLogicError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');
const { mergeDriverNameIntoUserWhere } = require('../../utils/listScope');

class ViolationService {
  static async list(query, currentUser) {
    const { page, limit, skip } = getPaginationParams(query);
    
    let where = {
      ...(query.vehicleId && { vehicleId: parseInt(query.vehicleId) }),
      ...(query.status && { status: query.status }),
      ...(query.userId && { userId: parseInt(query.userId) }),
    };

    const appRole = currentUser?.appUser?.appRole;
    if (appRole === 'DRIVER') {
      where.userId = currentUser.id;
    } else if (appRole === 'SUPERVISOR') {
      where.user = { appUser: { supervisorId: currentUser.appUserId } };
    }
    
    where = mergeDriverNameIntoUserWhere(where, query);


    const [items, total] = await Promise.all([
      prisma.violation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullNameAr: true, identityNumber: true, accountStatus: true } },
          vehicle: { select: { id: true, plateNumber: true, model: true } },
        },
      }),
      prisma.violation.count({ where }),
    ]);

    const transformedItems = items.map(item => ({
      ...item,
      user: item.user,
      vehicle: item.vehicle,
      appUser: item.user ? { user: item.user } : null,
    }));


    return { items: transformedItems, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getById(id) {
    const item = await prisma.violation.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: { select: { id: true, fullNameAr: true, fullNameEn: true, accountStatus: true } },
        vehicle: true,
        shift: { select: { id: true, status: true, startedAt: true } },
      },
    });

    if (!item) throw new NotFoundError('Violation');

    return {
      ...item,
      appUser: item.user ? { user: item.user } : null,
    };
  }

  static async create(adminId, data, files = {}) {
    // Only admins/supervisors should report violations for others
    // If a driver is reporting, it might be an incident (handled in incidents module)
    
    const targetUserId = parseInt(data.userId);
    
    // Get target user with appUser
    const targetUser = await prisma.user.findUnique({ 
      where: { id: targetUserId },
      include: { appUser: true }
    });
    if (!targetUser) throw new NotFoundError('User');
    
    const vehicleId = data.vehicleId ? parseInt(data.vehicleId) : undefined;

    const violation = await prisma.violation.create({
      data: {
        userId: targetUserId,
        appUserId: targetUser.appUser?.id || null, // Set appUserId for operational queries
        vehicleId,
        shiftId: data.shiftId ? parseInt(data.shiftId) : undefined,
        penaltyId: data.penaltyId ? parseInt(data.penaltyId) : undefined,
        reason: data.reason,
        amount: data.amount ? parseFloat(data.amount) : undefined,
        location: data.location,
        driverComment: data.driver_comment || data.driverComment,
        violationDate: data.violationDate ? new Date(data.violationDate) : new Date(),
        status: 'REPORTED',
        vehicleImageUrl: (files.vehicle_photo?.[0] || files.vehicleImage?.[0]) ? normalizeStoredUploadPath((files.vehicle_photo?.[0] || files.vehicleImage?.[0]).path) : undefined,
        violationImageUrl: (files.violation_photo?.[0] || files.violationImage?.[0]) ? normalizeStoredUploadPath((files.violation_photo?.[0] || files.violationImage?.[0]).path) : undefined,
        bikeImageUrl: files.bikeImage?.[0] ? normalizeStoredUploadPath(files.bikeImage[0].path) : undefined,
      },
    });

    await logAudit({
      userId: adminId,
      action: 'CREATE_VIOLATION',
      entity: 'Violation',
      entityId: String(violation.id),
      newValue: { userId: targetUserId, reason: data.reason },
    });

    return violation;
  }

  static async update(id, adminId, data) {
    const violation = await prisma.violation.findUnique({ where: { id: parseInt(id) } });
    if (!violation) throw new NotFoundError('Violation');

    const updateData = {};
    const allowedFields = ['reason', 'amount', 'location', 'violationDate', 'status', 'reviewNotes', 'internalNotes'];
    
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    });

    if (updateData.amount) updateData.amount = parseFloat(updateData.amount);
    if (updateData.violationDate) updateData.violationDate = new Date(updateData.violationDate);

    const updated = await prisma.violation.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    return updated;
  }

  static async review(id, adminId, { status, reviewNotes, restrictAccount = false }) {
    const violation = await prisma.violation.findUnique({ 
      where: { id: parseInt(id) },
      include: { user: true }
    });
    if (!violation) throw new NotFoundError('Violation');

    // Atomic update of violation and potentially user status
    const result = await prisma.$transaction(async (tx) => {
      const updatedViolation = await tx.violation.update({
        where: { id: parseInt(id) },
        data: {
          status,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          reviewNotes,
        },
      });

      // If violation is CONFIRMED and restrictAccount is requested, block the user
      if (status === 'CONFIRMED' && restrictAccount) {
        await tx.user.update({
          where: { id: violation.userId },
          data: { accountStatus: 'RESTRICTED' },
        });
        
        await logAudit({
          userId: adminId,
          action: 'RESTRICT_USER_BY_VIOLATION',
          entity: 'User',
          entityId: String(violation.userId),
          notes: `Account restricted due to violation #${id}`,
        });
      }

      return updatedViolation;
    });

    await logAudit({
      userId: adminId,
      action: 'REVIEW_VIOLATION',
      entity: 'Violation',
      entityId: String(id),
      newValue: { status },
    });

    return result;
  }

  static async delete(id, adminId) {
    const violation = await prisma.violation.findUnique({ where: { id: parseInt(id) } });
    if (!violation) throw new NotFoundError('Violation');

    await prisma.violation.delete({ where: { id: parseInt(id) } });

    await logAudit({
      userId: adminId,
      action: 'DELETE_VIOLATION',
      entity: 'Violation',
      entityId: String(id),
    });

    return true;
  }
}

module.exports = ViolationService;
