'use strict';

/**
 * Script to execute schema.sql or sync Sequelize models with MySQL.
 * Usage:
 *   node src/scripts/initDb.js
 *   node src/scripts/initDb.js --seed
 */

require('../config/env');
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/db');
const logger = require('../config/logger');

async function initDatabase() {
  const schemaPath = path.join(__dirname, '../../schema.sql');

  if (!fs.existsSync(schemaPath)) {
    logger.error(`schema.sql not found at ${schemaPath}`);
    process.exit(1);
  }

  try {
    logger.info('Connecting to MySQL database...');
    await sequelize.authenticate();
    logger.info('Database connection established.');

    const sqlContent = fs.readFileSync(schemaPath, 'utf8');

    // Remove comments and split into individual queries
    const queries = sqlContent
      .split(/;\s*$/m)
      .map((q) => q.trim())
      .filter((q) => q.length > 0 && !q.startsWith('--'));

    logger.info(`Executing ${queries.length} SQL schema statements...`);

    for (const query of queries) {
      if (query.trim().length > 0) {
        await sequelize.query(query);
      }
    }

    logger.info('Database schema and sample seed data initialized successfully!');
    process.exit(0);
  } catch (err) {
    logger.error(`Failed to initialize database: ${err.message}`, err);
    process.exit(1);
  }
}

initDatabase();
