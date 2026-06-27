const router = require('express').Router();
const { adminPerm, adminMutationPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const { createSpreadsheetUpload } = require('../../utils/spreadsheetUpload');
const OperationalReportController = require('./controller');

const upload = createSpreadsheetUpload();

const readPerm = adminPerm(P.SHIFTS_READ, P.DAILY_REPORTS_READ, P.AUDIT_READ);
const writePerm = adminMutationPerm(P.SHIFTS_READ, P.DAILY_REPORTS_READ);

router.get('/bundle', ...readPerm, OperationalReportController.getBundle);
router.get('/export', ...readPerm, OperationalReportController.exportSection);
router.get('/export-all', ...readPerm, OperationalReportController.exportAll);
router.get('/template', ...readPerm, OperationalReportController.template);
router.post('/generate', ...writePerm, OperationalReportController.generate);
router.patch('/:id/summary', ...writePerm, OperationalReportController.updateSummary);
router.post('/:id/finalize', ...writePerm, OperationalReportController.finalize);
router.get('/import-meta', ...readPerm, OperationalReportController.importMeta);
router.post('/import', ...writePerm, upload.single('file'), OperationalReportController.importSection);

module.exports = router;
