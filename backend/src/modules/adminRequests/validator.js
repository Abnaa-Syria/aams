const { z } = require('zod');

const createAdminRequestSchema = z.object({
  body: z.object({
    type: z.enum(['LOAN', 'VACATION', 'SALARY_CERTIFICATE', 'RESIGNATION', 'OTHER']),
    reason: z.string().min(3).max(500),
    notes: z.string().optional(),
  }),
});

const reviewAdminRequestSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']),
    adminNotes: z.string().optional(),
  }),
});

module.exports = {
  createAdminRequestSchema,
  reviewAdminRequestSchema,
};
