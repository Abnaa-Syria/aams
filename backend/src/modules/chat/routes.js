const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const upload = require('../../utils/upload');
const prisma = require('../../config/database');
const ApiResponse = require('../../utils/response');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');
const { ADMIN_ROLES } = require('../../utils/listScope');
const { AuthorizationError } = require('../../utils/errors');

/**
 * @openapi
 * /chat/conversations:
 *   get:
 *     tags: [Chat]
 *     summary: Conversation list for current user (partner, lastMessage, unreadCount)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Conversations array
 */
router.get('/conversations', ...adminPerm(P.USERS_READ), async (req, res, next) => {
  try {
    const userId = req.user.id;
    // Get unique conversation partners
    const messages = await prisma.$queryRaw`
      SELECT DISTINCT
        CASE WHEN senderId = ${userId} THEN receiverId ELSE senderId END as partnerId
      FROM chat_messages
      WHERE senderId = ${userId} OR receiverId = ${userId}
    `;

    const partnerIds = messages.map(m => Number(m.partnerId));
    const partners = await prisma.user.findMany({
      where: { id: { in: partnerIds } },
      select: { id: true, fullNameAr: true, fullNameEn: true, profileImageUrl: true, role: true },
    });

    // Get last message and unread count for each
    const conversations = await Promise.all(partners.map(async (partner) => {
      const lastMessage = await prisma.chatMessage.findFirst({
        where: { OR: [{ senderId: userId, receiverId: partner.id }, { senderId: partner.id, receiverId: userId }] },
        orderBy: { createdAt: 'desc' },
      });
      const unreadCount = await prisma.chatMessage.count({
        where: { senderId: partner.id, receiverId: userId, isRead: false },
      });
      return { partner, lastMessage, unreadCount };
    }));

    return ApiResponse.success(res, conversations);
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /chat/messages/{partnerId}:
 *   get:
 *     tags: [Chat]
 *     summary: Paginated messages with a partner (marks incoming as read)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Paginated messages
 */
router.get('/messages/:partnerId', ...adminPerm(P.USERS_READ), async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const userId = req.user.id;
    const partnerId = parseInt(req.params.partnerId);
    const where = {
      OR: [
        { senderId: userId, receiverId: partnerId },
        { senderId: partnerId, receiverId: userId },
      ],
    };
    const [items, total] = await Promise.all([
      prisma.chatMessage.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.chatMessage.count({ where }),
    ]);

    // Mark as read
    await prisma.chatMessage.updateMany({
      where: { senderId: partnerId, receiverId: userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return ApiResponse.paginated(res, items, buildPaginationMeta(total, page, limit));
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /chat/send:
 *   post:
 *     tags: [Chat]
 *     summary: Send message (driver→supervisor only; supervisor→assigned drivers; admins unrestricted)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [receiverId]
 *             properties:
 *               receiverId: { type: integer }
 *               message: { type: string }
 *               tag: { type: string }
 *               attachment: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Message created
 *       403:
 *         description: Policy violation
 */
router.post('/send', ...adminPerm(P.USERS_WRITE), upload.single('attachment'), async (req, res, next) => {
  try {
    const receiverId = parseInt(req.body.receiverId, 10);
    const { role, appRole, id: senderId, supervisorId, appUserId } = req.user;
    if (!ADMIN_ROLES.has(role)) {
      if (appRole === 'DRIVER') {
        if (!supervisorId || receiverId !== supervisorId) {
          throw new AuthorizationError('يمكنك مراسلة مشرفك المباشر فقط');
        }
      } else if (appRole === 'SUPERVISOR') {
        const allowed = await prisma.user.findFirst({
          where: { 
            id: receiverId, 
            appUser: { 
              supervisorId: appUserId,
              appRole: 'DRIVER'
            }, 
            deletedAt: null 
          },
          select: { id: true },
        });
        if (!allowed) throw new AuthorizationError('يمكنك مراسلة السائقين التابعين لك فقط');
      } else {
        throw new AuthorizationError('غير مصرح بإرسال الرسائل');
      }
    }
    const data = {
      senderId,
      receiverId,
      message: req.body.message,
      tag: req.body.tag,
    };
    if (req.file) data.attachmentUrl = normalizeStoredUploadPath(req.file.path);
    const msg = await prisma.chatMessage.create({ data });
    return ApiResponse.created(res, msg, 'Message sent');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /chat/admin/conversations:
 *   get:
 *     tags: [Chat]
 *     summary: Admin — recent chat messages across users (paginated)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Paginated messages
 */
router.get('/admin/conversations', ...adminPerm(P.COMPLIANCE_READ), async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const [items, total] = await Promise.all([
      prisma.chatMessage.findMany({
        skip, take: limit, orderBy: { createdAt: 'desc' }, distinct: ['senderId', 'receiverId'],
        include: {
          sender: { select: { id: true, fullNameAr: true, role: true } },
          receiver: { select: { id: true, fullNameAr: true, role: true } },
        },
      }),
      prisma.chatMessage.count(),
    ]);
    return ApiResponse.paginated(res, items, buildPaginationMeta(total, page, limit));
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /chat/messages/{partnerId}:
 *   delete:
 *     tags: [Chat]
 *     summary: Delete all messages with a partner
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Messages deleted
 */
router.delete('/messages/:partnerId', ...adminPerm(P.USERS_WRITE), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const partnerId = parseInt(req.params.partnerId, 10);

    await prisma.chatMessage.deleteMany({
      where: {
        OR: [
          { senderId: userId, receiverId: partnerId },
          { senderId: partnerId, receiverId: userId },
        ],
      },
    });

    return ApiResponse.success(res, null, 'Chat history cleared');
  } catch (err) { next(err); }
});

module.exports = router;
