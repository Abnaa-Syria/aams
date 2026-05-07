/**
 * Real-Time Driver Location Tracking Handler
 * ============================================
 * Lightweight GPS broadcasting without flooding the database.
 *
 * Architecture:
 *  Mobile ──[driver_location_update]──► Server ──[live_tracking_update]──► Dashboard
 *                                         │
 *                                         └── Throttled DB write (Shift.lastLat / lastLng)
 *
 * Events:
 *  IN  — join_admin_dashboard    (dashboard clients)
 *  IN  — leave_admin_dashboard   (dashboard clients)
 *  IN  — driver_location_update  (mobile driver)
 *  OUT — live_tracking_update    (to admin_dashboard room)
 */
const prisma = require('../config/database');

// ────────────────────────────────────────────
// Throttle — one DB write per shift per 30 s
// ────────────────────────────────────────────
const DB_THROTTLE_MS = 30_000;

/** @type {Map<number, number>}  shiftId → last-write timestamp */
const lastWriteMap = new Map();

/**
 * Determine whether enough time has elapsed to issue a DB write for `shiftId`.
 * @param {number} shiftId
 * @returns {boolean}
 */
function shouldWriteDB(shiftId) {
  const now = Date.now();
  const prev = lastWriteMap.get(shiftId);
  if (!prev || now - prev >= DB_THROTTLE_MS) {
    lastWriteMap.set(shiftId, now);
    return true;
  }
  return false;
}

// Periodic cleanup — remove entries for shifts that haven't reported in 5 min
setInterval(() => {
  const cutoff = Date.now() - 5 * 60_000;
  for (const [shiftId, ts] of lastWriteMap) {
    if (ts < cutoff) lastWriteMap.delete(shiftId);
  }
}, 60_000);

// ────────────────────────────────────────────
// Handler registration
// ────────────────────────────────────────────

/**
 * Register tracking-related events on a socket connection.
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
function registerTrackingHandlers(io, socket) {
  // ── Dashboard joins the admin room ──
  socket.on('join_admin_dashboard', () => {
    socket.join('admin_dashboard');
    console.log(`[Tracking] Socket ${socket.id} joined admin_dashboard room`);
    socket.emit('joined', { room: 'admin_dashboard', message: 'مرحبًا — أنت متصل بغرفة التتبع اللحظي' });
  });

  socket.on('leave_admin_dashboard', () => {
    socket.leave('admin_dashboard');
    console.log(`[Tracking] Socket ${socket.id} left admin_dashboard room`);
  });

  // ── Driver pushes GPS coordinates ──
  socket.on('driver_location_update', async (payload) => {
    try {
      const { shiftId, lat, lng } = payload || {};

      // Basic validation
      if (!shiftId || lat == null || lng == null) {
        return socket.emit('tracking_error', {
          message: 'Missing required fields: shiftId, lat, lng',
        });
      }

      const numericShiftId = Number(shiftId);
      const numericLat = Number(lat);
      const numericLng = Number(lng);

      if (Number.isNaN(numericShiftId) || Number.isNaN(numericLat) || Number.isNaN(numericLng)) {
        return socket.emit('tracking_error', {
          message: 'shiftId, lat and lng must be valid numbers',
        });
      }

      // 1️⃣  ALWAYS broadcast to dashboard — zero delay
      const broadcastPayload = {
        shiftId: numericShiftId,
        lat: numericLat,
        lng: numericLng,
        timestamp: new Date().toISOString(),
      };
      io.to('admin_dashboard').emit('live_tracking_update', broadcastPayload);

      // 2️⃣  Throttled DB write — at most once every 30 s per shift
      if (shouldWriteDB(numericShiftId)) {
        try {
          await prisma.shift.update({
            where: { id: numericShiftId },
            data: {
              lastLat: numericLat,
              lastLng: numericLng,
              lastLocationAt: new Date(),
            },
          });
        } catch (dbErr) {
          // If shift doesn't exist, Prisma throws P2025
          if (dbErr.code === 'P2025') {
            console.warn(`[Tracking] Shift ${numericShiftId} not found — skipping DB write`);
            socket.emit('tracking_error', { message: `Shift ${numericShiftId} not found` });
          } else {
            console.error(`[Tracking] DB write error for shift ${numericShiftId}:`, dbErr.message);
          }
          // Clear throttle so next ping retries the write
          lastWriteMap.delete(numericShiftId);
        }
      }
    } catch (err) {
      console.error('[Tracking] Unexpected error:', err.message);
      socket.emit('tracking_error', { message: 'Internal server error' });
    }
  });
}

module.exports = { registerTrackingHandlers };
