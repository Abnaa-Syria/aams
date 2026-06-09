const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { adminPerm, sharedPerm } = require('../../middlewares/adminGuard');
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
router.get('/', ...sharedPerm(P.HR_READ), SalaryAdvanceController.list);

/**
 * @openapi
 * /salary-advances/{id}:
 *   get:
 *     tags: [Salary Advances]
 *     summary: Get salary advance by ID
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', ...sharedPerm(P.HR_READ), SalaryAdvanceController.getById);

/**
 * @openapi
 * /salary-advances:
 *   post:
 *     tags: [Salary Advances]
 *     summary: Request salary advance
 *     security:
 *       - bearerAuth: []
 */
router.post('/', ...sharedPerm(P.HR_WRITE), SalaryAdvanceController.create);

/**
 * @openapi
 * /salary-advances/{id}:
 *   patch:
 *     tags: [Salary Advances]
 *     summary: Update salary advance (admin)
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id', ...sharedPerm(P.FINANCE_WRITE), SalaryAdvanceController.update);

/**
 * @openapi
 * /salary-advances/{id}/review:
 *   patch:
 *     tags: [Salary Advances]
 *     summary: Finance review (admin)
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/supervisor-review', ...sharedPerm(P.FINANCE_READ), SalaryAdvanceController.supervisorReview);

router.patch('/:id/review', ...sharedPerm(P.FINANCE_APPROVE), SalaryAdvanceController.review);

/**
 * @openapi
 * /salary-advances/{id}:
 *   delete:
 *     tags: [Salary Advances]
 *     summary: Cancel request
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', ...sharedPerm(P.FINANCE_WRITE), SalaryAdvanceController.cancel);

module.exports = router;
