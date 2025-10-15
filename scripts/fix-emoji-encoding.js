const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function fixEmojiEncoding() {
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
    charset: 'utf8mb4',
  };

  console.log('Connecting to database with utf8mb4 charset...');
  const connection = await mysql.createConnection(config);

  try {
    // Convert database to utf8mb4
    console.log('Converting database to utf8mb4...');
    await connection.query(`ALTER DATABASE ${config.database} CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci`);
    console.log('✓ Database charset updated');

    // Convert post_types table
    console.log('Converting post_types table...');
    await connection.query(`ALTER TABLE post_types CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log('✓ post_types table charset updated');

    // Fix existing icons
    console.log('Fixing icon for default "post" post type...');
    await connection.query(
      `UPDATE post_types SET icon = ? WHERE name = 'post'`,
      ['📝']
    );

    // Check for portfolio
    const [portfolioCheck] = await connection.query(
      'SELECT id FROM post_types WHERE name = ?',
      ['portfolio']
    );

    if (portfolioCheck.length > 0) {
      console.log('Fixing icon for "portfolio" post type...');
      await connection.query(
        `UPDATE post_types SET icon = ? WHERE name = 'portfolio'`,
        ['🎨']
      );
    }

    // Verify changes
    const [postTypes] = await connection.query('SELECT name, icon FROM post_types');
    console.log('\n✅ All icons fixed!');
    console.log('\nPost Types:');
    postTypes.forEach(pt => {
      console.log(`  ${pt.icon} ${pt.name}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

fixEmojiEncoding();

