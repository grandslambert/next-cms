# Next CMS Setup Guide

## Prerequisites

- Node.js 18+ and npm
- MySQL 8.0+
- Git (for cloning the repository)

## Installation Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd next-cms
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-generate-with-openssl-rand-base64-32

# Optional: Node Environment
NODE_ENV=development
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 4. Create Database

Connect to MySQL and create your database:

```sql
CREATE DATABASE your_database_name CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. Initialize Database Schema

Run the schema script to create all tables and default data:

```bash
mysql -u your_database_user -p your_database_name < database/schema.sql
```

**Or using MySQL Workbench/phpMyAdmin:**
1. Open `database/schema.sql`
2. Execute the entire script in your database

This will create:
- Global tables (users, roles, sites, etc.)
- Site 1 tables (site_1_posts, site_1_media, etc.)
- Default roles (Super Admin, Admin, Editor, Author)
- Default Site 1
- Super Administrator account
- Site Administrator account for Site 1

### 6. Default Login Credentials

After running the schema, you'll have two default accounts:

**Super Administrator (manages all sites and users):**
- Username: `superadmin`
- Password: `SuperAdmin123!`
- Access: Full system access, can create sites and assign users

**Site Administrator (manages Site 1):**
- Username: `siteadmin`
- Password: `SiteAdmin123!`
- Access: Full access to Site 1 content and settings

**⚠️ IMPORTANT:** Change these passwords immediately after first login!

### 7. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 8. First Login

1. Navigate to [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
2. Log in with either default account
3. **Immediately change your password** via the user profile

### 9. Initial Configuration

#### As Super Administrator:

1. **Change Password**: Click your name → Update password
2. **Update Profile**: Add your real email and name
3. **Review Sites**: Navigate to Sites to see Site 1
4. **Create Additional Sites**: Click "+ Create Site" if needed
5. **Manage Users**: Navigate to Users to create/assign users

#### As Site Administrator:

1. **Change Password**: Click your name → Update password
2. **Update Profile**: Add your real email and name
3. **Configure Site Settings**: Navigate to Settings
4. **Create Content**: Start adding posts, pages, and media
5. **Manage Users**: Create users for your site

## Multi-Site Architecture

The system is designed as multi-site from the ground up:

### Site Isolation

- Each site has its own set of database tables (`site_1_*`, `site_2_*`, etc.)
- Content, media, menus, and settings are completely isolated per site
- Users are global but assigned to specific sites with specific roles

### User Roles

**Super Administrator:**
- Manages the entire system
- Can create/delete sites
- Can create users and assign them to any site
- Sees all users globally
- No access to site-specific content (by design - they manage infrastructure)

**Site Administrator:**
- Full access to their assigned site(s)
- Can create/manage content on their site
- Can create users (automatically assigned to their current site)
- Sees only users assigned to their site
- Can switch between multiple sites if assigned to more than one

**Editor/Author:**
- Access to content management on assigned site(s)
- Limited administrative capabilities
- Can switch sites if assigned to multiple

## Directory Structure

```
next-cms/
├── app/                    # Next.js app directory
│   ├── (public)/          # Public-facing pages
│   ├── admin/             # Admin interface
│   └── api/               # API routes
├── components/            # React components
│   ├── admin/            # Admin components
│   └── public/           # Public components
├── database/             # Database files
│   ├── schema.sql        # Main database schema (RUN THIS)
│   └── site-tables-template.sql  # Template for new sites
├── lib/                  # Utility libraries
├── hooks/                # React hooks
├── types/                # TypeScript types
└── public/              # Static files
    └── uploads/         # Uploaded media (auto-created)
        └── site_1/      # Site 1 media folder
```

## Creating Additional Sites

### As Super Administrator:

1. Navigate to **Sites** in admin
2. Click **"+ Create Site"**
3. Enter site details (name, display name, description)
4. System automatically creates all site-specific tables
5. Navigate to the new site and click **"👥 Users"**
6. Assign users to the site with appropriate roles

## Adding Users to Sites

### Super Admin Workflow:

1. **Create User**: Navigate to Users → All Users → + New User
2. **Assign to Site**: Navigate to Sites → [Site Name] → 👥 Users
3. Click **"+ Assign User"**
4. Select user and role
5. User can now log in and access that site

### Site Admin Workflow:

1. **Create User**: Navigate to Users → All Users → + New User
2. **User Auto-Assigned**: User is automatically assigned to your current site
3. User can immediately log in and access the site

## Troubleshooting

### Database Connection Error

**Problem**: Can't connect to database

**Solutions:**
- Verify MySQL is running
- Check credentials in `.env.local`
- Ensure database exists
- Check MySQL user has proper permissions

### Schema Import Errors

**Problem**: Errors when running schema.sql

**Solutions:**
- Ensure you're using MySQL 8.0+
- Check database character set is utf8mb4
- Run script as user with CREATE TABLE permissions
- Try importing in smaller chunks if timeout occurs

### Login Issues

**Problem**: Can't log in with default credentials

**Solutions:**
- Verify you ran the schema.sql completely
- Check users table: `SELECT * FROM users;`
- Try resetting password using `scripts/hash-password.js`
- Ensure NEXTAUTH_SECRET is set in `.env.local`

### Permission Denied

**Problem**: User can't access certain features

**Solutions:**
- Check user's role permissions in database
- Verify user is assigned to the correct site
- Super admins only see Sites and Users (by design)
- Regular admins need to be assigned to sites

### Media Upload Fails

**Problem**: Can't upload images

**Solutions:**
- Check `public/uploads/site_1/` directory exists and is writable
- Verify upload size limits in Next.js config
- Check file permissions on server
- Review browser console for errors

## Production Deployment

### Environment Variables

Update `.env.local` for production:

```env
NODE_ENV=production
NEXTAUTH_URL=https://yourdomain.com
DB_HOST=your-production-db-host
# ... other production values
```

### Security Checklist

- [ ] Change all default passwords
- [ ] Update NEXTAUTH_SECRET to a strong random value
- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS/SSL
- [ ] Set up database backups
- [ ] Configure firewall rules
- [ ] Review user permissions
- [ ] Set up monitoring and logging
- [ ] Disable debug mode in production
- [ ] Secure file upload directories

### Build for Production

```bash
npm run build
npm start
```

Or use a process manager like PM2:

```bash
npm install -g pm2
pm2 start npm --name "next-cms" -- start
```

## Additional Resources

- [Multi-Site Architecture](./MULTI_SITE.md)
- [Super Admin Interface](./SUPER_ADMIN_INTERFACE.md)
- [Site User Management](./SITE_USER_MANAGEMENT.md)
- [User Switching](./USER_SWITCHING.md)
- [Features Documentation](./FEATURES.md)

## Support

For issues or questions:
1. Check the documentation files
2. Review the changelog (CHANGELOG.md)
3. Check existing issues on GitHub
4. Create a new issue with details

## Next Steps

1. ✅ Set up database and run schema
2. ✅ Log in with default accounts
3. ✅ Change default passwords
4. ✅ Configure site settings
5. ✅ Create your first content
6. ✅ Add users and assign roles
7. ✅ Explore the multi-site features
8. ✅ Customize and enjoy!
