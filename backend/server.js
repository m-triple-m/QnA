'use strict';

// Load and validate environment variables first — must be first import.
require('./src/config/env');

const http = require('http');
const app = require('./src/app');
const { testConnection, sequelize } = require('./src/config/db');
const { initSocket } = require('./src/socket/index');
const logger = require('./src/config/logger');

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ── Create HTTP server ────────────────────────────────────────────────────────
const server = http.createServer(app);

// ── Attach Socket.IO ──────────────────────────────────────────────────────────
initSocket(server);

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    // 1. Test DB connectivity (5 retries × 2s)
    await testConnection();

    // 2. Sync Sequelize models
    const syncOptions = NODE_ENV === 'production' ? { force: false } : { alter: true };
    await sequelize.sync(syncOptions);
    logger.info(`Database synced (${NODE_ENV} mode, alter=${syncOptions.alter ?? false}).`);

    // 3. Start listening
    server.listen(PORT, () => {
      logger.info(`QuizLive backend running on port ${PORT} [${NODE_ENV}]`);
    });
  } catch (err) {
    logger.error(`Bootstrap failed: ${err.message}`);
    process.exit(1);
  }
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────
function shutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully…`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await sequelize.close();
      logger.info('Database connection closed.');
    } catch (err) {
      logger.warn(`Error closing DB: ${err.message}`);
    }
    process.exit(0);
  });

  // Force exit after 10 s if still pending
  setTimeout(() => {
    logger.warn('Forced shutdown after timeout.');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

bootstrap();
