const { z } = require('zod');

const createTraineeSchema = z.object({
  body: z.object({
    traineeId: z.coerce.number().int().positive(),
    trainerId: z.coerce.number().int().positive(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    totalDays: z.coerce.number().int().positive().optional(),
    rewardAmount: z.coerce.number().positive().optional(),
    notes: z.string().optional(),
  }),
});

const updateTraineeSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    traineeId: z.coerce.number().int().positive().optional(),
    trainerId: z.coerce.number().int().positive().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    totalDays: z.coerce.number().int().positive().optional(),
    isCompleted: z.boolean().optional(),
    completedAt: z.coerce.date().optional(),
    rewardIssued: z.boolean().optional(),
    rewardAmount: z.coerce.number().positive().optional(),
    notes: z.string().optional(),
  }),
});

module.exports = {
  createTraineeSchema,
  updateTraineeSchema,
};
