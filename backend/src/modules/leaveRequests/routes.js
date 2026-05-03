const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const upload = require('../../utils/upload');
const prisma = require('../../config/database');
const ApiResponse = require('../../utils/response');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { ADMIN_ROLES, applyUserOwnedListScope } = require('../../utils/listScope');
const { assertCanAccessDriverRecord } = require('../../utils/recordAccess');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');

/**
 * @openapi
 * /leave-requests:
 *   get:
 *     tags: [Leave]
 *     summary: List leave requests
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
 *       - in: query
 *         name: leaveType
 *         schema: { type: string, enum: [ANNUAL, SICK, EMERGENCY, UNPAID, OTHER] }
 *     responses:
 *       200:
 *         description: Leave requests list
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    let where = {
      ...(req.query.status && { status: req.query.status }),
      ...(req.query.leaveType && { leaveType: req.query.leaveType }),
    };
    where = applyUserOwnedListScope(where, req);
    const [items, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, fullNameAr: true, identityNumber: true } } },
      }),
      prisma.leaveRequest.count({ where }),
    ]);
    return ApiResponse.paginated(res, items, buildPaginationMeta(total, page, limit));
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /leave-requests/balances/{userId}:
 *   get:
 *     tags: [Leave]
 *     summary: Leave balances for current year (scoped)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Balances array
 */
router.get('/balances/:userId', authenticate, async (req, res, next) => {
  try {
    const uid = parseInt(req.params.userId, 10);
    await assertCanAccessDriverRecord(req, uid);
    const balances = await prisma.leaveBalance.findMany({
      where: { userId: uid, year: new Date().getFullYear() },
    });
    return ApiResponse.success(res, balances);
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /leave-requests/{id}:
 *   get:
 *     tags: [Leave]
 *     summary: Get leave request (scoped)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Leave request
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const item = await prisma.leaveRequest.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { user: { select: { id: true, fullNameAr: true, fullNameEn: true } } },
    });
    if (item) await assertCanAccessDriverRecord(req, item.userId);
    return ApiResponse.success(res, item);
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /leave-requests:
 *   post:
 *     tags: [Leave]
 *     summary: Submit leave request (multipart attachment optional)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [leaveType, startDate, endDate]
 *             properties:
 *               leaveType: { type: string, enum: [ANNUAL, SICK, EMERGENCY, UNPAID, OTHER] }
 *               startDate: { type: string, format: date }
 *               endDate: { type: string, format: date }
 *               reason: { type: string }
 *               userId: { type: integer }
 *               attachment: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', authenticate, upload.single('attachment'), async (req, res, next) => {
  try {
    const startDate = new Date(req.body.startDate);
    const endDate = new Date(req.body.endDate);
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    let uid = req.body.userId ? parseInt(req.body.userId, 10) : req.user.id;
    if (!ADMIN_ROLES.has(req.user.role)) uid = req.user.id;
    const data = {
      userId: uid,
      leaveType: req.body.leaveType,
      startDate, endDate, totalDays,
      reason: req.body.reason,
    };
    if (req.file) data.attachmentUrl = normalizeStoredUploadPath(req.file.path);
    const item = await prisma.leaveRequest.create({ data });
    return ApiResponse.created(res, item, 'Leave request submitted');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /leave-requests/{id}/review:
 *   patch:
 *     tags: [Leave]
 *     summary: Approve/reject leave (admin HR)
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
 *     responses:
 *       200:
 *         description: Reviewed
 */
router.patch('/:id/review', ...adminPerm(P.HR_APPROVE), async (req, res, next) => {
  try {
    const leaveReq = await prisma.leaveRequest.findUnique({ where: { id: parseInt(req.params.id) } });

    const item = await prisma.leaveRequest.update({
      where: { id: parseInt(req.params.id) },
      data: { status: req.body.status, reviewedBy: req.user.id, reviewedAt: new Date(), reviewNotes: req.body.reviewNotes },
    });

    // Update leave balance if approved
    if (req.body.status === 'APPROVED' && leaveReq) {
      const year = new Date().getFullYear();
      await prisma.leaveBalance.upsert({
        where: { userId_leaveType_year: { userId: leaveReq.userId, leaveType: leaveReq.leaveType, year } },
        create: { userId: leaveReq.userId, leaveType: leaveReq.leaveType, year, totalDays: 30, usedDays: leaveReq.totalDays, remainingDays: 30 - leaveReq.totalDays },
        update: { usedDays: { increment: leaveReq.totalDays }, remainingDays: { decrement: leaveReq.totalDays } },
      });
      await prisma.user.update({ where: { id: leaveReq.userId }, data: { availabilityStatus: 'ON_LEAVE' } });
    }

    await logAudit({ userId: req.user.id, action: 'REVIEW_LEAVE_REQUEST', entity: 'LeaveRequest', entityId: String(req.params.id) });
    return ApiResponse.success(res, item, 'Leave request reviewed');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /leave-requests/{id}:
 *   delete:
 *     tags: [Leave]
 *     summary: Cancel leave request (soft; scoped)
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
    const existing = await prisma.leaveRequest.findUnique({ where: { id: parseInt(req.params.id) } });
    if (existing) await assertCanAccessDriverRecord(req, existing.userId);
    await prisma.leaveRequest.update({ where: { id: parseInt(req.params.id) }, data: { status: 'CANCELLED' } });
    return ApiResponse.success(res, null, 'Leave request cancelled');
  } catch (err) { next(err); }
});

module.exports = router;
