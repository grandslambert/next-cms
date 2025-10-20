# Next CMS - Quick Start Guide

## New MongoDB Installation

Next CMS now uses MongoDB as its primary database. Follow these steps for a fresh installation.

## Prerequisites

- **Node.js 18+** (check with `node --version`)
- **MongoDB** (local, Docker, or MongoDB Atlas)
- **npm** or **yarn**

## Installation Steps

### 1. Clone or Download

```bash
# If using git
git clone <your-repo-url> next-cms
cd next-cms

# Or download and extract the ZIP file
```

### 2. Install Dependencies

```bash
npm install
```

This installs all required packages including:
- Next.js 14
- Mongoose (MongoDB ODM)
- NextAuth (authentication)
- React Query
- And all other dependencies

### 3. Setup MongoDB

Choose one option:

**Option A: Local MongoDB**
```bash
# Install MongoDB
# Mac: brew install mongodb-community
# Ubuntu: sudo apt install mongodb
# Windows: Download from mongodb.com

# Start MongoDB
mongod
```

**Option B: Docker (Easiest for Development)**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**Option C: MongoDB Atlas (Free Cloud)**
1. Sign up at https://www.mongodb.com/cloud/atlas
2. Create a free cluster (M0 Sandbox)
3. Add your IP to the whitelist
4. Get your connection string
5. It will look like: `mongodb+srv://username:password@cluster.mongodb.net/next_cms`

### 4. Configure Environment

Create a `.env` file in the project root:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/next_cms

# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/next_cms

# NextAuth Configuration (REQUIRED)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_a_long_random_string_here

# Node Environment
NODE_ENV=development
```

**Generate NEXTAUTH_SECRET:**
```bash
# Linux/Mac:
openssl rand -base64 32

# Windows (PowerShell):
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 5. Initialize Database

```bash
npm run db:init
```

This creates:
- ✅ 7 default roles (super_admin, admin, editor, author, contributor, subscriber, guest)
- ✅ Default site
- ✅ Super admin user
- ✅ All necessary indexes

**Default Credentials:**
- Username: `superadmin`
- Password: `SuperAdmin123!`
- Email: `admin@example.com`

⚠️ **Important:** Change this password immediately after first login!

### 6. Start Development Server

```bash
npm run dev
```

Open your browser to: **http://localhost:3000**

### 7. Login

Go to: **http://localhost:3000/admin/login**

Use the default credentials from step 5.

### 8. Secure Your Installation

After logging in:
1. Go to **Users** → Edit super admin
2. Change the password
3. Update the email address
4. Add your profile information

## Production Deployment

### Build for Production

```bash
npm run build
npm start
```

### Environment Variables for Production

Update your `.env` for production:

```env
MONGODB_URI=<your-production-mongodb-uri>
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=<strong-secret-for-production>
NODE_ENV=production
```

### Server Requirements

- **Node.js 18+**
- **MongoDB 5.0+** (hosted or local)
- **Memory**: 512MB minimum, 1GB+ recommended
- **Storage**: 500MB minimum for application + your content

## Common Issues & Solutions

### MongoDB Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:** MongoDB is not running. Start MongoDB service or check your Docker container.

### NEXTAUTH_SECRET Missing
```
Error: Please add your NEXTAUTH_SECRET to .env file
```
**Solution:** Add `NEXTAUTH_SECRET` to your `.env` file (see step 4).

### Cannot Find Module 'mongoose'
```
Error: Cannot find module 'mongoose'
```
**Solution:** Run `npm install`

### Port 3000 Already in Use
```
Error: Port 3000 is already in use
```
**Solution:** 
- Stop other applications using port 3000, or
- Change the port: `PORT=3001 npm run dev`

### Database Already Initialized
```
⚠️ Database already initialized. Use --clear to reset.
```
**Solution:** If you want to reinitialize (⚠️ THIS DELETES ALL DATA):
```bash
npm run db:init:clear
```

## Next Steps

After installation:

1. **Create Content Types** - Go to Content Types → Post Types
2. **Create Taxonomies** - Go to Content Types → Taxonomies  
3. **Add Users** - Go to Users to invite team members
4. **Setup Menus** - Go to Navigation to create menus
5. **Upload Media** - Go to Media to add images
6. **Create Posts** - Start creating content!

## Documentation

- 📘 [MongoDB Setup Details](Documentation/MONGODB_GETTING_STARTED.md)
- 📙 [Environment Configuration](Documentation/ENV_SETUP.md)
- 📗 [Features Guide](Documentation/FEATURES.md)
- 📕 [Troubleshooting](Documentation/TROUBLESHOOTING.md)

## Project Structure

```
next-cms/
├── app/                    # Next.js app directory
│   ├── (public)/          # Public site routes
│   ├── admin/             # Admin dashboard
│   └── api/               # API routes
├── components/            # React components
├── lib/
│   ├── mongodb.ts         # MongoDB connection
│   ├── models/            # Mongoose models
│   └── auth.ts            # Authentication
├── scripts/
│   └── init-mongodb.ts    # Database initialization
├── Documentation/         # Complete documentation
└── .env                   # Your configuration (create this)
```

## Development Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

npm run db:init          # Initialize database
npm run db:init:clear    # Reinitialize (deletes all data)
```

## Getting Help

- 📖 Check `Documentation/` folder for detailed guides
- 🐛 Review `Documentation/TROUBLESHOOTING.md` for common issues
- 📊 See `MONGODB_STATUS.md` for project status

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** MongoDB with Mongoose
- **Auth:** NextAuth.js
- **UI:** React 18 + Tailwind CSS
- **Language:** TypeScript
- **State:** React Query (TanStack Query)

---

**Need Help?** Check the `Documentation/` folder for detailed guides on all features.

**Version:** 2.3.4 - MongoDB Edition

