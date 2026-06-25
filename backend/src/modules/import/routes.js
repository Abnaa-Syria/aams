const router = require('express').Router();
const multer = require('multer');
const { adminMutationPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const ImportController = require('./controller');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.csv$/i.test(file.originalname) || file.mimetype === 'text/csv';
    cb(ok ? null : new Error('Only CSV files allowed'), ok);
  },
});

router.get('/modules', ...adminMutationPerm(P.USERS_READ, P.FLEET_READ), ImportController.listModules);
router.get('/template/:module', ...adminMutationPerm(P.USERS_READ, P.FLEET_READ), ImportController.template);
router.post('/csv', ...adminMutationPerm(P.USERS_WRITE, P.FLEET_WRITE), upload.single('file'), ImportController.importCsv);

module.exports = router;
