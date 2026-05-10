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
  employmentStatus: true,
  transportType: true,
  sevenHundredNumber: true,
  emergencyName: true,
  emergencyRelation: true,
  emergencyPhone: true,
  roomNumber: true,
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
      assetAssignments: true,
      complaints: true,
      adminRequests: true,
    },
  },
};

class UserService {
  static async list(query) {
    const { page, limit, skip } = getPaginationParams(query);
    const orderBy = buildOrderBy(query, ['createdAt', 'fullNameAr', 'fullNameEn', 'identityNumber', 'employeeNumber']);
    const searchFilter = buildSearchFilter(query, ['fullNameAr', 'fullNameEn', 'identityNumber', 'mobileNumber', 'email', 'employeeNumber', 'sevenHundredNumber']);

    const where = {
      deletedAt: null,
      ...searchFilter,
      ...(query.role && { role: query.role }),
      ...(query.accountStatus && { accountStatus: query.accountStatus }),
      ...(query.employmentStatus && { employmentStatus: query.employmentStatus }),
      ...(query.transportType && { transportType: query.transportType }),
      ...(query.cityId && { cityId: parseInt(query.cityId) }),
      ...(query.supervisorId && { supervisorId: parseInt(query.supervisorId) }),
      ...(query.sevenHundredNumber && { sevenHundredNumber: query.sevenHundredNumber }),
      ...(query.roomNumber && { roomNumber: query.roomNumber }),
    };

    // Filter by bank account existence or payment method
    if (query.hasBankAccount === 'true') {
      where.bankAccounts = { some: {} };
    } else if (query.hasBankAccount === 'false') {
      where.bankAccounts = { none: {} };
    }

    // Filter by vehicle assignment
    if (query.hasVehicle === 'true') {
      where.vehicleAssignment = { some: { isActive: true } };
    } else if (query.hasVehicle === 'false') {
      where.vehicleAssignment = { none: { isActive: true } };
    }

    if (query.paymentMethod) {
      where.bankAccounts = {
        ...(where.bankAccounts || {}),
        some: { paymentMethod: query.paymentMethod },
      };
    }

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
    if (existing) throw new ConflictError('رقم الهوية مسجل مسبقاً لمستخدم آخر');

    if (data.mobileNumber) {
      const existingMobile = await prisma.user.findUnique({ where: { mobileNumber: data.mobileNumber } });
      if (existingMobile) throw new ConflictError('رقم الجوال مسجل مسبقاً لمستخدم آخر');
    }

    if (data.email) {
      const existingEmail = await prisma.user.findFirst({ where: { email: data.email, deletedAt: null } });
      if (existingEmail) throw new ConflictError('البريد الإلكتروني مسجل مسبقاً لمستخدم آخر');
    }

    if (data.employeeNumber) {
      const existingEmp = await prisma.user.findUnique({ where: { employeeNumber: data.employeeNumber } });
      if (existingEmp) throw new ConflictError('رقم الموظف مسجل مسبقاً لمستخدم آخر');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const { password, ...rest } = data;

    // Determine if this is an operational user (DRIVER or SUPERVISOR)
    const isOperationalUser = rest.role === 'DRIVER' || rest.role === 'SUPERVISOR';

    // Create user and optionally AppUser in a transaction
    const user = await prisma.user.create({
      data: {
        ...rest,
        passwordHash,
        dateOfBirth: rest.dateOfBirth ? new Date(rest.dateOfBirth) : undefined,
        joinDate: rest.joinDate ? new Date(rest.joinDate) : undefined,
        contractEndDate: rest.contractEndDate ? new Date(rest.contractEndDate) : undefined,
        // If operational user, also create AppUser
        ...(isOperationalUser && {
          appUser: {
            create: {
              appRole: rest.role, // DRIVER or SUPERVISOR
              availabilityStatus: rest.availabilityStatus || 'OFF_DUTY',
              employmentStatus: rest.employmentStatus || 'ON_DUTY',
              transportType: rest.transportType || null,
              sevenHundredNumber: rest.sevenHundredNumber || null,
              roomNumber: rest.roomNumber || null,
              tags: rest.tags || null,
              notes: rest.notes || null,
            }
          }
        }),
      },
      select: {
        ...USER_SELECT,
        appUser: {
          select: {
            id: true,
            appRole: true,
          }
        }
      },
    });

    // Return user with AppUser info merged
    return {
      ...user,
      appUserId: user.appUser?.id || null,
      appRole: user.appUser?.appRole || null,
    };
  }

  static async update(id, data, adminUser) {
    const user = await prisma.user.findFirst({ 
      where: { id: parseInt(id), deletedAt: null },
      include: { appUser: true }
    });
    if (!user) throw new NotFoundError('User');

    if (data.identityNumber && data.identityNumber !== user.identityNumber) {
      const existing = await prisma.user.findUnique({ where: { identityNumber: data.identityNumber } });
      if (existing) throw new ConflictError('رقم الهوية مسجل مسبقاً لمستخدم آخر');
    }

    if (data.mobileNumber && data.mobileNumber !== user.mobileNumber) {
      const existing = await prisma.user.findUnique({ where: { mobileNumber: data.mobileNumber } });
      if (existing) throw new ConflictError('رقم الجوال مسجل مسبقاً لمستخدم آخر');
    }

    if (data.email && data.email !== user.email) {
      const existingEmail = await prisma.user.findFirst({ where: { email: data.email, deletedAt: null } });
      if (existingEmail) throw new ConflictError('البريد الإلكتروني مسجل مسبقاً لمستخدم آخر');
    }

    if (data.employeeNumber && data.employeeNumber !== user.employeeNumber) {
      const existingEmp = await prisma.user.findUnique({ where: { employeeNumber: data.employeeNumber } });
      if (existingEmp) throw new ConflictError('رقم الموظف مسجل مسبقاً لمستخدم آخر');
    }

    const newRole = data.role;
    const wasOperational = user.role === 'DRIVER' || user.role === 'SUPERVISOR';
    const isOperational = newRole === 'DRIVER' || newRole === 'SUPERVISOR';

    const updateData = { ...data };
    if (updateData.dateOfBirth) updateData.dateOfBirth = new Date(updateData.dateOfBirth);
    if (updateData.joinDate) updateData.joinDate = new Date(updateData.joinDate);
    if (updateData.contractEndDate) updateData.contractEndDate = new Date(updateData.contractEndDate);

    // Handle AppUser creation/deletion based on role change
    if (!wasOperational && isOperational) {
      // Creating AppUser for the first time
      updateData.appUser = {
        create: {
          appRole: newRole,
          availabilityStatus: data.availabilityStatus || 'OFF_DUTY',
          employmentStatus: data.employmentStatus || 'ON_DUTY',
          transportType: data.transportType || null,
          sevenHundredNumber: data.sevenHundredNumber || null,
          roomNumber: data.roomNumber || null,
          tags: data.tags || null,
          notes: data.notes || null,
        }
      };
    } else if (wasOperational && !isOperational) {
      // Deleting AppUser when changing to admin role
      updateData.appUser = { delete: true };
    } else if (wasOperational && isOperational) {
      // Updating existing AppUser
      updateData.appUser = {
        update: {
          appRole: newRole,
          availabilityStatus: data.availabilityStatus || user.appUser?.availabilityStatus,
          employmentStatus: data.employmentStatus || user.appUser?.employmentStatus,
          transportType: data.transportType !== undefined ? data.transportType : user.appUser?.transportType,
          sevenHundredNumber: data.sevenHundredNumber !== undefined ? data.sevenHundredNumber : user.appUser?.sevenHundredNumber,
          roomNumber: data.roomNumber !== undefined ? data.roomNumber : user.appUser?.roomNumber,
          tags: data.tags !== undefined ? data.tags : user.appUser?.tags,
          notes: data.notes !== undefined ? data.notes : user.appUser?.notes,
        }
      };
    }

    const updated = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: { appUser: true },
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

    return {
      ...updated,
      appUserId: updated.appUser?.id || null,
      appRole: updated.appUser?.appRole || null,
    };
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
    const user = await prisma.user.findFirst({ 
      where: { id: parseInt(id), deletedAt: null },
      include: { appUser: true }
    });
    if (!user) throw new NotFoundError('User');

    let supervisorAppUserId = null;
    if (supervisorId) {
      const supervisor = await prisma.user.findFirst({
        where: { id: supervisorId, role: 'SUPERVISOR', deletedAt: null },
        include: { appUser: true }
      });
      if (!supervisor) throw new NotFoundError('Supervisor');
      supervisorAppUserId = supervisor.appUser?.id || null;
    }

    // Update both User and AppUser supervisor relationships
    const updateData = { supervisorId };
    if (user.appUser) {
      updateData.appUser = { update: { supervisorId: supervisorAppUserId } };
    }

    const updated = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
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
