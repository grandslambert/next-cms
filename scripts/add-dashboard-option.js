const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function addDashboardOption() {
  const envPath = path.join(__dirname, '..', '.env');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      envVars[match[1].trim()] = match[2].trim();
    }
  });

  const config = {
    host: envVars.DB_HOST,
    user: envVars.DB_USER,
    password: envVars.DB_PASSWORD,
    database: envVars.DB_NAME,
    charset: 'utf8mb4',
  };

  console.log('Connecting to database...');
  const connection = await mysql.createConnection(config);

  try {
    // Check if column exists
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'post_types' AND COLUMN_NAME = 'show_in_dashboard'`,
      [config.database]
    );

    if (columns.length === 0) {
      console.log('Adding show_in_dashboard column...');
      await connection.query(
        'ALTER TABLE post_types ADD show_in_dashboard BOOLEAN DEFAULT TRUE AFTER public'
      );
      console.log('✓ Column added');
    } else {
      console.log('✓ show_in_dashboard column already exists');
    }

    console.log('\n✅ Dashboard option ready!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

addDashboardOption();

