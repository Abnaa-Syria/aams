const prisma = require('../../config/database');
const { NotFoundError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta, buildOrderBy, buildSearchFilter } = require('../../utils/pagination');

class SupervisorService {
  static async list(query) {
    const { page, limit, skip } = getPaginationParams(query);
    const orderBy = buildOrderBy(query, ['createdAt', 'fullNameAr']);
    const searchFilter = buildSearchFilter(query, ['fullNameAr', 'fullNameEn', 'identityNumber', 'mobileNumber']);

    // Find users with SUPERVISOR appRole and their AppUser
    const where = { 
      userType: 'APP_USER',
      appUser: { appRole: 'SUPERVISOR' },
      deletedAt: null, 
      ...searchFilter 
    };

    const [supervisors, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, identityNumber: true, fullNameAr: true, fullNameEn: true,
          mobileNumber: true, email: true, accountStatus: true, createdAt: true,
          appUser: { select: { id: true, _count: { select: { assignedDrivers: true } } } },
        },
        skip, take: limit, orderBy,
      }),
      prisma.user.count({ where }),
    ]);

    // Transform to keep response format
    const transformed = supervisors.map(s => ({
      ...s,
      _count: { assignedDrivers: s.appUser?._count?.assignedDrivers || 0 },
    }));

    return { supervisors: transformed, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getById(id) {
    // Find supervisor through AppUser
    const appUser = await prisma.appUser.findFirst({
      where: { 
        userId: parseInt(id),
        appRole: 'SUPERVISOR',
      },
      include: {
        user: {
          select: {
            id: true, identityNumber: true, fullNameAr: true, fullNameEn: true,
            mobileNumber: true, email: true, accountStatus: true, createdAt: true, jobTitle: true,
          }
        },
        assignedDrivers: {
          where: { user: { deletedAt: null } },
          include: { user: { select: { id: true, fullNameAr: true, fullNameEn: true, identityNumber: true, accountStatus: true } } },
        },
      },
    });
    
    if (!appUser) throw new NotFoundError('Supervisor');
    
    return {
      ...appUser.user,
      assignedDrivers: appUser.assignedDrivers.map(d => d.user),
    };
  }

  static async getDrivers(supervisorId, query) {
    const { page, limit, skip } = getPaginationParams(query);
    
    // Get supervisor's AppUser
    const supervisorAppUser = await prisma.appUser.findFirst({
      where: { userId: parseInt(supervisorId), appRole: 'SUPERVISOR' },
    });
    
    if (!supervisorAppUser) throw new NotFoundError('Supervisor');

    const where = { supervisorId: supervisorAppUser.id };

    const [drivers, total] = await Promise.all([
      prisma.appUser.findMany({
        where,
        include: { user: { select: { id: true, fullNameAr: true, fullNameEn: true, identityNumber: true, accountStatus: true, mobileNumber: true } } },
        skip, take: limit,
      }),
      prisma.appUser.count({ where }),
    ]);

    // Transform to keep response format
    const transformed = drivers.map(d => ({
      ...d.user,
      availabilityStatus: d.availabilityStatus,
    }));

    return { drivers: transformed, meta: buildPaginationMeta(total, page, limit) };
  }

  static async assignDrivers(supervisorId, driverIds) {
    // Get supervisor's AppUser
    const supervisorAppUser = await prisma.appUser.findFirst({
      where: { userId: parseInt(supervisorId), appRole: 'SUPERVISOR' },
    });
    
    if (!supervisorAppUser) throw new NotFoundError('Supervisor');

    // Update AppUser supervisor relationships
    await prisma.appUser.updateMany({
      where: { userId: { in: driverIds } },
      data: { supervisorId: supervisorAppUser.id },
    });

    return { assigned: driverIds.length };
  }
}

module.exports = SupervisorService;
