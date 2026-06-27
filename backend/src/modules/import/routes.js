const router = require('express').Router();
const { adminMutationPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const { createSpreadsheetUpload } = require('../../utils/spreadsheetUpload');
const ImportController = require('./controller');

const upload = createSpreadsheetUpload();

router.get('/modules', ...adminMutationPerm(P.USERS_READ, P.FLEET_READ), ImportController.listModules);
router.get('/meta/:module', ...adminMutationPerm(P.USERS_READ, P.FLEET_READ), ImportController.meta);
router.get('/template/:module', ...adminMutationPerm(P.USERS_READ, P.FLEET_READ), ImportController.template);
router.post('/csv', ...adminMutationPerm(P.USERS_WRITE, P.FLEET_WRITE), upload.single('file'), ImportController.importCsv);

module.exports = router;
