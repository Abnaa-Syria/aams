const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const prisma = require('../../config/database');
const ApiResponse = require('../../utils/response');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { applyUserOwnedListScope } = require('../../utils/listScope');
const { assertCanAccessDriverRecord } = require('../../utils/recordAccess');

/**
 * @openapi
 * /rewards:
 *   get:
 *     tags: [Rewards]
 *     summary: List rewards
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
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Rewards list
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    let where = {
      ...(req.query.status && { status: req.query.status }),
      ...(req.query.category && { category: req.query.category }),
    };
    where = applyUserOwnedListScope(where, req);
    const [items, total] = await Promise.all([
      prisma.reward.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, fullNameAr: true, identityNumber: true } } },
      }),
      prisma.reward.count({ where }),
    ]);
    return ApiResponse.paginated(res, items, buildPaginationMeta(total, page, limit));
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /rewards/summary:
 *   get:
 *     tags: [Rewards]
 *     summary: Approved rewards totals (admin HR)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Aggregate
 */
router.get('/summary', ...adminPerm(P.HR_READ, P.HR_APPROVE), async (req, res, next) => {
  try {
    const result = await prisma.reward.aggregate({ _sum: { amount: true, points: true }, _count: true, where: { status: 'APPROVED' } });
    return ApiResponse.success(res, result);
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /rewards/{id}:
 *   get:
 *     tags: [Rewards]
 *     summary: Get reward by ID (scoped)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Reward
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const item = await prisma.reward.findUnique({ where: { id: parseInt(req.params.id) }, include: { user: { select: { id: true, fullNameAr: true } } } });
    if (item) await assertCanAccessDriverRecord(req, item.userId);
    return ApiResponse.success(res, item);
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /rewards:
 *   post:
 *     tags: [Rewards]
 *     summary: Create reward (admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId: { type: integer }
 *               amount: { type: number }
 *               points: { type: integer }
 *               category: { type: string }
 *               status: { type: string }
 *               periodStart: { type: string, format: date }
 *               periodEnd: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', ...adminPerm(P.HR_APPROVE), async (req, res, next) => {
  try {
    const data = {
      ...req.body,
      userId: parseInt(req.body.userId, 10),
      amount: req.body.amount ? parseFloat(req.body.amount) : undefined,
      points: req.body.points ? parseInt(req.body.points) : undefined,
      periodStart: req.body.periodStart ? new Date(req.body.periodStart) : undefined,
      periodEnd: req.body.periodEnd ? new Date(req.body.periodEnd) : undefined,
      createdBy: req.user.id,
    };
    const item = await prisma.reward.create({ data });
    await logAudit({ userId: req.user.id, action: 'CREATE_REWARD', entity: 'Reward', entityId: String(item.id) });
    return ApiResponse.created(res, item, 'Reward created');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /rewards/{id}/status:
 *   patch:
 *     tags: [Rewards]
 *     summary: Approve/reject reward (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string }
 *     responses:
 *       200:
 *         description: Updated
 */
router.patch('/:id/status', ...adminPerm(P.HR_APPROVE), async (req, res, next) => {
  try {
    const updateData = { status: req.body.status };
    if (req.body.status === 'APPROVED') { updateData.approvedBy = req.user.id; updateData.approvedAt = new Date(); }
    const item = await prisma.reward.update({ where: { id: parseInt(req.params.id) }, data: updateData });
    return ApiResponse.success(res, item, 'Reward status updated');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /rewards/{id}:
 *   delete:
 *     tags: [Rewards]
 *     summary: Delete reward (admin)
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
router.delete('/:id', ...adminPerm(P.HR_APPROVE), async (req, res, next) => {
  try {
    await prisma.reward.delete({ where: { id: parseInt(req.params.id) } });
    return ApiResponse.success(res, null, 'Reward deleted');
  } catch (err) { next(err); }
});

module.exports = router;
