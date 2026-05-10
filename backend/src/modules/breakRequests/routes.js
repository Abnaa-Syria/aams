const router = require('express').Router();
const BreakRequestController = require('./controller');
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const validate = require('../../middlewares/validate');
const {
  createBreakRequestSchema,
  reviewBreakRequestSchema,
} = require('./validator');

router.get('/', ...adminPerm(P.SHIFTS_READ), authenticate, BreakRequestController.list);

router.post(
  '/',
  ...adminPerm(P.SHIFTS_WRITE),
  authenticate,
  validate(createBreakRequestSchema),
  BreakRequestController.create
);

router.patch(
  '/:id/review',
  ...adminPerm(P.SHIFTS_APPROVE), // Supervisors/Ops
  validate(reviewBreakRequestSchema),
  BreakRequestController.review
);

router.post('/:id/start', ...adminPerm(P.SHIFTS_WRITE), authenticate, BreakRequestController.startBreak);
router.post('/:id/end', ...adminPerm(P.SHIFTS_WRITE), authenticate, BreakRequestController.endBreak);

module.exports = router;
