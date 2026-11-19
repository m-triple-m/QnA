'use strict';

const { Server } = require('socket.io');
const { CLIENT_URL } = require('../config/env');
const logger = require('../config/logger');

let io;

/**
 * Initialise Socket.IO on the given HTTP server.
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server}
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Attach quiz-session namespace handler
  require('./quizSession.socket')(io);

  logger.info('[socket] Socket.IO initialised.');
  return io;
}

/**
 * Get the initialised Socket.IO instance (call after initSocket).
 * @returns {import('socket.io').Server}
 */
function getIO() {
  if (!io) throw new Error('Socket.IO has not been initialised. Call initSocket() first.');
  return io;
}

module.exports = { initSocket, getIO };
