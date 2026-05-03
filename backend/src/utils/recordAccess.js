const prisma = require('../config/database');
const { AuthorizationError } = require('./errors');
const { ADMIN_ROLES } = require('./listScope');

/**
 * Ensures the caller may access a row owned by recordUserId (driver). Uses 403 for clear denial.
 */
async function assertCanAccessDriverRecord(req, recordUserId) {
  if (!recordUserId) return;
  const { role, id } = req.user;

  if (ADMIN_ROLES.has(role)) return;

  if (role === 'DRIVER') {
    if (recordUserId !== id) throw new AuthorizationError('غير مصرح بعرض هذا السجل');
    return;
  }

  if (role === 'SUPERVISOR') {
    const driver = await prisma.user.findFirst({
      where: { id: recordUserId, supervisorId: id, role: 'DRIVER', deletedAt: null },
      select: { id: true },
    });
    if (!driver) throw new AuthorizationError('غير مصرح بعرض هذا السجل');
    return;
  }

  throw new AuthorizationError('غير مصرح بعرض هذا السجل');
}

module.exports = { assertCanAccessDriverRecord };
