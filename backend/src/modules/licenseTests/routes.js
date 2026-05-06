const router = require('express').Router();
const LicenseTestController = require('./controller');
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const validate = require('../../middlewares/validate');
const {
  createLicenseTestSchema,
  updateLicenseTestSchema,
} = require('./validator');

// HR_READ / HR_APPROVE is suitable for managing license tests
router.get('/', ...adminPerm(P.HR_READ), LicenseTestController.list);
router.get('/:id', ...adminPerm(P.HR_READ), LicenseTestController.getById);

router.post(
  '/',
  ...adminPerm(P.HR_APPROVE),
  validate(createLicenseTestSchema),
  LicenseTestController.create
);

router.put(
  '/:id',
  ...adminPerm(P.HR_APPROVE),
  validate(updateLicenseTestSchema),
  LicenseTestController.update
);

router.delete('/:id', ...adminPerm(P.HR_APPROVE), LicenseTestController.delete);

module.exports = router;
