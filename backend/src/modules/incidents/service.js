const prisma = require('../../config/database');
const { NotFoundError, BusinessLogicError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { mergeAppUserIdFilter } = require('../../utils/driverIdentity');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');
const { mergeDriverNameIntoUserWhere } = require('../../utils/listScope');
const { resolvePeriodStartDate } = require('../../utils/periodFilter');

class IncidentService {
  static async list(query, currentUser) {
    const { page, limit, skip } = getPaginationParams(query);
    
    let where = {
      ...(query.type && { type: query.type }),
      ...(query.severity && { severity: query.severity }),
      ...(query.status && { status: query.status }),
      ...(query.userId && { userId: parseInt(query.userId) }),
    };
    if (query.types) {
      const types = String(query.types).split(',').map((t) => t.trim()).filter(Boolean);
      if (types.length) where.type = { in: types };
    }
    where = mergeAppUserIdFilter(where, query.appUserId);

    const appRole = currentUser?.appUser?.appRole;
    if (appRole === 'DRIVER') {
      where.userId = currentUser.id;
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
      prisma.incident.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullNameAr: true, identityNumber: true } },
          shift: { select: { id: true, vehicleId: true } },
          attachments: true,
        },
      }),
      prisma.incident.count({ where }),
    ]);

    const transformedItems = items.map(item => ({
      ...item,
      user: item.user,
      appUser: item.user ? { user: item.user } : null,
    }));


    return { items: transformedItems, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getById(id) {
    const item = await prisma.incident.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: { select: { id: true, fullNameAr: true, fullNameEn: true, mobileNumber: true } },
        shift: { include: { vehicle: true } },
        attachments: true,
      },
    });

    if (!item) throw new NotFoundError('Incident');

    return {
      ...item,
      appUser: item.user ? { user: item.user } : null,
    };
  }

  static async create(userId, data, files = []) {
    const shiftId = data.shiftId ? parseInt(data.shiftId) : undefined;
    
    // Get user with appUser
    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      include: { appUser: true }
    });
    if (!user) throw new NotFoundError('User');
    
    // Get vehicle from shift if provided
    let vehicleId = null;
    if (shiftId) {
      const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
      vehicleId = shift?.vehicleId;
    }

    const incident = await prisma.incident.create({
      data: {
        userId,
        appUserId: user.appUser?.id || null, // Set appUserId for operational queries
        shiftId,
        type: data.type || 'OTHER',
        customType: data.customType,
        severity: data.severity || 'MEDIUM',
        title: data.title || data.description?.substring(0, 100) || `Incident ${data.type || 'OTHER'}`,
        description: data.description || 'No description provided',
        location: data.location,
        latitude: data.latitude ? parseFloat(data.latitude) : undefined,
        longitude: data.longitude ? parseFloat(data.longitude) : undefined,
        caseNumber: data.caseNumber,
        status: 'OPEN',
      },
    });

    // Handle attachments
    if (files && files.length > 0) {
      await prisma.incidentAttachment.createMany({
        data: files.map(f => ({
          incidentId: incident.id,
          fileUrl: normalizeStoredUploadPath(f.path),
          fileName: f.originalname,
          fileType: f.mimetype
        })),
      });
    }

    // AUTOMATION: If it's a serious accident, lock the vehicle
    if (vehicleId && data.type === 'ACCIDENT' && (data.severity === 'HIGH' || data.severity === 'CRITICAL')) {
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: { status: 'OUT_OF_SERVICE' }
      });
      
      await logAudit({
        userId,
        action: 'VEHICLE_LOCKED_BY_INCIDENT',
        entity: 'Vehicle',
        entityId: String(vehicleId),
        notes: `Vehicle locked due to ${data.severity} severity accident #${incident.id}`
      });
    }

    await logAudit({
      userId,
      action: 'REPORT_INCIDENT',
      entity: 'Incident',
      entityId: String(incident.id),
      newValue: { type: data.type, severity: data.severity },
    });

    return prisma.incident.findUnique({
      where: { id: incident.id },
      include: {
        user: { select: { id: true, fullNameAr: true, fullNameEn: true, mobileNumber: true } },
        shift: { include: { vehicle: true } },
        attachments: true,
      },
    });
  }

  static async convertToMaintenance(id, adminId, maintenanceData) {
    const incident = await prisma.incident.findUnique({ 
      where: { id: parseInt(id) },
      include: { shift: true }
    });
    if (!incident) throw new NotFoundError('Incident');
    if (!incident.shift?.vehicleId) throw new BusinessLogicError('No vehicle associated with this incident shift');

    const result = await prisma.$transaction(async (tx) => {
      // Create maintenance request
      const maintenance = await tx.maintenanceRequest.create({
        data: {
          userId: incident.userId,
          vehicleId: incident.shift.vehicleId,
          issueType: maintenanceData.issueType || `Incident Reparation: ${incident.title}`,
          priority: maintenanceData.priority || (incident.severity === 'CRITICAL' ? 'URGENT' : 'HIGH'),
          description: `Generated from incident #${incident.id}: ${incident.description}`,
          status: 'REQUESTED',
        }
      });

      // Link incident to maintenance
      await tx.incident.update({
        where: { id: incident.id },
        data: { 
          maintenanceRequestId: maintenance.id,
          status: 'IN_PROGRESS' 
        }
      });

      return maintenance;
    });

    return result;
  }

  static async updateStatus(id, adminId, { status, resolutionNotes }) {
    const incident = await prisma.incident.findUnique({ where: { id: parseInt(id) } });
    if (!incident) throw new NotFoundError('Incident');

    const updateData = { status };
    if (status === 'RESOLVED' || status === 'CLOSED') {
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = adminId;
      updateData.resolutionNotes = resolutionNotes;
    }

    const updated = await prisma.incident.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    await logAudit({
      userId: adminId,
      action: 'UPDATE_INCIDENT_STATUS',
      entity: 'Incident',
      entityId: String(id),
      newValue: { status },
    });

    return updated;
  }

  static async update(id, adminId, data) {
    const incidentId = parseInt(id, 10);
    const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
    if (!incident) throw new NotFoundError('Incident');

    const updateData = {};
    const allowed = ['type', 'title', 'description', 'severity', 'location', 'status', 'resolutionNotes', 'customType'];
    allowed.forEach((field) => {
      if (data[field] !== undefined) updateData[field] = data[field];
    });

    const updated = await prisma.incident.update({
      where: { id: incidentId },
      data: updateData,
    });

    await logAudit({
      userId: adminId,
      action: 'UPDATE_INCIDENT',
      entity: 'Incident',
      entityId: String(incidentId),
      newValue: updateData,
    });
    return updated;
  }

  static async delete(id, adminId) {
    const incident = await prisma.incident.findUnique({ where: { id: parseInt(id) } });
    if (!incident) throw new NotFoundError('Incident');

    await prisma.$transaction([
      prisma.incidentAttachment.deleteMany({ where: { incidentId: parseInt(id) } }),
      prisma.incident.delete({ where: { id: parseInt(id) } }),
    ]);

    await logAudit({
      userId: adminId,
      action: 'DELETE_INCIDENT',
      entity: 'Incident',
      entityId: String(id),
    });

    return true;
  }
}

module.exports = IncidentService;
