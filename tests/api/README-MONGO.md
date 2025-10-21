# MongoDB API Test Suite

These tests validate the SuperAdmin API endpoints work correctly with the MongoDB multi-database architecture.

## Prerequisites

1. **MongoDB running** with the multi-database setup:
   - `nextcms_global` - for users, roles, sites
   - `nextcms_site1` - for first site's content

2. **Database initialized**:
   ```bash
   npx ts-node --project tsconfig.node.json scripts/init-mongodb.ts --clear
   ```

3. **Dev server running**:
   ```bash
   npm run dev
   ```

## Running Tests

### Quick Test (SuperAdmin APIs)
```bash
node tests/api/test-superadmin-mongo.js
```

### With Custom Config
```bash
TEST_BASE_URL=http://localhost:3000 TEST_USER=superadmin TEST_PASS=SuperAdmin123! node tests/api/test-superadmin-mongo.js
```

### Environment Variables
Create a `.env` file in the root:
```env
TEST_BASE_URL=http://localhost:3000
TEST_USER=superadmin
TEST_PASS=SuperAdmin123!
```

## What's Tested

### 1. Authentication
- ✅ Login with NextAuth credentials
- ✅ Session cookie handling

### 2. Sites API
- ✅ `GET /api/sites` - List all sites
- ✅ `POST /api/sites` - Create new site (creates new database)
- ✅ `GET /api/sites/:id` - Get single site
- ✅ `PUT /api/sites/:id` - Update site
- ✅ `DELETE /api/sites/:id` - Delete site

### 3. Users API
- ✅ `GET /api/users` - List all users
- ✅ `POST /api/users` - Create new user
- ✅ `GET /api/users/:id` - Get single user
- ✅ `PUT /api/users/:id` - Update user
- ✅ `DELETE /api/users/:id` - Delete user

### 4. Roles API
- ✅ `GET /api/roles` - List all roles

## Database Architecture Validation

These tests specifically validate:

1. **Global Database** (`nextcms_global`)
   - Sites are created with sequential `id` field
   - Users and roles are stored globally
   - Activity logs for SuperAdmin actions

2. **Site Databases** (`nextcms_site{id}`)
   - New database created when site is created
   - Database name matches site's numeric `id`
   - Site defaults initialized (post types, taxonomies, etc.)

3. **Model Factory**
   - `GlobalModels` correctly access global database
   - `SiteModels(siteId)` correctly access site-specific databases
   - No cross-database pollution

## Troubleshooting

### Tests Fail with "Login failed"
- Check that MongoDB is running
- Verify init script has run successfully
- Confirm superadmin user exists: `superadmin` / `SuperAdmin123!`

### Tests Fail with "500 Internal Server Error"
- Check server logs for database connection errors
- Verify `MONGODB_URI` in `.env` is set correctly
- Ensure dev server is running

### "Site creation failed" or "Database nextcms_site2 not found"
- This is expected behavior - new databases are created on-demand
- Check MongoDB logs to see if database was created
- Verify the `initializeSiteDefaults()` function runs successfully

## Adding More Tests

To add tests for other APIs (posts, media, etc.):

1. Create a new test file: `test-[feature]-mongo.js`
2. Use the same authentication pattern
3. Get the current site ID from session
4. Use `SiteModels` in your API routes for that site

Example:
```javascript
// In your API route
const siteId = (session.user as any)?.currentSiteId;
const Post = await SiteModels.Post(siteId);
```

