const prisma = require('../config/database');

/**
 * In-app notifications only (Phase 8). Push/SMS wired in Phase 10.
 */
async function dispatchNotification({
  userId,
  title,
  body,
  category = 'GENERAL',
  metadata = null,
}) {
  if (!userId) return null;
  return prisma.notification.create({
    data: {
      userId: parseInt(userId, 10),
      title: title || 'إشعار',
      body: body || '',
      category,
      metadata: metadata || undefined,
      isRead: false,
    },
  });
}

async function notifyAdminsAndSupervisors({ title, body, category, metadata }) {
  const recipients = await prisma.user.findMany({
    where: {
      deletedAt: null,
      accountStatus: { not: 'ARCHIVED' },
      OR: [
        { role: { in: ['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'HR_ADMIN', 'FLEET_ADMIN'] } },
        { appUser: { appRole: 'SUPERVISOR' } },
      ],
    },
    select: { id: true },
    take: 50,
  });
  await Promise.all(
    recipients.map((u) => dispatchNotification({
      userId: u.id,
      title,
      body,
      category,
      metadata,
    })),
  );
}

module.exports = {
  dispatchNotification,
  notifyAdminsAndSupervisors,
};
