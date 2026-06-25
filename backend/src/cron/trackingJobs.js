const prisma = require('../config/database');
const { dispatchNotification } = require('../services/notificationDispatcher');

const IDLE_MINUTES = 40;
const DISCONNECT_MINUTES = 15;
const DEDUP_MS = 60 * 60 * 1000;

async function wasRecentlyNotified(userId, type, shiftId) {
  const since = new Date(Date.now() - DEDUP_MS);
  const recent = await prisma.notification.findMany({
    where: { userId, category: { in: ['SHIFT', 'ALERT'] }, createdAt: { gte: since } },
    select: { metadata: true },
    take: 20,
  });
  return recent.some((n) => n.metadata?.type === type && n.metadata?.shiftId === shiftId);
}

async function checkIdleDrivers() {
  const cutoff = new Date(Date.now() - IDLE_MINUTES * 60 * 1000);
  const shifts = await prisma.shift.findMany({
    where: {
      status: 'ACTIVE',
      lastLocationAt: { lt: cutoff },
    },
    select: { id: true, userId: true },
    take: 100,
  });
  let sent = 0;
  for (const shift of shifts) {
    if (await wasRecentlyNotified(shift.userId, 'IDLE', shift.id)) continue;
    await dispatchNotification({
      userId: shift.userId,
      title: 'تنبيه خمول',
      body: `لم يتم تحديث موقعك منذ أكثر من ${IDLE_MINUTES} دقيقة أثناء الشفت النشط`,
      category: 'SHIFT',
      metadata: { shiftId: shift.id, type: 'IDLE' },
    });
    sent += 1;
  }
  return sent;
}

async function checkGpsDisconnect() {
  const cutoff = new Date(Date.now() - DISCONNECT_MINUTES * 60 * 1000);
  const shifts = await prisma.shift.findMany({
    where: {
      status: 'ACTIVE',
      OR: [{ lastLocationAt: null }, { lastLocationAt: { lt: cutoff } }],
    },
    select: { id: true, userId: true },
    take: 100,
  });
  let sent = 0;
  for (const shift of shifts) {
    if (await wasRecentlyNotified(shift.userId, 'GPS_DISCONNECT', shift.id)) continue;
    await dispatchNotification({
      userId: shift.userId,
      title: 'انقطاع GPS',
      body: 'لم يصل تحديث موقع خلال الفترة المحددة',
      category: 'ALERT',
      metadata: { shiftId: shift.id, type: 'GPS_DISCONNECT' },
    });
    sent += 1;
  }
  return sent;
}

module.exports = { checkIdleDrivers, checkGpsDisconnect };
