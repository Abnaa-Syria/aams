const router = require('express').Router();
const { sharedPerm, adminMutationPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const PermissionRequestController = require('./controller');

router.get('/', ...sharedPerm(P.HR_READ), PermissionRequestController.list);
router.get('/:id', ...sharedPerm(P.HR_READ), PermissionRequestController.getById);
router.post('/', ...sharedPerm(P.HR_WRITE), PermissionRequestController.create);
router.patch('/:id/review', ...adminMutationPerm(P.HR_APPROVE), PermissionRequestController.review);
router.post('/:id/cancel', ...sharedPerm(P.HR_WRITE), PermissionRequestController.cancel);

module.exports = router;
