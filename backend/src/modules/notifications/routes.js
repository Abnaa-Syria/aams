const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const prisma = require('../../config/database');
const ApiResponse = require('../../utils/response');
const { NotFoundError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { scheduleDeliver } = require('../../services/pushService');

/**
 * @openapi
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List notifications for current user
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
 *         name: isRead
 *         schema: { type: boolean }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Notifications list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedNotificationsResponse'
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const where = {
      userId: req.user.id,
      ...(req.query.isRead !== undefined && { isRead: req.query.isRead === 'true' }),
      ...(req.query.category && { category: req.query.category }),
    };
    const [items, total] = await Promise.all([
      prisma.notification.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.notification.count({ where }),
    ]);
    return ApiResponse.paginated(res, items, buildPaginationMeta(total, page, limit));
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Unread notification count for current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success payload includes data.count (unread)
 */
router.get('/unread-count', authenticate, async (req, res, next) => {
  try {
    const count = await prisma.notification.count({ where: { userId: req.user.id, isRead: false } });
    return ApiResponse.success(res, { count });
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark one notification as read
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Marked
 */
router.patch('/:id/read', authenticate, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await prisma.notification.findFirst({ where: { id, userId: req.user.id } });
    if (!row) throw new NotFoundError('Notification');
    await prisma.notification.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
    return ApiResponse.success(res, null, 'Marked as read');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /notifications/read-all:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read for current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Done
 */
router.patch('/read-all', authenticate, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user.id, isRead: false }, data: { isRead: true, readAt: new Date() } });
    return ApiResponse.success(res, null, 'All marked as read');
  } catch (err) { next(err); }
});

// Admin: send notification
/**
 * @openapi
 * /notifications/send:
 *   post:
 *     tags: [Notifications]
 *     summary: Send notification to specific users (admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userIds, title, body]
 *             properties:
 *               userIds:
 *                 type: array
 *                 items: { type: integer }
 *               title: { type: string }
 *               body: { type: string }
 *               category: { type: string, example: GENERAL }
 *     responses:
 *       201:
 *         description: Sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post('/send', ...adminPerm(P.COMPLIANCE_WRITE), async (req, res, next) => {
  try {
    const { userIds, title, body, category } = req.body;

    if (userIds && userIds.length > 0) {
      await prisma.notification.createMany({
        data: userIds.map(uid => ({ userId: uid, title, body, category: category || 'GENERAL' })),
      });
      scheduleDeliver(userIds, { title, body, category: category || 'GENERAL' });
    }

    return ApiResponse.created(res, null, 'Notifications sent');
  } catch (err) { next(err); }
});

// Admin: send to all users
/**
 * @openapi
 * /notifications/broadcast:
 *   post:
 *     tags: [Notifications]
 *     summary: Broadcast notification (admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BroadcastNotificationRequest'
 *     responses:
 *       201:
 *         description: Broadcast sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post('/broadcast', ...adminPerm(P.COMPLIANCE_WRITE), async (req, res, next) => {
  try {
    const { title, body, category, role } = req.body;
    const where = { deletedAt: null };
    if (role) where.role = role;

    const users = await prisma.user.findMany({ where, select: { id: true } });
    await prisma.notification.createMany({
      data: users.map(u => ({ userId: u.id, title, body, category: category || 'GENERAL' })),
    });
    scheduleDeliver(
      users.map((u) => u.id),
      { title, body, category: category || 'GENERAL' },
    );

    return ApiResponse.created(res, { sent: users.length }, 'Broadcast sent');
  } catch (err) { next(err); }
});

// Admin: list all notifications
/**
 * @openapi
 * /notifications/admin/all:
 *   get:
 *     tags: [Notifications]
 *     summary: List all notifications (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Notifications list (admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedNotificationsResponse'
 */
router.get('/admin/all', ...adminPerm(P.COMPLIANCE_READ), async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const where = { ...(req.query.userId && { userId: parseInt(req.query.userId) }) };
    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, fullNameAr: true } } },
      }),
      prisma.notification.count({ where }),
    ]);
    return ApiResponse.paginated(res, items, buildPaginationMeta(total, page, limit));
  } catch (err) { next(err); }
});

// Templates CRUD
/**
 * @openapi
 * /notifications/templates:
 *   get:
 *     tags: [Notifications]
 *     summary: List notification templates (admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Templates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/NotificationTemplate' }
 */
router.get('/templates', ...adminPerm(P.SETTINGS_READ), async (req, res, next) => {
  try {
    const items = await prisma.notificationTemplate.findMany({ orderBy: { key: 'asc' } });
    return ApiResponse.success(res, items);
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /notifications/templates:
 *   post:
 *     tags: [Notifications]
 *     summary: Create notification template (admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/templates', ...adminPerm(P.SETTINGS_WRITE), async (req, res, next) => {
  try {
    const item = await prisma.notificationTemplate.create({ data: req.body });
    return ApiResponse.created(res, item, 'Template created');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /notifications/templates/{id}:
 *   put:
 *     tags: [Notifications]
 *     summary: Update notification template (admin)
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
router.put('/templates/:id', ...adminPerm(P.SETTINGS_WRITE), async (req, res, next) => {
  try {
    const item = await prisma.notificationTemplate.update({ where: { id: parseInt(req.params.id) }, data: req.body });
    return ApiResponse.success(res, item, 'Template updated');
  } catch (err) { next(err); }
});

module.exports = router;
