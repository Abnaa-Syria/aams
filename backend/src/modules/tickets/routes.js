const router = require('express').Router();
const TicketController = require('./controller');
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const upload = require('../../utils/upload');

router.get('/', ...adminPerm(P.USERS_READ), TicketController.list);
router.get('/:id', ...adminPerm(P.USERS_READ), TicketController.getById);
router.post('/', ...adminPerm(P.USERS_WRITE), TicketController.create);
router.post('/:id/messages', ...adminPerm(P.USERS_WRITE), upload.single('attachment'), TicketController.addMessage);
router.patch('/:id/status', ...adminPerm(P.COMPLIANCE_WRITE), TicketController.updateStatus);

module.exports = router;
