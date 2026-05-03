const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const upload = require('../../utils/upload');
const prisma = require('../../config/database');
const ApiResponse = require('../../utils/response');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { ADMIN_ROLES, applyUserOwnedListScopeUserIdField } = require('../../utils/listScope');
const { assertCanAccessDriverRecord } = require('../../utils/recordAccess');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');

/**
 * @openapi
 * /maintenance-requests:
 *   get:
 *     tags: [Maintenance Requests]
 *     summary: List maintenance requests
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
 *         name: vehicleId
 *         schema: { type: integer }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [REQUESTED, APPROVED, IN_PROGRESS, COMPLETED, CANCELLED] }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [LOW, MEDIUM, HIGH, URGENT] }
 *     responses:
 *       200:
 *         description: Maintenance requests list
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    let where = {
      ...(req.query.vehicleId && { vehicleId: parseInt(req.query.vehicleId) }),
      ...(req.query.status && { status: req.query.status }),
      ...(req.query.priority && { priority: req.query.priority }),
    };
    where = applyUserOwnedListScopeUserIdField(where, req, 'userId');
    const [items, total] = await Promise.all([
      prisma.maintenanceRequest.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullNameAr: true } },
          vehicle: { select: { id: true, plateNumber: true, model: true } },
        },
      }),
      prisma.maintenanceRequest.count({ where }),
    ]);
    return ApiResponse.paginated(res, items, buildPaginationMeta(total, page, limit));
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /maintenance-requests/{id}:
 *   get:
 *     tags: [Maintenance]
 *     summary: Get maintenance request (scoped)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Request
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const item = await prisma.maintenanceRequest.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { user: { select: { id: true, fullNameAr: true } }, vehicle: true },
    });
    if (item) await assertCanAccessDriverRecord(req, item.userId);
    return ApiResponse.success(res, item);
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /maintenance-requests:
 *   post:
 *     tags: [Maintenance]
 *     summary: Create maintenance request (multipart attachment optional)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [vehicleId, issueType]
 *             properties:
 *               vehicleId: { type: integer }
 *               issueType: { type: string }
 *               priority: { type: string, enum: [LOW, MEDIUM, HIGH, URGENT] }
 *               description: { type: string }
 *               userId: { type: integer }
 *               attachment: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', authenticate, upload.single('attachment'), async (req, res, next) => {
  try {
    let uid = req.body.userId ? parseInt(req.body.userId, 10) : req.user.id;
    if (!ADMIN_ROLES.has(req.user.role)) uid = req.user.id;
    const data = {
      userId: uid,
      vehicleId: parseInt(req.body.vehicleId),
      issueType: req.body.issueType,
      priority: req.body.priority || 'MEDIUM',
      description: req.body.description,
    };
    if (req.file) data.attachmentUrl = normalizeStoredUploadPath(req.file.path);
    const item = await prisma.maintenanceRequest.create({ data });
    return ApiResponse.created(res, item, 'Maintenance request created');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /maintenance-requests/{id}/status:
 *   patch:
 *     tags: [Maintenance]
 *     summary: Update workflow status (admin fleet); may update vehicle status
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
 *               status: { type: string, enum: [REQUESTED, APPROVED, IN_PROGRESS, COMPLETED, CANCELLED] }
 *               technicianNotes: { type: string }
 *               adminNotes: { type: string }
 *     responses:
 *       200:
 *         description: Updated
 */
router.patch('/:id/status', ...adminPerm(P.FLEET_WRITE), async (req, res, next) => {
  try {
    const updateData = {
      status: req.body.status,
      technicianNotes: req.body.technicianNotes,
      adminNotes: req.body.adminNotes,
    };
    if (req.body.status === 'COMPLETED') updateData.completedAt = new Date();

    // Update vehicle status based on maintenance
    const mReq = await prisma.maintenanceRequest.findUnique({ where: { id: parseInt(req.params.id) } });
    if (req.body.status === 'IN_PROGRESS' && mReq) {
      await prisma.vehicle.update({ where: { id: mReq.vehicleId }, data: { status: 'IN_MAINTENANCE' } });
    }
    if (req.body.status === 'COMPLETED' && mReq) {
      await prisma.vehicle.update({ where: { id: mReq.vehicleId }, data: { status: 'ACTIVE' } });
    }

    const item = await prisma.maintenanceRequest.update({ where: { id: parseInt(req.params.id) }, data: updateData });
    await logAudit({ userId: req.user.id, action: 'UPDATE_MAINTENANCE_STATUS', entity: 'MaintenanceRequest', entityId: String(req.params.id) });
    return ApiResponse.success(res, item, 'Maintenance request updated');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /maintenance-requests/{id}:
 *   delete:
 *     tags: [Maintenance]
 *     summary: Delete maintenance request (admin)
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
router.delete('/:id', ...adminPerm(P.FLEET_WRITE), async (req, res, next) => {
  try {
    await prisma.maintenanceRequest.delete({ where: { id: parseInt(req.params.id) } });
    return ApiResponse.success(res, null, 'Maintenance request deleted');
  } catch (err) { next(err); }
});

module.exports = router;
