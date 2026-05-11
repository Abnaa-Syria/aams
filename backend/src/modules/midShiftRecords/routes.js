const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const upload = require('../../utils/upload');
const prisma = require('../../config/database');
const ApiResponse = require('../../utils/response');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { applyMidShiftListScope } = require('../../utils/listScope');
const { assertCanAccessDriverRecord } = require('../../utils/recordAccess');
const { NotFoundError, BusinessLogicError } = require('../../utils/errors');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');

/**
 * @openapi
 * /mid-shift-records:
 *   get:
 *     tags: [Mid-shift]
 *     summary: List mid-shift records (scoped by driver/supervisor)
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
 *         name: shiftId
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Paginated records
 */
router.get('/', ...adminPerm(P.SHIFTS_READ), authenticate, async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    let where = {};
    where = applyMidShiftListScope(where, req);
    const [items, total] = await Promise.all([
      prisma.midShiftRecord.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: { shift: { select: { id: true, userId: true, status: true } } } }),
      prisma.midShiftRecord.count({ where }),
    ]);
    return ApiResponse.paginated(res, items, buildPaginationMeta(total, page, limit));
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /mid-shift-records/{id}:
 *   get:
 *     tags: [Mid-shift]
 *     summary: Get mid-shift record by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Record
 */
router.get('/:id', ...adminPerm(P.SHIFTS_READ), authenticate, async (req, res, next) => {
  try {
    const item = await prisma.midShiftRecord.findUnique({ where: { id: parseInt(req.params.id) }, include: { shift: true } });
    if (item?.shift) await assertCanAccessDriverRecord(req, item.shift.userId);
    return ApiResponse.success(res, item);
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /mid-shift-records:
 *   post:
 *     tags: [Mid-shift]
 *     summary: Create mid-shift record during active shift
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [shiftId]
 *             properties:
 *               shiftId: { type: integer }
 *               notes: { type: string }
 *               checklistData: { type: string, description: JSON string }
 *               screenshot: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', ...adminPerm(P.SHIFTS_WRITE), authenticate, upload.single('screenshot'), async (req, res, next) => {
  try {
    const { ensureActiveShift } = require('../../utils/shiftSecurity');
    let shiftId = req.body.shiftId ? parseInt(req.body.shiftId, 10) : null;
    let activeShift;
    
    if (!shiftId) {
      activeShift = await ensureActiveShift(req.user);
      shiftId = activeShift ? activeShift.id : null;
    } else {
      // If shiftId is provided, verify it exists and is active/owned by user
      // Only for non-admins
      const ADMIN_ROLES = ['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'HR_ADMIN', 'FLEET_ADMIN', 'FINANCE_ADMIN'];
      if (!ADMIN_ROLES.includes(req.user.role)) {
        activeShift = await prisma.shift.findFirst({ where: { id: shiftId, userId: req.user.id, status: 'ACTIVE' } });
        if (!activeShift) throw new BusinessLogicError('Specified shift is not active or not yours');
      }
    }
    const data = {
      shiftId,
      notes: req.body.notes,
      checklistData: req.body.checklistData ? JSON.parse(req.body.checklistData) : undefined,
    };
    if (req.file) data.screenshotUrl = normalizeStoredUploadPath(req.file.path);
    const item = await prisma.midShiftRecord.create({ data });
    return ApiResponse.created(res, item, 'Mid-shift record created');
  } catch (err) { next(err); }
});

module.exports = router;
