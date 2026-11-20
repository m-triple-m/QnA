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
      await ensureSchemaUpdates();
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

/**
 * Ensure database table columns are aligned with newest features.
 */
async function ensureSchemaUpdates() {
  try {
    const [cols] = await sequelize.query("SHOW COLUMNS FROM `options` LIKE 'media_url'");
    if (!cols || cols.length === 0) {
      await sequelize.query("ALTER TABLE `options` ADD COLUMN `media_url` VARCHAR(500) NULL DEFAULT NULL AFTER `text`");
      logger.info("Migrated 'options' table: added 'media_url' column.");
    }
    // Ensure text column allows empty strings or NULL
    await sequelize.query("ALTER TABLE `options` MODIFY COLUMN `text` VARCHAR(500) NULL DEFAULT ''");
  } catch (err) {
    // If table doesn't exist yet, sync will create it
    logger.debug(`Schema migration check note: ${err.message}`);
  }
}

module.exports = { sequelize, testConnection };
