const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const prisma = require('../../config/database');
const ApiResponse = require('../../utils/response');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { ADMIN_ROLES, applyUserOwnedListScope } = require('../../utils/listScope');
const { assertCanAccessDriverRecord } = require('../../utils/recordAccess');

/**
 * @openapi
 * /penalties:
 *   get:
 *     tags: [Penalties]
 *     summary: List penalties
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
 *         name: type
 *         schema: { type: string, enum: [FINANCIAL, WARNING, SUSPENSION, TERMINATION, OTHER] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, APPLIED, APPEALED, CANCELLED] }
 *     responses:
 *       200:
 *         description: Penalties list
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    let where = {
      ...(req.query.type && { type: req.query.type }),
      ...(req.query.status && { status: req.query.status }),
    };
    where = applyUserOwnedListScope(where, req);
    const [items, total] = await Promise.all([
      prisma.penalty.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, fullNameAr: true, identityNumber: true } } },
      }),
      prisma.penalty.count({ where }),
    ]);
    return ApiResponse.paginated(res, items, buildPaginationMeta(total, page, limit));
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /penalties/totals:
 *   get:
 *     tags: [Penalties]
 *     summary: Sum/count of APPLIED penalties (admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Aggregate result
 */
router.get('/totals', ...adminPerm(P.COMPLIANCE_READ), async (req, res, next) => {
  try {
    const result = await prisma.penalty.aggregate({
      _sum: { amount: true },
      _count: true,
      where: { status: 'APPLIED' },
    });
    return ApiResponse.success(res, result);
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /penalties/{id}:
 *   get:
 *     tags: [Penalties]
 *     summary: Get penalty by ID (scoped)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Penalty
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const item = await prisma.penalty.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { user: { select: { id: true, fullNameAr: true, fullNameEn: true } } },
    });
    if (item) await assertCanAccessDriverRecord(req, item.userId);
    return ApiResponse.success(res, item);
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /penalties:
 *   post:
 *     tags: [Penalties]
 *     summary: Create penalty (admin)
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
 *               type: { type: string, enum: [FINANCIAL, WARNING, SUSPENSION, TERMINATION, OTHER] }
 *               amount: { type: number }
 *               penaltyDate: { type: string, format: date }
 *               linkedEntityId: { type: integer }
 *               reason: { type: string }
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', ...adminPerm(P.COMPLIANCE_WRITE), async (req, res, next) => {
  try {
    const data = {
      ...req.body,
      userId: parseInt(req.body.userId, 10),
      amount: req.body.amount ? parseFloat(req.body.amount) : undefined,
      penaltyDate: new Date(req.body.penaltyDate || Date.now()),
      linkedEntityId: req.body.linkedEntityId ? parseInt(req.body.linkedEntityId) : undefined,
      createdBy: req.user.id,
    };
    const item = await prisma.penalty.create({ data });
    await logAudit({ userId: req.user.id, action: 'CREATE_PENALTY', entity: 'Penalty', entityId: String(item.id) });
    return ApiResponse.created(res, item, 'Penalty created');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /penalties/{id}:
 *   put:
 *     tags: [Penalties]
 *     summary: Update penalty (admin)
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
router.put('/:id', ...adminPerm(P.COMPLIANCE_WRITE), async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (data.amount) data.amount = parseFloat(data.amount);
    if (data.userId) data.userId = parseInt(data.userId);
    const item = await prisma.penalty.update({ where: { id: parseInt(req.params.id) }, data });
    return ApiResponse.success(res, item, 'Penalty updated');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /penalties/{id}/status:
 *   patch:
 *     tags: [Penalties]
 *     summary: Update penalty status (admin)
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
 *               status: { type: string, enum: [PENDING, APPLIED, APPEALED, CANCELLED] }
 *     responses:
 *       200:
 *         description: Updated
 */
router.patch('/:id/status', ...adminPerm(P.COMPLIANCE_WRITE), async (req, res, next) => {
  try {
    const updateData = { status: req.body.status };
    if (req.body.status === 'APPLIED') { updateData.approvedBy = req.user.id; updateData.approvedAt = new Date(); }
    const item = await prisma.penalty.update({ where: { id: parseInt(req.params.id) }, data: updateData });
    await logAudit({ userId: req.user.id, action: 'UPDATE_PENALTY_STATUS', entity: 'Penalty', entityId: String(req.params.id) });
    return ApiResponse.success(res, item, 'Penalty status updated');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /penalties/{id}:
 *   delete:
 *     tags: [Penalties]
 *     summary: Delete penalty (admin)
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
router.delete('/:id', ...adminPerm(P.COMPLIANCE_WRITE), async (req, res, next) => {
  try {
    await prisma.penalty.delete({ where: { id: parseInt(req.params.id) } });
    return ApiResponse.success(res, null, 'Penalty deleted');
  } catch (err) { next(err); }
});

module.exports = router;
