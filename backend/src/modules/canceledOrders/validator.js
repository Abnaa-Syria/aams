const { z } = require('zod');

const reportCanceledOrderSchema = z.object({
  body: z.object({
    shiftId: z.number().int().positive(),
    platformAccountId: z.number().int().positive(),
    orderId: z.string().min(1).max(100),
    reason: z.string().min(3),
    amountLoss: z.number().min(0).optional(),
  }),
});

module.exports = {
  reportCanceledOrderSchema,
};
