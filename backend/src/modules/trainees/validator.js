const { z } = require('zod');

const createTraineeSchema = z.object({
  body: z.object({
    name: z.string().min(3).max(150),
    mobileNumber: z.string().min(9).max(15),
    iqamaNumber: z.string().length(10),
    notes: z.string().optional(),
  }),
});

const updateTraineeSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    name: z.string().min(3).max(150).optional(),
    mobileNumber: z.string().min(9).max(15).optional(),
    iqamaNumber: z.string().length(10).optional(),
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'HIRED']).optional(),
    notes: z.string().optional(),
  }),
});

module.exports = {
  createTraineeSchema,
  updateTraineeSchema,
};
