const { z } = require('zod');

const createVehicleSwapSchema = z.object({
  body: z.object({
    shiftId: z.number().int().positive(),
    currentVehicleId: z.number().int().positive(),
    requestedVehicleId: z.number().int().positive().optional(),
    reason: z.string().min(5),
  }),
});

const reviewVehicleSwapSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    status: z.enum(['APPROVED', 'REJECTED']),
    assignedVehicleId: z.number().int().positive().optional(), // In case admin assigns a different vehicle than requested
    notes: z.string().optional(),
  }),
});

module.exports = {
  createVehicleSwapSchema,
  reviewVehicleSwapSchema,
};
