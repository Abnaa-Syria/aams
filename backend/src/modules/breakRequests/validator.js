const { z } = require('zod');

const createBreakRequestSchema = z.object({
  body: z.object({
    shiftId: z.number().int().positive(),
    requestedDurationMinutes: z.number().int().positive(),
    reason: z.string().optional(),
  }),
});

const reviewBreakRequestSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    status: z.enum(['APPROVED', 'REJECTED']),
  }),
});

module.exports = {
  createBreakRequestSchema,
  reviewBreakRequestSchema,
};
