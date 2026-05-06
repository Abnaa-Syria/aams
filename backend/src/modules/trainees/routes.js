const router = require('express').Router();
const TraineeController = require('./controller');
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const validate = require('../../middlewares/validate');
const {
  createTraineeSchema,
  updateTraineeSchema,
} = require('./validator');

// HR_READ / HR_APPROVE is suitable for managing trainees
router.get('/', ...adminPerm(P.HR_READ), TraineeController.list);
router.get('/:id', ...adminPerm(P.HR_READ), TraineeController.getById);

router.post(
  '/',
  ...adminPerm(P.HR_APPROVE),
  validate(createTraineeSchema),
  TraineeController.create
);

router.put(
  '/:id',
  ...adminPerm(P.HR_APPROVE),
  validate(updateTraineeSchema),
  TraineeController.update
);

router.delete('/:id', ...adminPerm(P.HR_APPROVE), TraineeController.delete);

module.exports = router;
