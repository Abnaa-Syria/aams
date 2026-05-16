const prisma = require('../../config/database');
const { NotFoundError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');
const { mergeDriverNameIntoUserWhere } = require('../../utils/listScope');

class MaintenanceRequestService {
  static async list(query, currentUser) {
    const { page, limit, skip } = getPaginationParams(query);

    let where = {
      ...(query.vehicleId && { vehicleId: parseInt(query.vehicleId) }),
      ...(query.status && { status: query.status }),
      ...(query.priority && { priority: query.priority }),
    };

    // Scoping using userId and appRole
    if (currentUser.appRole === 'DRIVER') {
      where.userId = currentUser.id;
    } else if (currentUser.appRole === 'SUPERVISOR') {
      // If supervisor specifies a userId, it must be one of their drivers
      if (query.userId) {
        where.userId = parseInt(query.userId);
        where.user = { appUser: { supervisorId: currentUser.appUserId } };
      } else {
        where.user = { appUser: { supervisorId: currentUser.appUserId } };
      }
    } else if (query.userId) {
      // Admins and other roles can filter by userId freely
      where.userId = parseInt(query.userId);
    }

    const [items, total] = await Promise.all([
      prisma.maintenanceRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullNameAr: true, identityNumber: true } },
          vehicle: { select: { id: true, plateNumber: true, model: true, status: true } },
          attachments: true,
        },
      }),
      prisma.maintenanceRequest.count({ where }),
    ]);

    const transformedItems = items.map(item => ({
      ...item,
      appUser: item.user ? { user: item.user } : null,
    }));

    return { items: transformedItems, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getById(id) {
    const item = await prisma.maintenanceRequest.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: { select: { id: true, fullNameAr: true, fullNameEn: true } },
        vehicle: true,
        attachments: true,
      },
    });

    if (!item) throw new NotFoundError('Maintenance Request');

    return {
      ...item,
      appUser: item.user ? { user: item.user } : null,
    };
  }

  static async create(userId, data, files = []) {
    const vehicleId = parseInt(data.vehicleId);
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundError('Vehicle');

    const firstPath = files[0] ? normalizeStoredUploadPath(files[0].path) : undefined;

    const createData = {
      userId,
      vehicleId,
      issueType: data.issueType,
      priority: data.priority || 'MEDIUM',
      description: data.description,
      status: 'REQUESTED',
      attachmentUrl: firstPath,
    };

    if (files.length > 0) {
      createData.attachments = {
        create: files.map((f) => ({
          fileUrl: normalizeStoredUploadPath(f.path),
          fileName: f.originalname,
          fileType: f.mimetype,
        })),
      };
    }

    const request = await prisma.maintenanceRequest.create({
      data: createData,
      include: { attachments: true },
    });

    await logAudit({
      userId,
      action: 'CREATE_MAINTENANCE_REQUEST',
      entity: 'MaintenanceRequest',
      entityId: String(request.id),
      newValue: { issueType: data.issueType, vehicleId },
    });

    return request;
  }

  static async updateStatus(id, adminId, data) {
    const request = await prisma.maintenanceRequest.findUnique({ where: { id: parseInt(id) } });
    if (!request) throw new NotFoundError('Maintenance Request');

    const updateData = {
      status: data.status,
      technicianNotes: data.technicianNotes,
      adminNotes: data.adminNotes,
    };

    if (data.status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceRequest.update({
        where: { id: parseInt(id) },
        data: updateData,
      });

      if (data.status === 'IN_PROGRESS') {
        await tx.vehicle.update({ where: { id: request.vehicleId }, data: { status: 'IN_MAINTENANCE' } });
      } else if (data.status === 'COMPLETED' || data.status === 'CANCELLED') {
        await tx.vehicle.update({ where: { id: request.vehicleId }, data: { status: 'ACTIVE' } });
      }

      return updated;
    });

    await logAudit({
      userId: adminId,
      action: 'UPDATE_MAINTENANCE_STATUS',
      entity: 'MaintenanceRequest',
      entityId: String(id),
      newValue: { status: data.status },
    });

    return result;
  }

  static async update(id, adminId, data) {
    const existing = await prisma.maintenanceRequest.findUnique({ where: { id: parseInt(id) } });
    if (!existing) throw new NotFoundError('Maintenance Request');

    const updateData = {};
    const allowedFields = ['issueType', 'description', 'priority', 'status', 'cost', 'odometerReading', 'internalNotes', 'workshopName', 'completionDate'];
    
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    });

    if (updateData.odometerReading) updateData.odometerReading = parseInt(updateData.odometerReading);
    if (updateData.cost) updateData.cost = parseFloat(updateData.cost);
    if (updateData.completionDate) updateData.completionDate = new Date(updateData.completionDate);

    const updated = await prisma.maintenanceRequest.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    await logAudit({ userId: adminId, action: 'UPDATE_MAINTENANCE_REQUEST', entity: 'MaintenanceRequest', entityId: String(id), newValue: updateData });
    return updated;
  }

  static async delete(id, adminId) {
    const request = await prisma.maintenanceRequest.findUnique({ where: { id: parseInt(id) } });
    if (!request) throw new NotFoundError('Maintenance Request');

    await prisma.maintenanceRequest.delete({ where: { id: parseInt(id) } });

    await logAudit({
      userId: adminId,
      action: 'DELETE_MAINTENANCE_REQUEST',
      entity: 'MaintenanceRequest',
      entityId: String(id),
    });

    return true;
  }
}

module.exports = MaintenanceRequestService;
