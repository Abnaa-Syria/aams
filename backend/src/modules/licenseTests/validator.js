const { z } = require('zod');

const createLicenseTestSchema = z.object({
  body: z.object({
    traineeId: z.number().int().positive(),
    testDate: z.string(),
    notes: z.string().optional(),
  }),
});

const updateLicenseTestSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    testDate: z.string().optional(),
    result: z.enum(['PENDING', 'PASSED', 'FAILED']).optional(),
    notes: z.string().optional(),
  }),
});

module.exports = {
  createLicenseTestSchema,
  updateLicenseTestSchema,
};
