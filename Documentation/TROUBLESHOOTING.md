# Troubleshooting Guide

## Common Issues and Solutions

### Database Connection Issues

#### Error: "Access denied for user"

**Solution:**
1. Check your `.env` file credentials
2. Verify MySQL user exists and has correct password
3. Grant proper permissions:

```sql
GRANT ALL PRIVILEGES ON nextcms.* TO 'your_user'@'localhost';
FLUSH PRIVILEGES;
```

#### Error: "Unknown database 'nextcms'"

**Solution:**
```sql
CREATE DATABASE nextcms;
```

Then import the schema:
```bash
mysql -u root -p nextcms < database/schema.sql
```

#### Error: "Can't connect to MySQL server"

**Solution:**
1. Check if MySQL is running:
   ```bash
   # Linux/Mac
   sudo systemctl status mysql
   # or
   sudo service mysql status
   
   # Windows
   # Check Services app for MySQL service
   ```

2. Start MySQL if not running:
   ```bash
   # Linux/Mac
   sudo systemctl start mysql
   # or
   sudo service mysql start
   ```

### Authentication Issues

#### Error: "Invalid credentials" when logging in

**Solution:**
1. Ensure the default admin user exists in database:
   ```sql
   SELECT * FROM users WHERE email = 'admin@example.com';
   ```

2. If user doesn't exist, import schema again:
   ```bash
   mysql -u root -p nextcms < database/schema.sql
   ```

3. Reset password if needed:
   ```bash
   node scripts/hash-password.js newpassword123
   ```
   Then update in database with the generated hash.

#### Error: "NEXTAUTH_SECRET must be provided"

**Solution:**
Add to your `.env` file:
```env
NEXTAUTH_SECRET=your-generated-secret-here
```

Generate a secure secret:
```bash
openssl rand -base64 32
```

#### Session expires immediately

**Solution:**
1. Clear browser cookies
2. Check NEXTAUTH_URL in `.env` matches your app URL
3. Restart the development server

### Build and Installation Issues

#### Error: "Module not found"

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json .next
npm install
```

#### Error: "Port 3000 already in use"

**Solution:**
```bash
# Option 1: Use different port
npm run dev -- -p 3001

# Option 2: Kill process on port 3000
# Linux/Mac
lsof -ti:3000 | xargs kill -9

# Windows (PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process
```

#### TypeScript errors during build

**Solution:**
```bash
# Update TypeScript
npm install -D typescript@latest

# Check for type errors
npx tsc --noEmit
```

### Media Upload Issues

#### Error: "Failed to upload files"

**Solution:**
1. Check upload directory exists and is writable:
   ```bash
   mkdir -p public/uploads
   chmod 755 public/uploads
   ```

2. Check file size limits in `next.config.js`

3. Verify file type is allowed in the media API route

#### Uploaded images not displaying

**Solution:**
1. Check file path in database matches actual file location
2. Verify files are in `public/uploads/` directory
3. Check browser console for 404 errors
4. Ensure Next.js is serving static files correctly

### API Issues

#### Error: "Unauthorized" on API calls

**Solution:**
1. Ensure you're logged in
2. Check session is valid
3. Verify middleware.ts is correctly configured
4. Check API route authorization logic

#### Error: "Failed to fetch"

**Solution:**
1. Check network tab in browser DevTools
2. Verify API route exists
3. Check for CORS issues
4. Ensure database connection is working

### Rich Text Editor Issues

#### Editor not loading or blank

**Solution:**
1. The editor uses dynamic import. Check browser console for errors.
2. Clear browser cache
3. Verify react-quill is installed:
   ```bash
   npm install react-quill
   ```

4. Check if CSS is loading properly

#### Content not saving

**Solution:**
1. Check browser console for errors
2. Verify API endpoint is working
3. Check database field size limits (TEXT type can hold large content)

### Production Deployment Issues

#### Build succeeds but app crashes on start

**Solution:**
1. Check environment variables are set in production
2. Verify database is accessible from production server
3. Check logs for specific errors:
   ```bash
   npm run build
   npm start 2>&1 | tee deploy.log
   ```

#### Static files not loading

**Solution:**
1. Ensure `public/` directory is deployed
2. Check your hosting platform's static file configuration
3. Verify CDN/reverse proxy settings if using one

#### Database connection timeout in production

**Solution:**
1. Increase connection pool size in `lib/db.ts`
2. Check firewall rules for database port (3306)
3. Verify database server is accessible from app server
4. Use connection string with proper SSL settings if required

### Performance Issues

#### Slow page loads

**Solution:**
1. Enable production mode:
   ```bash
   npm run build
   npm start
   ```

2. Optimize database queries - add indexes
3. Implement pagination for large datasets
4. Use Redis for session storage (advanced)

#### High memory usage

**Solution:**
1. Reduce database connection pool size
2. Implement proper cleanup in API routes
3. Check for memory leaks in React components
4. Use production build instead of dev mode

## Debugging Tips

### Enable Debug Logging

Add to `.env`:
```env
DEBUG=true
NODE_ENV=development
```

### Check Application Logs

Development:
```bash
npm run dev 2>&1 | tee app.log
```

### Database Query Debugging

Add to `lib/db.ts`:
```typescript
pool.on('connection', (connection) => {
  console.log('DB Connection established');
});

pool.on('error', (err) => {
  console.error('DB Pool Error:', err);
});
```

### API Route Debugging

Add console.logs in API routes:
```typescript
console.log('Request:', request.method, request.url);
console.log('Body:', await request.json());
```

### Browser DevTools

1. Open DevTools (F12)
2. Check Console tab for errors
3. Check Network tab for failed requests
4. Check Application tab for session/cookies

## Getting Help

If you've tried everything and still have issues:

1. **Check existing issues** on GitHub
2. **Create a new issue** with:
   - Error message (full stack trace)
   - Steps to reproduce
   - Environment details (OS, Node version, MySQL version)
   - Relevant code snippets
3. **Include logs** from console and server

## Preventive Measures

### Regular Maintenance

1. Keep dependencies updated:
   ```bash
   npm outdated
   npm update
   ```

2. Regular database backups:
   ```bash
   mysqldump -u root -p nextcms > backup-$(date +%Y%m%d).sql
   ```

3. Monitor disk space for uploads:
   ```bash
   du -sh public/uploads
   ```

### Security Checks

1. Change default admin password
2. Use strong NEXTAUTH_SECRET
3. Keep MySQL password secure
4. Regularly update dependencies for security patches

### Performance Monitoring

1. Monitor database query performance
2. Check application logs regularly
3. Set up uptime monitoring in production
4. Use APM tools (optional) for detailed insights

## Still Having Issues?

Make sure you've:
- [ ] Followed the installation guide exactly
- [ ] Set up all environment variables
- [ ] Created the database and imported schema
- [ ] Installed all dependencies
- [ ] Checked file permissions
- [ ] Reviewed error messages carefully
- [ ] Checked this troubleshooting guide
- [ ] Searched for similar issues online

If the issue persists, create a detailed bug report with all relevant information.

