const prisma = require('../../config/database');
const { NotFoundError, BusinessLogicError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');

class MaintenanceRequestService {
  static async list(query, currentUser) {
    const { page, limit, skip } = getPaginationParams(query);
    
    let where = {
      ...(query.vehicleId && { vehicleId: parseInt(query.vehicleId) }),
      ...(query.status && { status: query.status }),
      ...(query.priority && { priority: query.priority }),
    };

    // Scoping logic (Drivers see only theirs, Supervisors see their team)
    if (currentUser.role === 'DRIVER') {
      where.userId = currentUser.id;
    } else if (currentUser.role === 'SUPERVISOR') {
      // If supervisor specifies a userId, it must be one of their drivers
      if (query.userId) {
        where.userId = parseInt(query.userId);
        where.user = { supervisorId: currentUser.id };
      } else {
        where.user = { supervisorId: currentUser.id };
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
          user: { select: { id: true, fullNameAr: true } },
          vehicle: { select: { id: true, plateNumber: true, model: true, status: true } },
        },
      }),
      prisma.maintenanceRequest.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getById(id, currentUser) {
    const item = await prisma.maintenanceRequest.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: { select: { id: true, fullNameAr: true, fullNameEn: true } },
        vehicle: true,
      },
    });

    if (!item) throw new NotFoundError('Maintenance Request');
    
    // Access control
    if (currentUser.role === 'DRIVER' && item.userId !== currentUser.id) {
      throw new NotFoundError('Maintenance Request');
    }

    return item;
  }

  static async create(userId, data, file = null) {
    const vehicleId = parseInt(data.vehicleId);
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundError('Vehicle');

    const request = await prisma.maintenanceRequest.create({
      data: {
        userId,
        vehicleId,
        issueType: data.issueType,
        priority: data.priority || 'MEDIUM',
        description: data.description,
        odometerReading: data.odometerReading ? parseInt(data.odometerReading) : (vehicle.odometerKm || 0),
        status: 'REQUESTED',
        attachmentUrl: file ? normalizeStoredUploadPath(file.path) : undefined,
      },
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
      cost: data.cost ? parseFloat(data.cost) : undefined,
      maintenanceCenter: data.maintenanceCenter,
    };

    if (data.status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    // atomic update with vehicle status
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceRequest.update({
        where: { id: parseInt(id) },
        data: updateData,
      });

      // Workflow Logic: Update vehicle status
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
