const router = require('express').Router();
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const ExportController = require('./controller');

router.post('/selected', ...adminPerm(P.AUDIT_READ, P.USERS_READ, P.FLEET_READ, P.HR_READ), ExportController.exportSelected);
router.get('/modules', ...adminPerm(P.AUDIT_READ, P.USERS_READ, P.FLEET_READ, P.HR_READ), ExportController.listModules);
router.get('/template/:module', ...adminPerm(P.AUDIT_READ, P.USERS_READ, P.FLEET_READ, P.HR_READ), ExportController.template);

module.exports = router;
