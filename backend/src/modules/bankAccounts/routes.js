const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const upload = require('../../utils/upload');
const prisma = require('../../config/database');
const ApiResponse = require('../../utils/response');
const { NotFoundError } = require('../../utils/errors');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { logAudit } = require('../../utils/auditLogger');
const { ADMIN_ROLES, mergeDriverNameIntoUserWhere } = require('../../utils/listScope');
const { assertCanAccessDriverRecord } = require('../../utils/recordAccess');
const { AuthorizationError } = require('../../utils/errors');
const { normalizeStoredUploadPath } = require('../../utils/uploadPath');
const { streamAttachmentDownload } = require('../../utils/streamAttachment');

/**
 * @openapi
 * /bank-accounts:
 *   get:
 *     tags: [Bank Accounts]
 *     summary: List bank accounts
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
 *         name: verificationStatus
 *         schema: { type: string, enum: [PENDING, VERIFIED, REJECTED] }
 *     responses:
 *       200:
 *         description: Bank accounts list
 */
router.get('/', ...adminPerm(P.FINANCE_READ), async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    let where = {
      deletedAt: null,
      ...(req.query.userId && { userId: parseInt(req.query.userId) }),
      ...(req.query.verificationStatus && { verificationStatus: req.query.verificationStatus }),
      ...(req.query.paymentMethod && { paymentMethod: req.query.paymentMethod }),
    };
    where = mergeDriverNameIntoUserWhere(where, req.query);
    const [items, total] = await Promise.all([
      prisma.bankAccount.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, fullNameAr: true, identityNumber: true } } } }),
      prisma.bankAccount.count({ where }),
    ]);
    return ApiResponse.paginated(res, items, buildPaginationMeta(total, page, limit));
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /bank-accounts/{id}:
 *   get:
 *     tags: [Bank Accounts]
 *     summary: Get bank account (scoped)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Bank account
 *   put:
 *     tags: [Bank Accounts]
 *     summary: Update bank account (multipart proofFile optional)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               proofFile: { type: string, format: binary }
 *               isDefault: { type: string, description: "true/false for multipart" }
 *     responses:
 *       200:
 *         description: Updated
 *   delete:
 *     tags: [Bank Accounts]
 *     summary: Soft-delete bank account (admin FINANCE_APPROVE)
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
router.get('/:id', ...adminPerm(P.FINANCE_READ), async (req, res, next) => {
  try {
    const item = await prisma.bankAccount.findFirst({ where: { id: parseInt(req.params.id), deletedAt: null }, include: { user: { select: { id: true, fullNameAr: true } } } });
    if (!item) throw new NotFoundError('Bank Account');
    await assertCanAccessDriverRecord(req, item.userId);
    return ApiResponse.success(res, item);
  } catch (err) { next(err); }
});

router.get('/:id/files/proof/download', ...adminPerm(P.FINANCE_READ), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const bankAccount = await prisma.bankAccount.findFirst({
      where: { id, deletedAt: null },
      select: { userId: true, proofFileUrl: true },
    });
    if (!bankAccount) throw new NotFoundError('Bank Account');
    await assertCanAccessDriverRecord(req, bankAccount.userId);
    const fallbackName = 'bank-account-proof';
    await streamAttachmentDownload(res, bankAccount.proofFileUrl, fallbackName);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/files/cash-receipt/download', ...adminPerm(P.FINANCE_READ), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const bankAccount = await prisma.bankAccount.findFirst({
      where: { id, deletedAt: null },
      select: { userId: true, cashReceiptPhotoUrl: true },
    });
    if (!bankAccount) throw new NotFoundError('Bank Account');
    await assertCanAccessDriverRecord(req, bankAccount.userId);
    const fallbackName = 'cash-receipt';
    await streamAttachmentDownload(res, bankAccount.cashReceiptPhotoUrl, fallbackName);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /bank-accounts:
 *   post:
 *     tags: [Bank Accounts]
 *     summary: Create bank account (driver; multipart proofFile optional)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               proofFile: { type: string, format: binary }
 *               userId: { type: integer, description: Admin only }
 *               bankName: { type: string }
 *               iban: { type: string }
 *               isDefault: { type: string }
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', ...adminPerm(P.FINANCE_WRITE), upload.fields([{ name: 'proofFile', maxCount: 1 }, { name: 'cashReceiptFile', maxCount: 1 }]), async (req, res, next) => {
  try {
    let userId = parseInt(req.body.userId, 10);
    if (!ADMIN_ROLES.has(req.user.role)) {
      if (req.user.role === 'DRIVER') userId = req.user.id;
      else await assertCanAccessDriverRecord(req, userId);
    }
    const data = {
      ...req.body,
      userId,
      isDefault: req.body.isDefault === 'true',
      paymentMethod: req.body.paymentMethod || 'BANK_TRANSFER',
    };
    // Handle receivedDate conversion
    if (data.receivedDate) data.receivedDate = new Date(data.receivedDate);
    // Handle file uploads
    const files = req.files || {};
    if (files.proofFile && files.proofFile[0]) {
      data.proofFileUrl = normalizeStoredUploadPath(files.proofFile[0].path);
      data.proofFileName = files.proofFile[0].originalname;
    }
    if (files.cashReceiptFile && files.cashReceiptFile[0]) {
      data.cashReceiptPhotoUrl = normalizeStoredUploadPath(files.cashReceiptFile[0].path);
    }
    const item = await prisma.bankAccount.create({ data });
    return ApiResponse.created(res, item, 'Bank account created');
  } catch (err) { next(err); }
});

router.put('/:id', ...adminPerm(P.FINANCE_WRITE), upload.fields([{ name: 'proofFile', maxCount: 1 }, { name: 'cashReceiptFile', maxCount: 1 }]), async (req, res, next) => {
  try {
    const existing = await prisma.bankAccount.findFirst({
      where: { id: parseInt(req.params.id, 10), deletedAt: null },
      select: { userId: true },
    });
    if (!existing) throw new NotFoundError('Bank Account');
    await assertCanAccessDriverRecord(req, existing.userId);
    const data = { ...req.body };
    if (data.userId !== undefined) {
      const newUid = parseInt(data.userId, 10);
      if (!ADMIN_ROLES.has(req.user.role) && newUid !== existing.userId) {
        throw new AuthorizationError('لا يمكن نقل الحساب لمستخدم آخر');
      }
      data.userId = newUid;
      await assertCanAccessDriverRecord(req, newUid);
    }
    if (data.isDefault !== undefined) data.isDefault = data.isDefault === 'true' || data.isDefault === true;
    if (data.receivedDate) data.receivedDate = new Date(data.receivedDate);
    // Handle file uploads
    const files = req.files || {};
    if (files.proofFile && files.proofFile[0]) {
      data.proofFileUrl = normalizeStoredUploadPath(files.proofFile[0].path);
      data.proofFileName = files.proofFile[0].originalname;
    }
    if (files.cashReceiptFile && files.cashReceiptFile[0]) {
      data.cashReceiptPhotoUrl = normalizeStoredUploadPath(files.cashReceiptFile[0].path);
    }
    const item = await prisma.bankAccount.update({ where: { id: parseInt(req.params.id, 10) }, data });
    return ApiResponse.success(res, item, 'Bank account updated');
  } catch (err) { next(err); }
});

/**
 * @openapi
 * /bank-accounts/{id}/verify:
 *   patch:
 *     tags: [Bank Accounts]
 *     summary: Verify or reject bank account (admin)
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
 *               verificationStatus: { type: string, enum: [PENDING, VERIFIED, REJECTED] }
 *               reviewNotes: { type: string }
 *     responses:
 *       200:
 *         description: Updated
 */
router.patch('/:id/verify', ...adminPerm(P.FINANCE_APPROVE), async (req, res, next) => {
  try {
    const item = await prisma.bankAccount.update({
      where: { id: parseInt(req.params.id) },
      data: { verificationStatus: req.body.verificationStatus, reviewedBy: req.user.id, reviewedAt: new Date(), reviewNotes: req.body.reviewNotes },
    });
    await logAudit({ userId: req.user.id, action: 'VERIFY_BANK_ACCOUNT', entity: 'BankAccount', entityId: String(req.params.id) });
    return ApiResponse.success(res, item, 'Bank account verification updated');
  } catch (err) { next(err); }
});

router.delete('/:id', ...adminPerm(P.FINANCE_WRITE), async (req, res, next) => {
  try {
    await prisma.bankAccount.update({ where: { id: parseInt(req.params.id) }, data: { deletedAt: new Date() } });
    return ApiResponse.success(res, null, 'Bank account deleted');
  } catch (err) { next(err); }
});

module.exports = router;
