# Environment Setup for MongoDB

## Required Environment Variables

Add these to your `.env` file in the project root:

```env
# MongoDB Configuration (Primary Database)
MONGODB_URI=mongodb://localhost:27017/next_cms

# For MongoDB Atlas (Cloud):
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/next_cms?retryWrites=true&w=majority

# For cPanel MongoDB:
# MONGODB_URI=mongodb://127.0.0.1:27017/username_nextcms

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_a_random_32_character_secret_here

# Node Environment
NODE_ENV=development

# Test Credentials (for API tests)
TEST_USER=superadmin
TEST_PASS=your_secure_password
```

## Generate NEXTAUTH_SECRET

Run one of these commands:

```bash
# On Linux/Mac:
openssl rand -base64 32

# On Windows (PowerShell):
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

# Or use Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## MongoDB Connection Strings

### Local Development
```
MONGODB_URI=mongodb://localhost:27017/next_cms
```

### MongoDB Atlas (Cloud - Free Tier Available)
1. Sign up at https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get connection string from "Connect" button
4. Format: `mongodb+srv://username:password@cluster.mongodb.net/next_cms`

### cPanel with MongoDB
```
MONGODB_URI=mongodb://127.0.0.1:27017/username_nextcms
```

Note: Contact your hosting provider to enable MongoDB on cPanel

## Installation Steps

1. Copy this configuration to your `.env` file
2. Update the MongoDB URI with your credentials
3. Install dependencies: `npm install`
4. Initialize the database: `npm run db:init` (coming soon)
5. Start the application: `npm run dev`

## Transition from MySQL

If you're migrating from MySQL:

1. Keep both `DB_*` and `MONGODB_URI` variables during transition
2. Use the migration script: `npm run migrate:mysql-to-mongo` (coming soon)
3. Test thoroughly before removing MySQL configuration
4. MySQL support will be maintained for backward compatibility

