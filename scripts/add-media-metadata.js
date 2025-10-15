const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function addMediaMetadata() {
  // Read .env file manually
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
  };

  console.log('Connecting to database...');
  const connection = await mysql.createConnection(config);

  try {
    // Check if columns already exist
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'media' AND COLUMN_NAME IN ('title', 'alt_text')`,
      [config.database]
    );

    const existingColumns = columns.map(c => c.COLUMN_NAME);
    
    if (!existingColumns.includes('title')) {
      console.log('Adding title column...');
      await connection.query('ALTER TABLE media ADD title VARCHAR(255) AFTER original_name');
      console.log('✓ Title column added');
    } else {
      console.log('✓ Title column already exists');
    }

    if (!existingColumns.includes('alt_text')) {
      console.log('Adding alt_text column...');
      await connection.query('ALTER TABLE media ADD alt_text VARCHAR(255) AFTER title');
      console.log('✓ Alt text column added');
    } else {
      console.log('✓ Alt text column already exists');
    }

    console.log('\n✅ Media metadata columns are ready!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

addMediaMetadata();

