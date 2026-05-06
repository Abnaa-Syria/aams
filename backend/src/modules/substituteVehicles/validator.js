const { z } = require('zod');

const assignSubstituteVehicleSchema = z.object({
  body: z.object({
    userId: z.number().int().positive(),
    vehicleId: z.number().int().positive(),
    reason: z.string().min(3),
    notes: z.string().optional(),
  }),
});

const returnSubstituteVehicleSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    notes: z.string().optional(),
  }),
});

module.exports = {
  assignSubstituteVehicleSchema,
  returnSubstituteVehicleSchema,
};
