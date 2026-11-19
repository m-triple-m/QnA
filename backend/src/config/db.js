'use strict';

const { Sequelize } = require('sequelize');
const logger = require('./logger');

const { DB_HOST, DB_USER, DB_PASS, DB_NAME } = process.env;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  dialect: 'mysql',
  logging: (msg) => logger.debug(msg),
  pool: {
    max: 10,
    min: 0,
    idle: 10000,
    acquire: 30000,
  },
});

/**
 * Test DB connection with up to 5 retries (2s delay between attempts).
 */
async function testConnection() {
  const MAX_RETRIES = 5;
  const DELAY_MS = 2000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await sequelize.authenticate();
      logger.info('Database connection established successfully.');
      return;
    } catch (err) {
      logger.warn(`DB connection attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);
      if (attempt === MAX_RETRIES) {
        logger.error('Could not connect to the database after maximum retries.');
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }
}

module.exports = { sequelize, testConnection };
