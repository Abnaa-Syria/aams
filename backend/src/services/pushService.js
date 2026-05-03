const prisma = require('../config/database');
const config = require('../config');

/**
 * Sends mobile push for in-app notifications (best-effort; DB rows are always created first).
 * Configure EXPO_ACCESS_TOKEN and/or FCM_LEGACY_SERVER_KEY in env.
 */
async function deliverToUsers(userIds, { title, body, category }) {
  if (!userIds?.length) return { sent: 0, skipped: 0 };

  const uniqueIds = [...new Set(userIds.map((id) => parseInt(id, 10)).filter(Boolean))];
  const rows = await prisma.pushDeviceToken.findMany({
    where: { userId: { in: uniqueIds } },
  });

  if (!rows.length) {
    return { sent: 0, skipped: uniqueIds.length };
  }

  const expo = rows.filter((r) => r.provider === 'EXPO' || String(r.token).startsWith('ExponentPushToken'));
  const fcm = rows.filter((r) => r.provider === 'FCM_LEGACY');

  let sent = 0;

  if (expo.length && config.push.expoAccessToken) {
    const chunks = chunk(expo, 99);
    for (const group of chunks) {
      const messages = group.map((r) => ({
        to: r.token,
        title,
        body,
        data: category ? { category } : undefined,
      }));
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.push.expoAccessToken}`,
        },
        body: JSON.stringify(messages.length === 1 ? messages[0] : { messages }),
      });
      if (res.ok) sent += group.length;
      else if (config.nodeEnv === 'development') {
        const text = await res.text();
        console.warn('[push] Expo send failed', res.status, text);
      }
    }
  }

  if (fcm.length && config.push.fcmLegacyKey) {
    for (const r of fcm) {
      const res = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${config.push.fcmLegacyKey}`,
        },
        body: JSON.stringify({
          to: r.token,
          notification: { title, body },
          data: category ? { category } : undefined,
        }),
      });
      if (res.ok) sent += 1;
      else if (config.nodeEnv === 'development') {
        console.warn('[push] FCM send failed', res.status, await res.text());
      }
    }
  }

  return { sent, devices: rows.length };
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function scheduleDeliver(userIds, payload) {
  setImmediate(() => {
    deliverToUsers(userIds, payload).catch((err) => {
      console.error('[push] deliverToUsers error', err.message);
    });
  });
}

module.exports = { deliverToUsers, scheduleDeliver };
