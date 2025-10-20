# Getting Started with MongoDB Version

## What We've Built So Far

✅ **Phase 1: Foundation - COMPLETE**

We've created the foundational MongoDB infrastructure for Next CMS:

### 1. MongoDB Connection Layer
- `lib/mongodb.ts` - Connection management with caching
- `getSiteCollection()` helper for multi-site support
- Connection reuse to prevent exhausting connections

### 2. Core Data Models
Created Mongoose schemas for foundational entities:
- **User** (`lib/models/User.ts`) - User accounts with authentication
- **Site** (`lib/models/Site.ts`) - Multi-site support
- **Role** (`lib/models/Role.ts`) - Role-based permissions
- **SiteUser** (`lib/models/SiteUser.ts`) - Site-user assignments

### 3. Database Initialization
- `scripts/init-mongodb.ts` - Sets up fresh database with:
  - 7 default roles (super_admin, admin, editor, author, contributor, subscriber, guest)
  - Default site
  - Super admin user
  - Proper indexes and relationships

### 4. NPM Scripts
```bash
npm run db:init          # Initialize fresh database
npm run db:init:clear    # Clear and reinitialize
npm run db:migrate       # Migrate from MySQL (coming soon)
```

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

This installs:
- `mongoose@^8.0.3` - MongoDB ODM
- `dotenv@^16.3.1` - Environment variables
- `ts-node@^10.9.2` - TypeScript execution
- Other required packages

### 2. Setup MongoDB

**Option A: Local MongoDB**
```bash
# Install MongoDB on your machine
# Mac: brew install mongodb-community
# Ubuntu: sudo apt-get install mongodb
# Windows: Download from mongodb.com

# Start MongoDB
mongod
```

**Option B: MongoDB Atlas (Free Cloud)**
1. Sign up at https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get connection string
4. Whitelist your IP address

**Option C: Docker**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 3. Configure Environment

Create or update your `.env` file:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/next_cms

# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/next_cms

# NextAuth (required)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_32_character_secret_here

# Node Environment
NODE_ENV=development
```

Generate `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 4. Initialize Database

```bash
npm run db:init
```

This creates:
- Default roles
- Super admin user (username: `superadmin`, password: `SuperAdmin123!`)
- Default site
- All necessary indexes

**Important:** Change the super admin password immediately after first login!

### 5. Start the Application

```bash
npm run dev
```

Visit: http://localhost:3000/admin/login

Login with:
- Username: `superadmin`
- Password: `SuperAdmin123!`

## What's Next?

### Phase 2: Core Data Layer (In Progress)
- [ ] Convert authentication system to use MongoDB
- [ ] Update NextAuth configuration
- [ ] Convert user management APIs
- [ ] Convert site management APIs

### Phase 3-8: Full Migration
See `Documentation/MONGODB_MIGRATION.md` for complete roadmap

## File Structure

```
lib/
├── mongodb.ts              # MongoDB connection
├── models/
│   ├── index.ts           # Model exports
│   ├── User.ts            # User model
│   ├── Site.ts            # Site model
│   ├── Role.ts            # Role model
│   └── SiteUser.ts        # Site-user assignments
scripts/
├── init-mongodb.ts        # Database initialization
└── migrate-mysql-to-mongo.ts  # Migration script (TODO)
Documentation/
├── MONGODB_MIGRATION.md   # Full migration plan
├── MONGODB_GETTING_STARTED.md  # This file
└── ENV_SETUP.md          # Environment configuration
```

## Current Status

✅ **Working:**
- MongoDB connection layer
- Core models defined
- Database initialization script
- Multi-site architecture design

🚧 **In Progress:**
- Authentication system migration
- API route conversion
- Data migration tools

❌ **Not Yet Started:**
- Content management (posts, pages)
- Media library
- Menus and navigation
- Admin UI updates

## Testing MongoDB Connection

Create a test file `test-mongo.ts`:

```typescript
import connectDB from './lib/mongodb';
import { User } from './lib/models';

async function test() {
  await connectDB();
  const users = await User.find();
  console.log('Users:', users.length);
  process.exit(0);
}

test();
```

Run: `npx ts-node test-mongo.ts`

## Common Issues

### 1. Connection Refused
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:** MongoDB is not running. Start MongoDB service.

### 2. Authentication Failed
```
Error: Authentication failed
```
**Solution:** Check MONGODB_URI username/password are correct.

### 3. Cannot Find Module 'mongoose'
```
Error: Cannot find module 'mongoose'
```
**Solution:** Run `npm install`

### 4. NEXTAUTH_SECRET Missing
```
Error: Please add your NEXTAUTH_SECRET to .env file
```
**Solution:** Add `NEXTAUTH_SECRET` to `.env` file

## Migrating from MySQL

If you have existing MySQL data:

1. Keep both databases running during transition
2. Use migration script (coming soon): `npm run db:migrate`
3. Verify data integrity
4. Switch application to MongoDB
5. Keep MySQL as backup

## cPanel Deployment

MongoDB on cPanel requires:
1. cPanel with MongoDB support (check with hosting provider)
2. SSH access to run initialization script
3. Node.js 18+ support
4. Sufficient memory (512MB+ recommended)

See `Documentation/CPANEL_MONGODB_SETUP.md` (coming soon)

## Performance Tips

1. **Indexes:** Models have indexes defined automatically
2. **Connection Pooling:** Handled by Mongoose
3. **Caching:** Connection is cached in development
4. **Queries:** Use `.lean()` for read-only queries
5. **Projections:** Select only needed fields

## Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Next.js + MongoDB](https://github.com/vercel/next.js/tree/canary/examples/with-mongodb-mongoose)

## Need Help?

Check the migration plan: `Documentation/MONGODB_MIGRATION.md`

