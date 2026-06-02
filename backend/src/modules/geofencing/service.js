const prisma = require('../../config/database');
const { NotFoundError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { mergeAppUserIdFilter } = require('../../utils/driverIdentity');

class GeofencingService {
  // --- LOCATIONS ---

  static async logLocation(userId, data) {
    return prisma.locationHistory.create({
      data: {
        userId: parseInt(userId),
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        speed: data.speed,
        heading: data.heading,
        recordedAt: data.recordedAt ? new Date(data.recordedAt) : new Date(),
      },
    });
  }

  static async bulkLogLocations(userId, locations) {
    const data = locations.map(loc => ({
      userId: parseInt(userId),
      latitude: loc.latitude,
      longitude: loc.longitude,
      accuracy: loc.accuracy,
      speed: loc.speed,
      heading: loc.heading,
      recordedAt: loc.recordedAt ? new Date(loc.recordedAt) : new Date(),
    }));

    return prisma.locationHistory.createMany({ data });
  }

  static async getLocationHistory(query) {
    const { page, limit, skip } = getPaginationParams(query);
    let where = {
      ...(query.userId && { userId: parseInt(query.userId) }),
      ...(query.dateFrom && { recordedAt: { gte: new Date(query.dateFrom) } }),
      ...(query.dateTo && { recordedAt: { ...((query.dateFrom && { gte: new Date(query.dateFrom) }) || {}), lte: new Date(query.dateTo) } }),
    };
    where = mergeAppUserIdFilter(where, query.appUserId);

    const [items, total] = await Promise.all([
      prisma.locationHistory.findMany({
        where, skip, take: limit, orderBy: { recordedAt: 'desc' },
        include: { user: { select: { id: true, fullNameAr: true, identityNumber: true } } },
      }),
      prisma.locationHistory.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getLatestLocations(query) {
    // Basic implementation: get the latest location for each active driver (in real prod, Redis is better)
    // Here we'll just fetch latest 1 location per user for those requested
    let userIds = query.userIds ? query.userIds.split(',').map(id => parseInt(id)) : [];
    if (query.appUserIds) {
      const appUserIds = query.appUserIds.split(',').map(id => parseInt(id, 10)).filter(id => !Number.isNaN(id));
      const appUsers = await prisma.appUser.findMany({
        where: { id: { in: appUserIds } },
        select: { userId: true },
      });
      userIds = [...userIds, ...appUsers.map((u) => u.userId)];
    }
    if (!userIds.length) return [];

    // Prisma doesn't have distinct ON without PostgreSQL, so we'll do an IN query and group in memory if needed
    // For small sets this is fine
    const locations = await prisma.locationHistory.findMany({
      where: { userId: { in: userIds } },
      orderBy: { recordedAt: 'desc' },
      distinct: ['userId'],
      include: { user: { select: { id: true, fullNameAr: true } } },
    });
    
    return locations;
  }

  // --- ZONES ---

  static async listZones(query) {
    const { page, limit, skip } = getPaginationParams(query);
    const where = {
      ...(query.isActive !== undefined && { isActive: query.isActive === 'true' }),
      ...(query.isRestricted !== undefined && { isRestricted: query.isRestricted === 'true' }),
    };

    const [items, total] = await Promise.all([
      prisma.zone.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.zone.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getZone(id) {
    const zone = await prisma.zone.findUnique({ where: { id: parseInt(id) } });
    if (!zone) throw new NotFoundError('Zone');
    return zone;
  }

  static async createZone(data, adminId) {
    const zone = await prisma.zone.create({
      data: {
        ...data,
        createdBy: adminId,
      },
    });
    await logAudit({ userId: adminId, action: 'CREATE_ZONE', entity: 'Zone', entityId: String(zone.id) });
    return zone;
  }

  static async updateZone(id, data, adminId) {
    const zone = await prisma.zone.findUnique({ where: { id: parseInt(id) } });
    if (!zone) throw new NotFoundError('Zone');
    
    const updated = await prisma.zone.update({ where: { id: parseInt(id) }, data });
    await logAudit({ userId: adminId, action: 'UPDATE_ZONE', entity: 'Zone', entityId: String(id) });
    return updated;
  }
}

module.exports = GeofencingService;
