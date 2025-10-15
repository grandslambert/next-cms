/**
 * Password hashing utility
 * Run: node scripts/hash-password.js <your-password>
 */

const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.error('❌ Please provide a password');
  console.log('Usage: node scripts/hash-password.js <your-password>');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);

console.log('\n✅ Password hashed successfully!');
console.log('\nHashed password:');
console.log(hash);
console.log('\nUse this in your SQL update query:');
console.log(`UPDATE users SET password = '${hash}' WHERE email = 'admin@example.com';`);
console.log('');

