const { z } = require('zod');

const createOilChangeLogSchema = z.object({
  body: z.object({
    vehicleId: z.number().int().positive(),
    odometerAtChange: z.number().int().positive(),
    nextChangeOdometer: z.number().int().positive(),
    cost: z.number().min(0).optional(),
    changeDate: z.string().optional(),
    notes: z.string().optional(),
  }),
});

module.exports = {
  createOilChangeLogSchema,
};
