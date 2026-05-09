const router = require('express').Router();
const TicketController = require('./controller');
const { authenticate } = require('../../middlewares/auth');
const { adminPerm } = require('../../middlewares/adminGuard');
const { PERMISSIONS: P } = require('../../constants/permissions');
const upload = require('../../utils/upload');

router.get('/', authenticate, TicketController.list);
router.get('/:id', authenticate, TicketController.getById);
router.post('/', authenticate, TicketController.create);
router.post('/:id/messages', authenticate, upload.single('attachment'), TicketController.addMessage);
router.patch('/:id/status', ...adminPerm(P.COMPLIANCE_WRITE), TicketController.updateStatus);

module.exports = router;
