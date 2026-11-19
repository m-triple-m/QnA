'use strict';

/**
 * Script to create the first admin user in QuizLive.
 * Usage:
 *   node src/scripts/createAdmin.js --name="Admin" --email="admin@example.com" --password="SecurePass123"
 */

require('../config/env');
const { sequelize } = require('../config/db');
const { User } = require('../models');
const logger = require('../config/logger');

// Parse CLI arguments
function parseArgs() {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx !== -1) {
        const key = arg.slice(2, eqIdx).trim();
        const value = arg.slice(eqIdx + 1).replace(/^["']|["']$/g, '').trim();
        args[key] = value;
      } else {
        const key = arg.slice(2).trim();
        const nextArg = process.argv[i + 1];
        if (nextArg && !nextArg.startsWith('--')) {
          args[key] = nextArg.replace(/^["']|["']$/g, '').trim();
          i++;
        } else {
          args[key] = true;
        }
      }
    }
  }
  return args;
}

async function createAdmin() {
  const args = parseArgs();

  const name = args.name || process.env.ADMIN_NAME || 'Admin';
  const email = (args.email || process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = args.password || process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Error: Email and password are required.');
    console.log('\nUsage:');
    console.log('  node src/scripts/createAdmin.js --name="Admin" --email="admin@example.com" --password="SecurePass123"\n');
    process.exit(1);
  }

  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');

    // Ensure database tables exist
    await sequelize.sync();

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      console.log(`\n[INFO] User with email "${email}" already exists (role: ${existingUser.role}). No changes made.\n`);
      process.exit(0);
    }

    // Hash password and create user
    const password_hash = await User.hashPassword(password);
    const newAdmin = await User.create({
      name,
      email,
      password_hash,
      role: 'admin',
      is_active: true,
    });

    console.log('\n========================================');
    console.log('✅ Admin user created successfully!');
    console.log('========================================');
    console.log(`  ID:    ${newAdmin.id}`);
    console.log(`  Name:  ${newAdmin.name}`);
    console.log(`  Email: ${newAdmin.email}`);
    console.log(`  Role:  ${newAdmin.role}`);
    console.log('========================================\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Failed to create admin user:', err.message);
    if (err.errors) {
      err.errors.forEach((e) => console.error(`  - ${e.message}`));
    }
    process.exit(1);
  }
}

createAdmin();
