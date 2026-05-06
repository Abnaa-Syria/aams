const { z } = require('zod');

const createScheduledReminderSchema = z.object({
  body: z.object({
    type: z.string().min(3).max(100),
    targetEntity: z.string().min(3).max(50),
    targetId: z.string().min(1).max(100),
    dueDate: z.string(),
    notes: z.string().optional(),
  }),
});

const updateScheduledReminderSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    isResolved: z.boolean().optional(),
    dueDate: z.string().optional(),
    notes: z.string().optional(),
  }),
});

module.exports = {
  createScheduledReminderSchema,
  updateScheduledReminderSchema,
};
