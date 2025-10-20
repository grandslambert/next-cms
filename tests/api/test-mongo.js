const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/next_cms';

console.log('ðŸ” Testing MongoDB Connection...');
console.log('ðŸ“ Connection URI:', MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'));

async function testConnection() {
  try {
    console.log('\nâ³ Attempting to connect...');
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    
    console.log('âœ… Successfully connected to MongoDB!');
    console.log('ðŸ“Š Connection details:');
    console.log('   - Host:', mongoose.connection.host);
    console.log('   - Port:', mongoose.connection.port);
    console.log('   - Database:', mongoose.connection.name);
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nðŸ“š Existing collections:', collections.length);
    if (collections.length > 0) {
      collections.forEach(col => console.log(`   - ${col.name}`));
    } else {
      console.log('   (No collections yet - database is empty)');
    }
    
    console.log('\nâœ¨ MongoDB is ready for Next CMS!');
    console.log('\nðŸ“ Next steps:');
    console.log('   1. Run: npm run db:init');
    console.log('   2. Run: npm run dev');
    
  } catch (error) {
    console.error('\nâŒ Connection failed!');
    console.error('Error:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\nðŸ”§ MongoDB is not running. Start it with:');
      console.log('   Docker: docker run -d -p 27017:27017 --name mongodb mongo:latest');
      console.log('   Or install MongoDB locally');
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nðŸ”Œ Disconnected');
  }
}

testConnection();
