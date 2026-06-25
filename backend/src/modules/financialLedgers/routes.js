const router = require('express').Router();
const multer = require('multer');
const { adminPerm, adminMutationPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const FinancialLedgerController = require('./controller');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const readPerm = adminPerm(P.FINANCE_READ, P.COMPLIANCE_READ, P.HR_READ);
const writePerm = adminMutationPerm(P.FINANCE_READ, P.COMPLIANCE_READ);

router.get('/bundle', ...readPerm, FinancialLedgerController.getBundle);
router.get('/export', ...readPerm, FinancialLedgerController.exportCsv);
router.get('/template', ...readPerm, FinancialLedgerController.template);
router.post('/generate', ...writePerm, FinancialLedgerController.generate);
router.post('/import', ...writePerm, upload.single('file'), FinancialLedgerController.importCsv);

module.exports = router;
