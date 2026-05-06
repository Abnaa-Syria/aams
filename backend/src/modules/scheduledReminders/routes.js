const router = require('express').Router();
const ScheduledReminderController = require('./controller');
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const validate = require('../../middlewares/validate');
const {
  createScheduledReminderSchema,
  updateScheduledReminderSchema,
} = require('./validator');

// All endpoints require admin access (FLEET_READ for view, FLEET_WRITE for manage)
router.get('/', ...adminPerm(P.FLEET_READ), ScheduledReminderController.list);

router.post(
  '/',
  ...adminPerm(P.FLEET_WRITE),
  validate(createScheduledReminderSchema),
  ScheduledReminderController.create
);

router.put(
  '/:id',
  ...adminPerm(P.FLEET_WRITE),
  validate(updateScheduledReminderSchema),
  ScheduledReminderController.update
);

router.delete('/:id', ...adminPerm(P.FLEET_WRITE), ScheduledReminderController.delete);

module.exports = router;
