const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const prisma = require('../../config/database');
const ApiResponse = require('../../utils/response');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { applyUserOwnedListScope } = require('../../utils/listScope');
const { assertCanAccessDriverRecord } = require('../../utils/recordAccess');

/**
 * @openapi
 * /ratings:
 *   get:
 *     tags: [Ratings]
 *     summary: List ratings/evaluations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: userId
 *         schema: { type: integer }
 *       - in: query
 *         name: period
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Ratings list
 */
router.get('/', ...adminPerm(P.FLEET_READ), async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    let where = {
      ...(req.query.period && { period: req.query.period }),
    };
    where = applyUserOwnedListScope(where, req);
    const [items, total] = await Promise.all([
      prisma.rating.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullNameAr: true, identityNumber: true } },
          ratedBy: { select: { id: true, fullNameAr: true } },
        },
      }),
      prisma.rating.count({ where }),
    ]);
    return ApiResponse.paginated(res, items, buildPaginationMeta(total, page, limit));
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /ratings/user/{userId}/average:
 *   get:
 *     tags: [Ratings]
 *     summary: Aggregate average scores for a user (scoped)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: _avg fields and _count
 */
router.get('/user/:userId/average', ...adminPerm(P.FLEET_READ), async (req, res, next) => {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    await assertCanAccessDriverRecord(req, targetUserId);
    const result = await prisma.rating.aggregate({
      _avg: { overallScore: true, punctuality: true, customerHandling: true, communication: true, compliance: true, productivity: true },
      _count: true,
      where: { userId: targetUserId },
    });
    return ApiResponse.success(res, result);
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /ratings/{id}:
 *   get:
 *     tags: [Ratings]
 *     summary: Get rating by ID (scoped)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Rating
 */
router.get('/:id', ...adminPerm(P.FLEET_READ), async (req, res, next) => {
  try {
    const item = await prisma.rating.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { user: { select: { id: true, fullNameAr: true } }, ratedBy: { select: { id: true, fullNameAr: true } } },
    });
    if (item) await assertCanAccessDriverRecord(req, item.userId);
    return ApiResponse.success(res, item);
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /ratings:
 *   post:
 *     tags: [Ratings]
 *     summary: Create performance rating (admin HR/COMPLIANCE)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, overallScore]
 *             properties:
 *               userId: { type: integer }
 *               overallScore: { type: number }
 *               punctuality: { type: number }
 *               customerHandling: { type: number }
 *               communication: { type: number }
 *               compliance: { type: number }
 *               productivity: { type: number }
 *               period: { type: string }
 *               periodStart: { type: string, format: date }
 *               periodEnd: { type: string, format: date }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', ...adminPerm(P.HR_APPROVE, P.COMPLIANCE_WRITE), async (req, res, next) => {
  try {
    const data = {
      ...req.body,
      userId: parseInt(req.body.userId),
      ratedById: req.user.id,
      overallScore: parseFloat(req.body.overallScore),
      punctuality: req.body.punctuality ? parseFloat(req.body.punctuality) : undefined,
      customerHandling: req.body.customerHandling ? parseFloat(req.body.customerHandling) : undefined,
      communication: req.body.communication ? parseFloat(req.body.communication) : undefined,
      compliance: req.body.compliance ? parseFloat(req.body.compliance) : undefined,
      productivity: req.body.productivity ? parseFloat(req.body.productivity) : undefined,
      periodStart: req.body.periodStart ? new Date(req.body.periodStart) : undefined,
      periodEnd: req.body.periodEnd ? new Date(req.body.periodEnd) : undefined,
    };
    const item = await prisma.rating.create({ data });
    return ApiResponse.created(res, item, 'Rating created');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /ratings/{id}:
 *   put:
 *     tags: [Ratings]
 *     summary: Update rating (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/:id', ...adminPerm(P.HR_APPROVE, P.COMPLIANCE_WRITE), async (req, res, next) => {
  try {
    const data = { ...req.body };
    ['overallScore', 'punctuality', 'customerHandling', 'communication', 'compliance', 'productivity'].forEach(f => {
      if (data[f]) data[f] = parseFloat(data[f]);
    });
    if (data.userId) data.userId = parseInt(data.userId);
    const item = await prisma.rating.update({ where: { id: parseInt(req.params.id) }, data });
    return ApiResponse.success(res, item, 'Rating updated');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /ratings/{id}:
 *   delete:
 *     tags: [Ratings]
 *     summary: Delete rating (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/:id', ...adminPerm(P.HR_APPROVE, P.COMPLIANCE_WRITE), async (req, res, next) => {
  try {
    await prisma.rating.delete({ where: { id: parseInt(req.params.id) } });
    return ApiResponse.success(res, null, 'Rating deleted');
  } catch (err) { next(err); }
});

module.exports = router;
