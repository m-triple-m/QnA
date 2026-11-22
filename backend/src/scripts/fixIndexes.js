'use strict';

require('../config/env');
const { sequelize } = require('../config/db');
const logger = require('../config/logger');

async function fixIndexes() {
  try {
    await sequelize.authenticate();
    logger.info('Connected to database to inspect and clean indexes...');

    const [tables] = await sequelize.query("SHOW TABLES");
    const dbName = sequelize.config.database;

    for (const row of tables) {
      const tableName = Object.values(row)[0];
      const [indexes] = await sequelize.query(`SHOW INDEX FROM \`${tableName}\``);

      // Group indexes by Column_name
      const indexMap = {};
      for (const idx of indexes) {
        const keyName = idx.Key_name;
        if (keyName === 'PRIMARY') continue;

        if (!indexMap[idx.Column_name]) {
          indexMap[idx.Column_name] = [];
        }
        if (!indexMap[idx.Column_name].includes(keyName)) {
          indexMap[idx.Column_name].push(keyName);
        }
      }

      for (const [col, keyList] of Object.entries(indexMap)) {
        if (keyList.length > 1) {
          logger.info(`Table '${tableName}', column '${col}' has ${keyList.length} duplicate indexes: ${keyList.join(', ')}`);
          // Keep the first one, drop the rest
          for (let i = 1; i < keyList.length; i++) {
            const dropKey = keyList[i];
            try {
              logger.info(`Dropping duplicate index '${dropKey}' on table '${tableName}'...`);
              await sequelize.query(`ALTER TABLE \`${tableName}\` DROP INDEX \`${dropKey}\``);
            } catch (err) {
              logger.warn(`Could not drop index ${dropKey}: ${err.message}`);
            }
          }
        }
      }
    }

    logger.info('Duplicate indexes cleanup complete!');
    process.exit(0);
  } catch (err) {
    logger.error(`Index cleanup failed: ${err.message}`);
    process.exit(1);
  }
}

fixIndexes();
