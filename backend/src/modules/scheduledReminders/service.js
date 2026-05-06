const prisma = require('../../config/database');
const { NotFoundError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');

class ScheduledReminderService {
  static async list(query) {
    const { page, limit, skip } = getPaginationParams(query);
    const where = {
      ...(query.isResolved !== undefined && { isResolved: query.isResolved === 'true' }),
      ...(query.targetEntity && { targetEntity: query.targetEntity }),
      ...(query.targetId && { targetId: query.targetId }),
    };

    const [items, total] = await Promise.all([
      prisma.scheduledReminder.findMany({
        where, skip, take: limit, orderBy: { dueDate: 'asc' },
      }),
      prisma.scheduledReminder.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(total, page, limit) };
  }

  static async create(data) {
    return prisma.scheduledReminder.create({
      data: {
        type: data.type,
        targetEntity: data.targetEntity,
        targetId: data.targetId,
        dueDate: new Date(data.dueDate),
        notes: data.notes,
      },
    });
  }

  static async update(id, data) {
    const reminder = await prisma.scheduledReminder.findUnique({ where: { id: parseInt(id) } });
    if (!reminder) throw new NotFoundError('ScheduledReminder');

    const updateData = { ...data };
    if (updateData.dueDate) updateData.dueDate = new Date(updateData.dueDate);

    return prisma.scheduledReminder.update({
      where: { id: parseInt(id) },
      data: updateData,
    });
  }

  static async delete(id) {
    const reminder = await prisma.scheduledReminder.findUnique({ where: { id: parseInt(id) } });
    if (!reminder) throw new NotFoundError('ScheduledReminder');

    return prisma.scheduledReminder.delete({ where: { id: parseInt(id) } });
  }
}

module.exports = ScheduledReminderService;
