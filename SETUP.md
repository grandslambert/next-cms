# Quick Setup Guide

Follow these steps to get your CMS up and running quickly.

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up MySQL Database

### Create the database:

```bash
mysql -u root -p
```

Then run:

```sql
CREATE DATABASE nextcms;
exit;
```

### Import the schema:

```bash
mysql -u root -p nextcms < database/schema.sql
```

### (Optional) Add sample data:

```bash
mysql -u root -p nextcms < database/seed.sql
```

## Step 3: Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=nextcms

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-key-change-this

# Upload
UPLOAD_DIR=./public/uploads
```

**Important:** Generate a secure `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

## Step 4: Start the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Step 5: Login to Admin Panel

1. Go to [http://localhost:3000/admin](http://localhost:3000/admin)
2. Use the default credentials:
   - Email: `admin@example.com`
   - Password: `admin123`

⚠️ **Change the password immediately after first login!**

## Step 6: Start Creating Content

1. **Create a Post**: Admin → Posts → New Post
2. **Create a Page**: Admin → Pages → New Page
3. **Upload Media**: Admin → Media → Upload Files

## Common Issues

### Database Connection Error

- Verify MySQL is running: `sudo systemctl status mysql`
- Check your `.env` credentials
- Ensure the database exists: `SHOW DATABASES;`

### Port Already in Use

Change the port in package.json or run:
```bash
npm run dev -- -p 3001
```

### Module Not Found

Clear cache and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Production Deployment

### Build the application:

```bash
npm run build
npm start
```

### Update the admin password:

1. Hash a new password:
```bash
node scripts/hash-password.js your-new-password
```

2. Update in database:
```sql
UPDATE users SET password = 'hashed-password-here' WHERE email = 'admin@example.com';
```

Or better yet, change it through the admin panel:
- Go to Admin → Users
- Click "Edit" on the admin user
- Enter a new password
- Click "Update User"

## Next Steps

- Customize the theme in `tailwind.config.ts`
- Add more pages and posts
- Configure your domain and SSL
- Set up automated backups
- Enable analytics

Enjoy your new CMS! 🎉

