const prisma = require('../../config/database');
const { NotFoundError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta, buildOrderBy, buildSearchFilter } = require('../../utils/pagination');

class SupervisorService {
  static async list(query) {
    const { page, limit, skip } = getPaginationParams(query);
    const orderBy = buildOrderBy(query, ['createdAt', 'fullNameAr']);
    const searchFilter = buildSearchFilter(query, ['fullNameAr', 'fullNameEn', 'identityNumber', 'mobileNumber']);

    const where = { role: 'SUPERVISOR', deletedAt: null, ...searchFilter };

    const [supervisors, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, identityNumber: true, fullNameAr: true, fullNameEn: true,
          mobileNumber: true, email: true, accountStatus: true, createdAt: true,
          _count: { select: { assignedDrivers: true } },
        },
        skip, take: limit, orderBy,
      }),
      prisma.user.count({ where }),
    ]);

    return { supervisors, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getById(id) {
    const supervisor = await prisma.user.findFirst({
      where: { id: parseInt(id), role: 'SUPERVISOR', deletedAt: null },
      select: {
        id: true, identityNumber: true, fullNameAr: true, fullNameEn: true,
        mobileNumber: true, email: true, accountStatus: true, createdAt: true, jobTitle: true,
        assignedDrivers: {
          where: { deletedAt: null },
          select: { id: true, fullNameAr: true, fullNameEn: true, identityNumber: true, accountStatus: true },
        },
      },
    });
    if (!supervisor) throw new NotFoundError('Supervisor');
    return supervisor;
  }

  static async getDrivers(supervisorId, query) {
    const { page, limit, skip } = getPaginationParams(query);
    const where = { supervisorId: parseInt(supervisorId), deletedAt: null };

    const [drivers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, fullNameAr: true, fullNameEn: true, identityNumber: true,
          mobileNumber: true, accountStatus: true, availabilityStatus: true,
        },
        skip, take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return { drivers, meta: buildPaginationMeta(total, page, limit) };
  }

  static async assignDrivers(supervisorId, driverIds) {
    const supervisor = await prisma.user.findFirst({
      where: { id: parseInt(supervisorId), role: 'SUPERVISOR', deletedAt: null },
    });
    if (!supervisor) throw new NotFoundError('Supervisor');

    await prisma.user.updateMany({
      where: { id: { in: driverIds } },
      data: { supervisorId: parseInt(supervisorId) },
    });

    return { assigned: driverIds.length };
  }
}

module.exports = SupervisorService;
