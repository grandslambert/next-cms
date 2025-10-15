const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Load .env file manually
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('.env file not found');
    process.exit(1);
  }
  
  const envConfig = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envConfig.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  return envVars;
}

// Update .env file with new SESSION_TIMEOUT value
function updateEnvFile(newTimeout) {
  const envPath = path.join(__dirname, '..', '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  const sessionTimeoutRegex = /^SESSION_TIMEOUT=.*/m;
  
  if (sessionTimeoutRegex.test(envContent)) {
    // Update existing SESSION_TIMEOUT
    envContent = envContent.replace(sessionTimeoutRegex, `SESSION_TIMEOUT=${newTimeout}`);
  } else {
    // Add SESSION_TIMEOUT to end of file
    if (!envContent.endsWith('\n')) {
      envContent += '\n';
    }
    envContent += `SESSION_TIMEOUT=${newTimeout}\n`;
  }
  
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log(`✓ Updated .env with SESSION_TIMEOUT=${newTimeout}`);
}

async function syncSessionTimeout() {
  const env = loadEnv();
  
  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  });

  try {
    console.log('Connected to database');

    // Fetch session_timeout setting from database
    const [rows] = await connection.query(
      'SELECT setting_value FROM settings WHERE setting_key = ?',
      ['session_timeout']
    );

    if (rows.length === 0) {
      console.error('session_timeout setting not found in database');
      process.exit(1);
    }

    const timeoutMinutes = parseInt(rows[0].setting_value);
    const timeoutSeconds = timeoutMinutes * 60; // Convert to seconds

    console.log(`\nDatabase setting: ${timeoutMinutes} minutes`);
    console.log(`Converting to: ${timeoutSeconds} seconds`);

    // Update .env file
    updateEnvFile(timeoutSeconds);

    console.log('\n✅ Session timeout successfully synced!');
    console.log('⚠️  Please restart your development server for changes to take effect.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

syncSessionTimeout();

