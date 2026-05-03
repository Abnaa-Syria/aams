const prisma = require('../../config/database');
const bcrypt = require('bcryptjs');
const { NotFoundError, ConflictError, BusinessLogicError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta, buildOrderBy, buildSearchFilter } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');

const USER_SELECT = {
  id: true,
  identityNumber: true,
  mobileNumber: true,
  email: true,
  fullNameAr: true,
  fullNameEn: true,
  gender: true,
  dateOfBirth: true,
  nationality: true,
  profileImageUrl: true,
  role: true,
  accountStatus: true,
  availabilityStatus: true,
  employeeNumber: true,
  joinDate: true,
  contractEndDate: true,
  jobTitle: true,
  cityId: true,
  supervisorId: true,
  tags: true,
  notes: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  city: { select: { id: true, nameAr: true, nameEn: true } },
  supervisor: { select: { id: true, fullNameAr: true, fullNameEn: true } },
};

const USER_DETAIL_SELECT = {
  ...USER_SELECT,
  _count: {
    select: {
      documents: true,
      licenses: true,
      bankAccounts: true,
      platformAccounts: true,
      shifts: true,
      violations: true,
      incidents: true,
      penalties: true,
      rewards: true,
      leaveRequests: true,
    },
  },
};

class UserService {
  static async list(query) {
    const { page, limit, skip } = getPaginationParams(query);
    const orderBy = buildOrderBy(query, ['createdAt', 'fullNameAr', 'fullNameEn', 'identityNumber', 'employeeNumber']);
    const searchFilter = buildSearchFilter(query, ['fullNameAr', 'fullNameEn', 'identityNumber', 'mobileNumber', 'email', 'employeeNumber']);

    const where = {
      deletedAt: null,
      ...searchFilter,
      ...(query.role && { role: query.role }),
      ...(query.accountStatus && { accountStatus: query.accountStatus }),
      ...(query.cityId && { cityId: parseInt(query.cityId) }),
      ...(query.supervisorId && { supervisorId: parseInt(query.supervisorId) }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, select: USER_SELECT, skip, take: limit, orderBy }),
      prisma.user.count({ where }),
    ]);

    return { users, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getById(id) {
    const user = await prisma.user.findFirst({
      where: { id: parseInt(id), deletedAt: null },
      select: USER_DETAIL_SELECT,
    });
    if (!user) throw new NotFoundError('User');
    return user;
  }

  static async create(data) {
    const existing = await prisma.user.findUnique({ where: { identityNumber: data.identityNumber } });
    if (existing) throw new ConflictError('Identity number already exists');

    if (data.mobileNumber) {
      const existingMobile = await prisma.user.findUnique({ where: { mobileNumber: data.mobileNumber } });
      if (existingMobile) throw new ConflictError('Mobile number already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const { password, ...rest } = data;

    const user = await prisma.user.create({
      data: {
        ...rest,
        passwordHash,
        dateOfBirth: rest.dateOfBirth ? new Date(rest.dateOfBirth) : undefined,
        joinDate: rest.joinDate ? new Date(rest.joinDate) : undefined,
        contractEndDate: rest.contractEndDate ? new Date(rest.contractEndDate) : undefined,
      },
      select: USER_SELECT,
    });

    return user;
  }

  static async update(id, data, adminUser) {
    const user = await prisma.user.findFirst({ where: { id: parseInt(id), deletedAt: null } });
    if (!user) throw new NotFoundError('User');

    const updateData = { ...data };
    if (updateData.dateOfBirth) updateData.dateOfBirth = new Date(updateData.dateOfBirth);
    if (updateData.joinDate) updateData.joinDate = new Date(updateData.joinDate);
    if (updateData.contractEndDate) updateData.contractEndDate = new Date(updateData.contractEndDate);

    const updated = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: USER_SELECT,
    });

    await logAudit({
      userId: adminUser.id,
      action: 'UPDATE_USER',
      entity: 'User',
      entityId: id,
      oldValue: user,
      newValue: updated,
    });

    return updated;
  }

  static async changeStatus(id, accountStatus, reason, adminUser) {
    const user = await prisma.user.findFirst({ where: { id: parseInt(id), deletedAt: null } });
    if (!user) throw new NotFoundError('User');

    const oldStatus = user.accountStatus;
    const updated = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { accountStatus },
      select: USER_SELECT,
    });

    await logAudit({
      userId: adminUser.id,
      action: 'CHANGE_USER_STATUS',
      entity: 'User',
      entityId: id,
      oldValue: { accountStatus: oldStatus },
      newValue: { accountStatus, reason },
    });

    return updated;
  }

  static async assignSupervisor(id, supervisorId, adminUser) {
    const user = await prisma.user.findFirst({ where: { id: parseInt(id), deletedAt: null } });
    if (!user) throw new NotFoundError('User');

    if (supervisorId) {
      const supervisor = await prisma.user.findFirst({
        where: { id: supervisorId, role: 'SUPERVISOR', deletedAt: null },
      });
      if (!supervisor) throw new NotFoundError('Supervisor');
    }

    const updated = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { supervisorId },
      select: USER_SELECT,
    });

    await logAudit({
      userId: adminUser.id,
      action: 'ASSIGN_SUPERVISOR',
      entity: 'User',
      entityId: id,
      oldValue: { supervisorId: user.supervisorId },
      newValue: { supervisorId },
    });

    return updated;
  }

  static async softDelete(id, adminUser) {
    const user = await prisma.user.findFirst({ where: { id: parseInt(id), deletedAt: null } });
    if (!user) throw new NotFoundError('User');

    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { deletedAt: new Date(), accountStatus: 'ARCHIVED' },
    });

    await logAudit({
      userId: adminUser.id,
      action: 'DELETE_USER',
      entity: 'User',
      entityId: id,
    });
  }
}

module.exports = UserService;
