const prisma = require('../../config/database');
const { NotFoundError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');

class LicenseTestService {
  static async list(query) {
    const { page, limit, skip } = getPaginationParams(query);
    const where = {
      ...(query.result && { result: query.result }),
      ...(query.traineeId && { traineeId: parseInt(query.traineeId) }),
    };

    const [items, total] = await Promise.all([
      prisma.licenseTest.findMany({
        where, skip, take: limit, orderBy: { testDate: 'desc' },
        include: { trainee: { select: { id: true, name: true, iqamaNumber: true } } },
      }),
      prisma.licenseTest.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(total, page, limit) };
  }

  static async getById(id) {
    const licenseTest = await prisma.licenseTest.findUnique({
      where: { id: parseInt(id) },
      include: { trainee: true },
    });
    if (!licenseTest) throw new NotFoundError('LicenseTest');
    return licenseTest;
  }

  static async create(data) {
    // Ensure trainee exists
    const trainee = await prisma.trainee.findUnique({ where: { id: data.traineeId } });
    if (!trainee) throw new NotFoundError('Trainee');

    return prisma.licenseTest.create({
      data: {
        traineeId: data.traineeId,
        testDate: new Date(data.testDate),
        notes: data.notes,
      },
    });
  }

  static async update(id, data) {
    const licenseTest = await prisma.licenseTest.findUnique({ where: { id: parseInt(id) } });
    if (!licenseTest) throw new NotFoundError('LicenseTest');
    
    const updateData = { ...data };
    if (updateData.testDate) updateData.testDate = new Date(updateData.testDate);

    return prisma.licenseTest.update({
      where: { id: parseInt(id) },
      data: updateData,
    });
  }

  static async delete(id) {
    const licenseTest = await prisma.licenseTest.findUnique({ where: { id: parseInt(id) } });
    if (!licenseTest) throw new NotFoundError('LicenseTest');
    
    return prisma.licenseTest.delete({ where: { id: parseInt(id) } });
  }
}

module.exports = LicenseTestService;
