const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const SalaryAdvanceController = require('./controller');

/**
 * @openapi
 * /salary-advances:
 *   get:
 *     tags: [Salary Advances]
 *     summary: List salary advance requests
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticate, SalaryAdvanceController.list);

/**
 * @openapi
 * /salary-advances/{id}:
 *   get:
 *     tags: [Salary Advances]
 *     summary: Get salary advance by ID
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authenticate, SalaryAdvanceController.getById);

/**
 * @openapi
 * /salary-advances:
 *   post:
 *     tags: [Salary Advances]
 *     summary: Request salary advance
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticate, SalaryAdvanceController.create);

/**
 * @openapi
 * /salary-advances/{id}:
 *   patch:
 *     tags: [Salary Advances]
 *     summary: Update salary advance (admin)
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id', ...adminPerm(P.FINANCE_WRITE), SalaryAdvanceController.update);

/**
 * @openapi
 * /salary-advances/{id}/review:
 *   patch:
 *     tags: [Salary Advances]
 *     summary: Finance review (admin)
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/review', ...adminPerm(P.FINANCE_APPROVE), SalaryAdvanceController.review);

/**
 * @openapi
 * /salary-advances/{id}:
 *   delete:
 *     tags: [Salary Advances]
 *     summary: Cancel request
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authenticate, SalaryAdvanceController.cancel);

module.exports = router;
