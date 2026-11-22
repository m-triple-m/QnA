'use strict';

// Load and validate environment variables first — must be first import.
require('./src/config/env');

const http = require('http');
const os = require('os');
const app = require('./src/app');
const { testConnection, sequelize } = require('./src/config/db');
const { initSocket } = require('./src/socket/index');
const logger = require('./src/config/logger');

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

// ── Detect active LAN IP addresses ───────────────────────────────────────────
function getLanIpAddresses() {
  const nets = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  return addresses;
}

// ── Create HTTP server ────────────────────────────────────────────────────────
const server = http.createServer(app);

// ── Attach Socket.IO ──────────────────────────────────────────────────────────
initSocket(server);

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    // 1. Test DB connectivity (5 retries × 2s)
    await testConnection();

    // 2. Sync Sequelize models (safe mode: creates tables if not present, no hazardous duplicate-index alters)
    await sequelize.sync({ force: false, alter: false });
    logger.info(`Database connected and models synchronized.`);

    // 3. Start listening on 0.0.0.0 to allow LAN & Localhost access
    server.listen(PORT, () => {
      const lanIps = getLanIpAddresses();
      logger.info(`QuizLive backend running on port ${PORT} [${NODE_ENV}]`);
      logger.info(`  > Local:   http://localhost:${PORT}`);
      if (lanIps.length > 0) {
        lanIps.forEach((ip) => logger.info(`  > Network: http://${ip}:${PORT}`));
      } else {
        logger.info(`  > Network: http://0.0.0.0:${PORT}`);
      }
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