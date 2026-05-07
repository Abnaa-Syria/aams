/**
 * Socket.io — Server Initialiser
 * ===============================
 * Attaches Socket.io to the raw HTTP server.
 * Imports and registers all namespace / event handlers.
 */
const { Server } = require('socket.io');
const config = require('../config');
const { registerTrackingHandlers } = require('./trackingHandler');

/** @type {import('socket.io').Server | null} */
let io = null;

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

  // ----- Connection lifecycle -----
  io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

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
