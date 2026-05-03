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
 * /salary-advances:
 *   get:
 *     tags: [Salary Advances]
 *     summary: List salary advance requests
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
 *         schema: { type: string, enum: [PENDING, APPROVED, REJECTED, CANCELLED] }
 *     responses:
 *       200:
 *         description: Salary advances list
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    let where = {
      ...(req.query.status && { status: req.query.status }),
    };
    where = applyUserOwnedListScope(where, req);
    const [items, total] = await Promise.all([
      prisma.salaryAdvance.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, fullNameAr: true, identityNumber: true } } },
      }),
      prisma.salaryAdvance.count({ where }),
    ]);
    return ApiResponse.paginated(res, items, buildPaginationMeta(total, page, limit));
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /salary-advances/{id}:
 *   get:
 *     tags: [Salary Advances]
 *     summary: Get salary advance by ID (scoped)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Salary advance
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const item = await prisma.salaryAdvance.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { user: { select: { id: true, fullNameAr: true, fullNameEn: true } } },
    });
    if (item) await assertCanAccessDriverRecord(req, item.userId);
    return ApiResponse.success(res, item);
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /salary-advances:
 *   post:
 *     tags: [Salary Advances]
 *     summary: Request salary advance
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount: { type: number }
 *               reason: { type: string }
 *               notes: { type: string }
 *               userId: { type: integer, description: Admin only }
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    let uid = req.body.userId ? parseInt(req.body.userId, 10) : req.user.id;
    if (!ADMIN_ROLES.has(req.user.role)) uid = req.user.id;
    const data = {
      userId: uid,
      amount: parseFloat(req.body.amount),
      reason: req.body.reason,
      notes: req.body.notes,
    };
    const item = await prisma.salaryAdvance.create({ data });
    return ApiResponse.created(res, item, 'Salary advance requested');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /salary-advances/{id}/review:
 *   patch:
 *     tags: [Salary Advances]
 *     summary: Finance review (admin)
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
 *               status: { type: string, enum: [PENDING, APPROVED, REJECTED, CANCELLED] }
 *               reviewNotes: { type: string }
 *               financeNotes: { type: string }
 *     responses:
 *       200:
 *         description: Reviewed
 */
router.patch('/:id/review', ...adminPerm(P.FINANCE_APPROVE), async (req, res, next) => {
  try {
    const item = await prisma.salaryAdvance.update({
      where: { id: parseInt(req.params.id) },
      data: {
        status: req.body.status,
        reviewedBy: req.user.id, reviewedAt: new Date(),
        reviewNotes: req.body.reviewNotes, financeNotes: req.body.financeNotes,
      },
    });
    await logAudit({ userId: req.user.id, action: 'REVIEW_SALARY_ADVANCE', entity: 'SalaryAdvance', entityId: String(req.params.id) });
    return ApiResponse.success(res, item, 'Salary advance reviewed');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /salary-advances/{id}:
 *   delete:
 *     tags: [Salary Advances]
 *     summary: Cancel request (scoped)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Cancelled
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const existing = await prisma.salaryAdvance.findUnique({ where: { id: parseInt(req.params.id) } });
    if (existing) await assertCanAccessDriverRecord(req, existing.userId);
    await prisma.salaryAdvance.update({ where: { id: parseInt(req.params.id) }, data: { status: 'CANCELLED' } });
    return ApiResponse.success(res, null, 'Salary advance cancelled');
  } catch (err) { next(err); }
});

module.exports = router;
