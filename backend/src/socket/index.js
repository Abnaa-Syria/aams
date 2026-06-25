/**
 * Socket.io — Server Initialiser
 * ===============================
 * Attaches Socket.io to the raw HTTP server.
 * Imports and registers all namespace / event handlers.
 */
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../config/database');
const { registerTrackingHandlers } = require('./trackingHandler');

/** @type {import('socket.io').Server | null} */
let io = null;

async function socketAuthMiddleware(socket, next) {
  try {
    const raw =
      socket.handshake.auth?.token
      || (socket.handshake.headers?.authorization || '').replace(/^Bearer\s+/i, '');
    if (!raw) {
      return next(new Error('Authentication required'));
    }
    const decoded = jwt.verify(raw, config.jwt.secret);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { appUser: true },
    });
    if (!user || user.accountStatus === 'ARCHIVED') {
      return next(new Error('User not found or inactive'));
    }
    socket.user = {
      id: user.id,
      role: user.role,
      userType: user.userType,
      appRole: user.appUser?.appRole || null,
      appUserId: user.appUser?.id || null,
    };
    return next();
  } catch (err) {
    return next(new Error('Invalid or expired token'));
  }
}

/**
 * Initialise Socket.io on the given HTTP server.
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server}
 */
function initSocket(httpServer) {
  // Resolve allowed origins — reuse the same CORS config as Express.
  const corsOrigin = Array.isArray(config.cors.origin)
    ? config.cors.origin
    : config.cors.origin
      ? [config.cors.origin]
      : [];

  io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use(socketAuthMiddleware);

  // ----- Connection lifecycle -----
  io.on('connection', (socket) => {
    const who = socket.user?.appRole || socket.user?.role || 'unknown';
    console.log(`[Socket.io] Client connected: ${socket.id} (${who}#${socket.user?.id})`);

    // Register all event handlers
    registerTrackingHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.io] Client disconnected: ${socket.id} — ${reason}`);
    });
  });

  console.log('[Socket.io] Initialised and listening for connections');
  return io;
}

/**
 * Get the current Socket.io server instance.
 * Useful for emitting from REST controllers.
 * @returns {import('socket.io').Server}
 */
function getIO() {
  if (!io) throw new Error('Socket.io has not been initialised — call initSocket(httpServer) first');
  return io;
}

module.exports = { initSocket, getIO };
