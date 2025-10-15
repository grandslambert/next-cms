const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function addPostTypes() {
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
    // Create post_types table
    console.log('Creating post_types table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS post_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        label VARCHAR(255) NOT NULL,
        singular_label VARCHAR(255) NOT NULL,
        description TEXT,
        icon VARCHAR(50),
        supports JSON,
        public BOOLEAN DEFAULT TRUE,
        menu_position INT DEFAULT 5,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name)
      )
    `);
    console.log('✓ post_types table created');

    // Check if post_type column exists
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'posts' AND COLUMN_NAME = 'post_type'`,
      [config.database]
    );

    if (columns.length === 0) {
      console.log('Adding post_type column to posts table...');
      await connection.query(`
        ALTER TABLE posts 
        ADD COLUMN post_type VARCHAR(100) DEFAULT 'post' AFTER id,
        ADD INDEX idx_post_type (post_type)
      `);
      console.log('✓ post_type column added');
    } else {
      console.log('✓ post_type column already exists');
    }

    // Insert default 'post' post type
    console.log('Creating default "post" post type...');
    await connection.query(`
      INSERT INTO post_types (name, label, singular_label, description, icon, supports, menu_position) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE label = VALUES(label)
    `, [
      'post',
      'Posts',
      'Post',
      'Regular blog posts',
      '📝',
      JSON.stringify({
        title: true,
        content: true,
        excerpt: true,
        featured_image: true,
        categories: true
      }),
      5
    ]);
    console.log('✓ Default post type created');

    console.log('\n✅ Custom post types feature ready!');
    console.log('\nYou can now:');
    console.log('1. Go to Settings → Post Types to create custom post types');
    console.log('2. Create posts with different post types');
    console.log('3. See custom post types in the admin menu');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

addPostTypes();

