const prisma = require('../../config/database');
const { NotFoundError, ValidationError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');
const { mergeDriverNameIntoUserWhere } = require('../../utils/listScope');
const { mergeAppUserIdFilter } = require('../../utils/driverIdentity');
const { resolvePeriodStartDate } = require('../../utils/periodFilter');

const DEFAULT_ISSUE_TYPE = 'MECHANICAL';

class MaintenanceRequestService {
  static resolveIssueType(data = {}) {
    const raw = data.issueType ?? data.type;
    if (raw === undefined || raw === null || String(raw).trim() === '') {
      return DEFAULT_ISSUE_TYPE;
    }
    return String(raw).trim();
  }

  static async list(query, currentUser) {
    const { page, limit, skip } = getPaginationParams(query);

    let where = {
      ...(query.vehicleId && { vehicleId: parseInt(query.vehicleId) }),
      ...(query.status && { status: query.status }),
      ...(query.priority && { priority: query.priority }),
    };
    where = mergeAppUserIdFilter(where, query.appUserId);

    // Scoping using userId and appRole
    if (currentUser.appRole === 'DRIVER') {
      where.userId = currentUser.id;
    } else if (currentUser.appRole === 'SUPERVISOR') {
      if (query.userId) where.userId = parseInt(query.userId);
    } else if (query.userId) {
      // Admins and other roles can filter by userId freely
      where.userId = parseInt(query.userId);
    }

    where = mergeDriverNameIntoUserWhere(where, query);

    if (query.period && !query.dateFrom && !query.dateTo) {
      where.createdAt = { gte: resolvePeriodStartDate(query.period) };
    } else if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
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
    let vehicleId = parseInt(data.vehicleId, 10);
    if (Number.isNaN(vehicleId)) {
      const assignment = await prisma.vehicleAssignment.findFirst({
        where: { userId, isActive: true },
        orderBy: { assignedAt: 'desc' },
        select: { vehicleId: true },
      });
      if (assignment) vehicleId = assignment.vehicleId;
    }
    if (Number.isNaN(vehicleId)) {
      const activeShift = await prisma.shift.findFirst({
        where: { userId, status: 'ACTIVE' },
        orderBy: { startedAt: 'desc' },
        select: { vehicleId: true },
      });
      if (activeShift) vehicleId = activeShift.vehicleId;
    }
    if (Number.isNaN(vehicleId)) throw new ValidationError('vehicleId is required');

    const description = data.description != null ? String(data.description).trim() : '';
    if (!description) throw new ValidationError('description is required');

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundError('Vehicle');

    const issueType = MaintenanceRequestService.resolveIssueType(data);
    const firstPath = files[0] ? normalizeStoredUploadPath(files[0].path) : undefined;

    const createData = {
      userId,
      vehicleId,
      issueType,
      priority: data.priority || 'MEDIUM',
      description,
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
      newValue: { issueType, vehicleId },
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
    const allowedFields = ['description', 'priority', 'status', 'cost', 'odometerReading', 'workshopName', 'completionDate', 'technicianNotes', 'adminNotes'];

    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    });

    if (data.issueType !== undefined || data.type !== undefined) {
      updateData.issueType = MaintenanceRequestService.resolveIssueType(data);
    }

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
