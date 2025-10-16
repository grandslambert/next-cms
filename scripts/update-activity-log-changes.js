const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Manually load .env file
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      env[key.trim()] = value.trim();
    }
  });
  
  return env;
}

async function updateActivityLog() {
  const env = loadEnv();
  
  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  });

  try {
    console.log('Adding changes tracking to activity_log table...');

    // Check if columns already exist
    const [columns] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'activity_log'",
      [env.DB_NAME]
    );

    const columnNames = columns.map(col => col.COLUMN_NAME);

    if (!columnNames.includes('changes_before')) {
      await connection.query(
        'ALTER TABLE activity_log ADD COLUMN changes_before JSON NULL AFTER details'
      );
      console.log('✓ Added changes_before column');
    } else {
      console.log('✓ changes_before column already exists');
    }

    if (!columnNames.includes('changes_after')) {
      await connection.query(
        'ALTER TABLE activity_log ADD COLUMN changes_after JSON NULL AFTER changes_before'
      );
      console.log('✓ Added changes_after column');
    } else {
      console.log('✓ changes_after column already exists');
    }

    console.log('\n✅ Activity log changes tracking added successfully!');
    console.log('\nThe system will now track before/after states for all changes.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

updateActivityLog();

