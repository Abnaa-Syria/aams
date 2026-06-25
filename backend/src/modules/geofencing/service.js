const prisma = require('../../config/database');
const { NotFoundError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { mergeAppUserIdFilter } = require('../../utils/driverIdentity');
const { isInsideBoundary } = require('../../utils/pointInPolygon');
const { dispatchNotification, notifyAdminsAndSupervisors } = require('../../services/notificationDispatcher');

/** userId -> zoneId last known inside */
const userZoneState = new Map();

class GeofencingService {
  static async checkZoneBreaches(userId, latitude, longitude) {
    const zones = await prisma.zone.findMany({ where: { isActive: true } });
    const lat = Number(latitude);
    const lng = Number(longitude);
    const prevZoneId = userZoneState.get(userId);
    let currentRestrictedZone = null;

    for (const zone of zones) {
      const inside = isInsideBoundary(lat, lng, zone.boundary);
      if (!inside) continue;
      if (zone.isRestricted) currentRestrictedZone = zone;
    }

    const currentKey = currentRestrictedZone?.id || null;
    if (prevZoneId !== currentKey) {
      userZoneState.set(userId, currentKey);
      if (currentRestrictedZone) {
        const title = 'تنبيه منطقة محظورة';
        const body = currentRestrictedZone.alertMessage
          || `دخلت منطقة محظورة: ${currentRestrictedZone.nameAr}`;
        await dispatchNotification({
          userId,
          title,
          body,
          category: 'ALERT',
          metadata: { zoneId: currentRestrictedZone.id, lat, lng },
        });
        await notifyAdminsAndSupervisors({
          title: `خروج سائق عن المنطقة — ${currentRestrictedZone.nameAr}`,
          body,
          category: 'ALERT',
          metadata: { userId, zoneId: currentRestrictedZone.id },
        });
      }
    }
  }

  static async logLocation(userId, data) {
    const uid = parseInt(userId, 10);
    const activeShift = await prisma.shift.findFirst({
      where: { userId: uid, status: 'ACTIVE' },
      select: { id: true },
    });

    const record = await prisma.locationHistory.create({
      data: {
        userId: uid,
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        speed: data.speed,
        heading: data.heading,
        recordedAt: data.recordedAt ? new Date(data.recordedAt) : new Date(),
      },
    });

    if (activeShift) {
      await prisma.shift.update({
        where: { id: activeShift.id },
        data: {
          lastLat: data.latitude,
          lastLng: data.longitude,
          lastLocationAt: new Date(),
        },
      });
    }

    await GeofencingService.checkZoneBreaches(uid, data.latitude, data.longitude);
    return record;
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
