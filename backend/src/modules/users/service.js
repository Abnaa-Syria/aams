const prisma = require('../../config/database');
const bcrypt = require('bcryptjs');
const { NotFoundError, ConflictError, BusinessLogicError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta, buildOrderBy, buildSearchFilter } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { assertCanAccessDriverRecord } = require('../../utils/recordAccess');

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
  deletedAt: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  appUser: {
    select: {
      id: true,
      appRole: true,
      availabilityStatus: true,
      employmentStatus: true,
      transportType: true,
      sevenHundredNumber: true,
      roomNumber: true,
      tags: true,
      notes: true,
      supervisorId: true,
      supervisor: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              fullNameAr: true,
              fullNameEn: true
            }
          }
        }
      }
    }
  },
  cityId: true,
  regionId: true,
  branchId: true,
  city: {
    select: {
      id: true,
      nameAr: true,
      nameEn: true
    }
  }
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
  static async list(query, currentUser = null) {
    const { page, limit, skip } = getPaginationParams(query);
    const orderBy = buildOrderBy(query, ['createdAt', 'fullNameAr', 'fullNameEn', 'identityNumber', 'employeeNumber']);
    const searchFilter = buildSearchFilter(query, ['fullNameAr', 'fullNameEn', 'identityNumber', 'mobileNumber', 'email', 'employeeNumber', 'sevenHundredNumber']);

    const deletedFilter = query.deletedOnly === 'true' || query.accountStatus === 'ARCHIVED'
      ? { deletedAt: { not: { equals: null } } }
      : query.includeDeleted === 'true'
        ? {}
        : { deletedAt: null };

    const where = {
      ...deletedFilter,
      ...searchFilter,
      ...(query.accountStatus && { accountStatus: query.accountStatus }),
    };

    if (currentUser?.appRole === 'SUPERVISOR') {
      where.userType = 'APP_USER';
      where.appUser = {
        ...(where.appUser || {}),
        supervisorId: currentUser.appUserId,
        appRole: 'DRIVER',
      };
    }

    // Correctly handle role filtering based on new architecture
    if (query.role) {
      if (['DRIVER', 'SUPERVISOR'].includes(query.role)) {
        where.userType = 'APP_USER';
        where.appUser = { appRole: query.role };
      } else {
        where.userType = 'ADMIN';
        where.role = query.role;
      }
    }

    if (query.userType) {
      where.userType = query.userType;
    }

    // Operational fields are now on appUser
    if (query.employmentStatus || query.transportType || query.supervisorId || query.sevenHundredNumber || query.roomNumber) {
      where.appUser = {
        ...(where.appUser || {}),
        ...(query.employmentStatus && { employmentStatus: query.employmentStatus }),
        ...(query.transportType && { transportType: query.transportType }),
        ...(query.supervisorId && { supervisorId: parseInt(query.supervisorId) }),
        ...(query.sevenHundredNumber && { sevenHundredNumber: query.sevenHundredNumber }),
        ...(query.roomNumber && { roomNumber: query.roomNumber }),
      };
    }

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

    // Transform to maintain backward compatibility with frontend
    const transformedUsers = users.map(u => {
      const { appUser, ...rest } = u;
      return {
        ...rest,
        appUserId: appUser?.id || null,
        appRole: appUser?.appRole || null,
        availabilityStatus: appUser?.availabilityStatus || 'OFF_DUTY',
        employmentStatus: appUser?.employmentStatus || 'ON_DUTY',
        supervisorId: appUser?.supervisorId || null,
        supervisor: appUser?.supervisor?.user || null,
        // Carry forward other appUser fields if needed
        transportType: appUser?.transportType || null,
        roomNumber: appUser?.roomNumber || null,
      };
    });

    return { users: transformedUsers, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getById(id, currentUser = null) {
    const user = await prisma.user.findFirst({
      where: { id: parseInt(id), deletedAt: null },
      select: USER_DETAIL_SELECT,
    });
    if (!user) throw new NotFoundError('User');

    if (currentUser?.appRole === 'SUPERVISOR') {
      await assertCanAccessDriverRecord(currentUser, user.id);
    }
    const { appUser, ...rest } = user;
    return {
      ...rest,
      appUserId: appUser?.id || null,
      appRole: appUser?.appRole || null,
      availabilityStatus: appUser?.availabilityStatus || 'OFF_DUTY',
      employmentStatus: appUser?.employmentStatus || 'ON_DUTY',
      supervisorId: appUser?.supervisorId || null,
      supervisor: appUser?.supervisor?.user || null,
      transportType: appUser?.transportType || null,
      roomNumber: appUser?.roomNumber || null,
      sevenHundredNumber: appUser?.sevenHundredNumber || null,
      tags: appUser?.tags || null,
      notes: appUser?.notes || null,
    };
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
    const { password, role: inputRole, ...rest } = data;

    // Determine if this is an operational user (DRIVER or SUPERVISOR)
    const isOperationalUser = inputRole === 'DRIVER' || inputRole === 'SUPERVISOR';
    const userType = isOperationalUser ? 'APP_USER' : 'ADMIN';
    const role = isOperationalUser ? null : inputRole;

    let supervisorAppUserId = null;
    if (rest.supervisorId) {
      const supervisor = await prisma.appUser.findFirst({
        where: { userId: parseInt(rest.supervisorId), appRole: 'SUPERVISOR' }
      });
      if (supervisor) supervisorAppUserId = supervisor.id;
    }

    // Create user and optionally AppUser in a transaction
    const user = await prisma.user.create({
      data: {
        ...rest,
        userType,
        role,
        supervisorId: rest.supervisorId ? parseInt(rest.supervisorId) : null,
        passwordHash,
        dateOfBirth: rest.dateOfBirth ? new Date(rest.dateOfBirth) : undefined,
        // If operational user, also create AppUser
        ...(isOperationalUser && {
          appUser: {
            create: {
              appRole: inputRole, // DRIVER or SUPERVISOR
              availabilityStatus: rest.availabilityStatus || 'OFF_DUTY',
              employmentStatus: rest.employmentStatus || 'ON_DUTY',
              transportType: rest.transportType || null,
              sevenHundredNumber: rest.sevenHundredNumber || null,
              roomNumber: rest.roomNumber || null,
              tags: rest.tags || null,
              notes: rest.notes || null,
              supervisorId: supervisorAppUserId,
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

    const inputRole = data.role;
    const wasOperational = user.userType === 'APP_USER';
    const isOperational = inputRole === 'DRIVER' || inputRole === 'SUPERVISOR';

    const updateData = { ...data };
    if (updateData.dateOfBirth) updateData.dateOfBirth = new Date(updateData.dateOfBirth);

    if (inputRole !== undefined) {
      updateData.userType = isOperational ? 'APP_USER' : 'ADMIN';
      updateData.role = isOperational ? null : inputRole;
    }

    let supervisorAppUserId = undefined;
    if (data.supervisorId !== undefined) {
      if (data.supervisorId) {
        const supervisor = await prisma.appUser.findFirst({
          where: { userId: parseInt(data.supervisorId), appRole: 'SUPERVISOR' }
        });
        supervisorAppUserId = supervisor ? supervisor.id : null;
      } else {
        supervisorAppUserId = null;
      }
    }

    // Handle AppUser creation/deletion based on role change
    if (!wasOperational && isOperational) {
      // Creating AppUser for the first time
      updateData.appUser = {
        create: {
          appRole: inputRole,
          availabilityStatus: data.availabilityStatus || 'OFF_DUTY',
          employmentStatus: data.employmentStatus || 'ON_DUTY',
          transportType: data.transportType || null,
          sevenHundredNumber: data.sevenHundredNumber || null,
          roomNumber: data.roomNumber || null,
          tags: data.tags || null,
          notes: data.notes || null,
          supervisorId: supervisorAppUserId !== undefined ? supervisorAppUserId : null,
        }
      };
    } else if (wasOperational && !isOperational) {
      // Deleting AppUser when changing to admin role
      updateData.appUser = { delete: true };
    } else if (wasOperational && isOperational) {
      // Updating existing AppUser
      updateData.appUser = {
        update: {
          ...(inputRole && { appRole: inputRole }),
          availabilityStatus: data.availabilityStatus || user.appUser?.availabilityStatus,
          employmentStatus: data.employmentStatus || user.appUser?.employmentStatus,
          transportType: data.transportType !== undefined ? data.transportType : user.appUser?.transportType,
          sevenHundredNumber: data.sevenHundredNumber !== undefined ? data.sevenHundredNumber : user.appUser?.sevenHundredNumber,
          roomNumber: data.roomNumber !== undefined ? data.roomNumber : user.appUser?.roomNumber,
          tags: data.tags !== undefined ? data.tags : user.appUser?.tags,
          notes: data.notes !== undefined ? data.notes : user.appUser?.notes,
          supervisorId: supervisorAppUserId !== undefined ? supervisorAppUserId : user.appUser?.supervisorId,
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
        where: { 
          id: supervisorId, 
          userType: 'APP_USER',
          appUser: { appRole: 'SUPERVISOR' },
          deletedAt: null 
        },
        include: { appUser: true }
      });
      if (!supervisor) throw new NotFoundError('Supervisor');
      supervisorAppUserId = supervisor.appUser?.id || null;
    }

    // Update AppUser supervisor relationships
    const updateData = {};
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

  static async restore(id, adminUser) {
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!user) throw new NotFoundError('User');

    if (!user.deletedAt && user.accountStatus !== 'ARCHIVED') {
      return prisma.user.findUnique({ where: { id: parseInt(id) }, select: USER_SELECT });
    }

    const restored = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { deletedAt: null, accountStatus: 'ACTIVE' },
      select: USER_SELECT,
    });

    await logAudit({
      userId: adminUser.id,
      action: 'RESTORE_USER',
      entity: 'User',
      entityId: id,
      oldValue: { deletedAt: user.deletedAt, accountStatus: user.accountStatus },
      newValue: { deletedAt: null, accountStatus: 'ACTIVE' },
    });

    return restored;
  }
}

module.exports = UserService;
