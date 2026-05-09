const prisma = require('../../config/database');
const { NotFoundError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');

class TraineeService {
  static async list(query) {
    const { page, limit, skip } = getPaginationParams(query);
    const where = {
      ...(query.status && { status: query.status }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search } },
          { iqamaNumber: { contains: query.search } },
          { mobileNumber: { contains: query.search } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.trainee.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.trainee.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getById(id) {
    const trainee = await prisma.trainee.findUnique({
      where: { id: parseInt(id) },
      include: {
        licenseTests: { orderBy: { testDate: 'desc' } },
      },
    });
    if (!trainee) throw new NotFoundError('Trainee');
    return trainee;
  }

  static async create(data) {
    return prisma.trainee.create({ data });
  }

  static async update(id, data) {
    const trainee = await prisma.trainee.findUnique({ where: { id: parseInt(id) } });
    if (!trainee) throw new NotFoundError('Trainee');
    
    return prisma.trainee.update({
      where: { id: parseInt(id) },
      data,
    });
  }

  static async delete(id) {
    const trainee = await prisma.trainee.findUnique({ where: { id: parseInt(id) } });
    if (!trainee) throw new NotFoundError('Trainee');
    
    return prisma.trainee.delete({ where: { id: parseInt(id) } });
  }

  /**
   * Automated cron service method: Checks for trainees who passed 30 days and marks them completed.
   */
  static async checkTraineeCompletion() {
    console.log('[Cron] Running checkTraineeCompletion...');
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const pendingTrainees = await prisma.trainee.findMany({
      where: {
        isCompleted: false,
        createdAt: { lte: thirtyDaysAgo }
      }
    });

    if (pendingTrainees.length === 0) return 0;

    let completedCount = 0;
    
    for (const trainee of pendingTrainees) {
      await prisma.trainee.update({
        where: { id: trainee.id },
        data: {
          isCompleted: true,
          rewardIssued: true,
          rewardAmount: trainee.rewardAmount || 500, // Default reward if none set
        }
      });
      completedCount++;
    }

    console.log(`[Cron] checkTraineeCompletion completed. Marked ${completedCount} trainees as completed.`);
    return completedCount;
  }
}

module.exports = TraineeService;
