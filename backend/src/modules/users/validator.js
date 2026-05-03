const { z } = require('zod');

const listUsersSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    role: z.string().optional(),
    accountStatus: z.string().optional(),
    cityId: z.string().optional(),
    supervisorId: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
  params: z.object({}),
  body: z.object({}).optional(),
});

const createUserSchema = z.object({
  body: z.object({
    identityNumber: z.string().min(1, 'Identity number is required').max(20),
    mobileNumber: z.string().max(20).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    fullNameAr: z.string().min(1, 'Arabic name is required').max(150),
    fullNameEn: z.string().max(150).optional(),
    gender: z.enum(['MALE', 'FEMALE']).optional(),
    dateOfBirth: z.string().optional(),
    nationality: z.string().max(80).optional(),
    role: z.enum(['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'HR_ADMIN', 'FLEET_ADMIN', 'FINANCE_ADMIN', 'SUPERVISOR', 'DRIVER']).optional(),
    accountStatus: z.enum(['ACTIVE', 'TEMPORARILY_SUSPENDED', 'RESTRICTED', 'UNDER_INVESTIGATION', 'PENDING_APPROVAL', 'INCOMPLETE_PROFILE', 'ARCHIVED']).optional(),
    employeeNumber: z.string().max(50).optional(),
    joinDate: z.string().optional(),
    contractEndDate: z.string().optional(),
    jobTitle: z.string().max(100).optional(),
    cityId: z.number().int().optional(),
    supervisorId: z.number().int().optional(),
    tags: z.string().max(500).optional(),
    notes: z.string().optional(),
  }),
  query: z.object({}),
  params: z.object({}),
});

const updateUserSchema = z.object({
  body: z.object({
    mobileNumber: z.string().max(20).optional(),
    email: z.string().email().optional(),
    fullNameAr: z.string().min(1).max(150).optional(),
    fullNameEn: z.string().max(150).optional(),
    gender: z.enum(['MALE', 'FEMALE']).optional(),
    dateOfBirth: z.string().optional(),
    nationality: z.string().max(80).optional(),
    role: z.enum(['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'HR_ADMIN', 'FLEET_ADMIN', 'FINANCE_ADMIN', 'SUPERVISOR', 'DRIVER']).optional(),
    employeeNumber: z.string().max(50).optional(),
    joinDate: z.string().optional(),
    contractEndDate: z.string().optional(),
    jobTitle: z.string().max(100).optional(),
    cityId: z.number().int().nullable().optional(),
    supervisorId: z.number().int().nullable().optional(),
    tags: z.string().max(500).optional(),
    notes: z.string().optional(),
  }),
  params: z.object({ id: z.string() }),
  query: z.object({}),
});

const changeStatusSchema = z.object({
  body: z.object({
    accountStatus: z.enum(['ACTIVE', 'TEMPORARILY_SUSPENDED', 'RESTRICTED', 'UNDER_INVESTIGATION', 'PENDING_APPROVAL', 'INCOMPLETE_PROFILE', 'ARCHIVED']),
    reason: z.string().optional(),
  }),
  params: z.object({ id: z.string() }),
  query: z.object({}),
});

const assignSupervisorSchema = z.object({
  body: z.object({
    supervisorId: z.number().int().nullable(),
  }),
  params: z.object({ id: z.string() }),
  query: z.object({}),
});

const idParamSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({}).optional(),
  query: z.object({}),
});

module.exports = {
  listUsersSchema,
  createUserSchema,
  updateUserSchema,
  changeStatusSchema,
  assignSupervisorSchema,
  idParamSchema,
};
