const { z } = require('zod');

const createComplaintSchema = z.object({
  body: z.object({
    type: z.enum(['FINANCIAL', 'ADMINISTRATIVE', 'TECHNICAL', 'OTHER']),
    title: z.string().min(3).max(150),
    description: z.string().min(10),
  }),
});

const resolveComplaintSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    status: z.enum(['IN_PROGRESS', 'RESOLVED', 'REJECTED']),
    resolutionNotes: z.string().optional(),
  }),
});

module.exports = {
  createComplaintSchema,
  resolveComplaintSchema,
};
