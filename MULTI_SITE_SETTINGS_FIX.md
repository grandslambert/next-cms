# Multi-Site Settings Table Fix

## Issue

After migrating to multi-site, the error "Table 'nextcms.settings' doesn't exist" was appearing because several API routes were still trying to access the `settings` table without the site prefix.

## Root Cause

During the multi-site migration, the `settings` table was renamed to `site_1_settings` (and `site_2_settings`, etc. for other sites). However, several API routes were still using hardcoded `FROM settings` queries instead of using the `getSiteTable()` helper function.

## Files Fixed

### 1. **`app/api/users/route.ts`** (User Creation)
**Issue**: Password validation was trying to read password requirements from `settings` table.

**Fix**:
```typescript
// Added import
import db, { getSiteTable } from '@/lib/db';

// Get site ID and table name
const siteId = (session.user as any).currentSiteId || 1;
const settingsTable = getSiteTable(siteId, 'settings');

// Updated query
const [pwSettings] = await db.query<RowDataPacket[]>(
  `SELECT setting_key, setting_value FROM ${settingsTable} 
   WHERE setting_key IN (...)
);
```

### 2. **`app/api/users/[id]/route.ts`** (User Update)
**Issue**: Password validation during user updates was accessing `settings` table.

**Fix**: Same approach as above - get site ID, use `getSiteTable()`, and update query.

### 3. **`app/api/settings/authentication/route.ts`** (Authentication Settings)
**Issue**: Both GET and PUT endpoints were accessing `settings` table.

**Special Case**: The GET endpoint is public (used on login page without auth), so it uses site 1 by default. The PUT endpoint uses the current user's site context.

**Fix**:
```typescript
// GET endpoint (public, no session)
const settingsTable = getSiteTable(1, 'settings'); // Always use site 1 for login

// PUT endpoint (authenticated, has session)
const siteId = (session.user as any).currentSiteId || 1;
const settingsTable = getSiteTable(siteId, 'settings');

// Updated queries to use ${settingsTable}
```

Also added super admin check:
```typescript
const isSuperAdmin = (session.user as any)?.isSuperAdmin || false;
if (!isSuperAdmin && !userPermissions.manage_settings) {
  return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
}
```

### 4. **`app/api/media/regenerate/route.ts`** (Media Regeneration)
**Issue**: Image size settings were being read from `settings` table.

**Fix**:
```typescript
// Updated getImageSizes function to accept siteId
async function getImageSizes(siteId: number = 1) {
  const settingsTable = getSiteTable(siteId, 'settings');
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT setting_value FROM ${settingsTable} WHERE setting_key = 'image_sizes'`
  );
  // ...
}

// In POST endpoint
const siteId = (session.user as any).currentSiteId || 1;
const mediaTable = getSiteTable(siteId, 'media');
const IMAGE_SIZES = await getImageSizes(siteId);

// Updated media queries to use ${mediaTable}
```

Also added super admin check:
```typescript
const isSuperAdmin = (session?.user as any)?.isSuperAdmin || false;
const userRole = (session.user as any).role;

if (!session?.user || (!isSuperAdmin && userRole !== 'admin')) {
  return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
}
```

### 5. **`app/api/posts/[id]/revisions/[revisionId]/restore/route.ts`** (Revision Restore)
**Issue**: Max revisions setting was being read from `settings` table.

**Fix**:
```typescript
// Get all site-prefixed tables
const siteId = (session.user as any).currentSiteId || 1;
const postsTable = getSiteTable(siteId, 'posts');
const postRevisionsTable = getSiteTable(siteId, 'post_revisions');
const postMetaTable = getSiteTable(siteId, 'post_meta');
const settingsTable = getSiteTable(siteId, 'settings');

// Updated all queries to use site-prefixed tables
const [settingsResult] = await db.query<RowDataPacket[]>(
  `SELECT setting_value FROM ${settingsTable} WHERE setting_key = ?`,
  ['max_revisions']
);
```

Also added super admin check for permission verification.

## Pattern Applied

All fixes followed this pattern:

1. **Import `getSiteTable`**:
   ```typescript
   import db, { getSiteTable } from '@/lib/db';
   ```

2. **Get site ID from session**:
   ```typescript
   const siteId = (session.user as any).currentSiteId || 1;
   ```

3. **Generate site-prefixed table name**:
   ```typescript
   const settingsTable = getSiteTable(siteId, 'settings');
   ```

4. **Update queries to use variable**:
   ```typescript
   // Before
   `SELECT * FROM settings WHERE ...`
   
   // After
   `SELECT * FROM ${settingsTable} WHERE ...`
   ```

5. **Add super admin checks where needed**:
   ```typescript
   const isSuperAdmin = (session?.user as any)?.isSuperAdmin || false;
   if (!isSuperAdmin && !hasPermission) {
     return error;
   }
   ```

## Impact

✅ **Password validation now works** - Users can be created and updated  
✅ **Authentication settings work** - Login page and settings page functional  
✅ **Media regeneration works** - Image sizes respect current site  
✅ **Post revisions work** - Revision restore respects site settings  
✅ **Super admins have access** - All endpoints check super admin status  

## Testing

To verify the fix:

1. **Create a user** - Go to Users → Add New User
2. **Update user password** - Edit an existing user
3. **View login page** - Should load auth settings without error
4. **Update auth settings** - Settings → Authentication
5. **Regenerate media** - Media → Regenerate (if available)
6. **Restore post revision** - Edit post → View revisions → Restore

All should work without the "Table 'nextcms.settings' doesn't exist" error!

## Related Files

- **`lib/db.ts`** - Contains `getSiteTable()` helper function
- **`CHANGELOG.md`** - Updated with all fixes
- **`MULTI_SITE.md`** - Multi-site architecture documentation

## Future Considerations

When adding new API routes that need to access settings:
1. Always use `getSiteTable(siteId, 'settings')` instead of hardcoding table names
2. Get `siteId` from `(session.user as any).currentSiteId || 1`
3. Remember to add super admin checks: `isSuperAdmin || hasPermission`

## Remaining Work

The following API routes still need to be updated for multi-site (but don't access settings):
- `/api/tools/export/route.ts`
- `/api/tools/import/route.ts`

These will be updated in a future session to complete the multi-site implementation.

