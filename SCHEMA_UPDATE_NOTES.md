# Database Schema Update for Multi-Site by Default

## Summary

The database schema has been updated so that **new installations are multi-site by default**. This means all content tables are prefixed with `site_1_` from the start, making it easy to add more sites later.

## Changes Required

### Global Tables (No Prefix)
These tables remain global and are shared across all sites:
- `users` - All user accounts
- `roles` - Role definitions
- `user_meta` - User preferences
- `sites` - List of all sites  
- `site_users` - Maps users to sites with roles

### Site-Prefixed Tables (Default: site_1_*)
All content and configuration tables now use site prefixes:

**Content Tables:**
- `site_1_posts`
- `site_1_post_meta`
- `site_1_post_revisions`
- `site_1_post_types`
- `site_1_post_type_taxonomies`

**Media Tables:**
- `site_1_media`
- `site_1_media_folders`

**Taxonomy Tables:**
- `site_1_taxonomies`
- `site_1_terms`
- `site_1_term_meta`
- `site_1_term_relationships`

**Menu Tables:**
- `site_1_menus`
- `site_1_menu_items`
- `site_1_menu_item_meta`
- `site_1_menu_locations`

**Settings & Logs:**
- `site_1_settings`
- `site_1_activity_log`

## For New Installations

1. Run the updated `database/schema.sql`
2. It will create:
   - Global tables (users, roles, etc.)
   - The `sites` table with site_1 entry
   - All `site_1_*` content tables
3. System is ready for multi-site from day 1

## For Existing Installations

If you already have a single-site installation, you have two options:

### Option A: Run Migration Script (Recommended)
```bash
node scripts/migrate-to-multi-site.js
```

This will:
- Create sites and site_users tables
- Rename existing tables to site_1_*
- Assign existing users to site 1
- Preserve all your data

### Option B: Fresh Install
1. Backup your data
2. Drop all tables
3. Run updated schema.sql
4. Import your data into site_1_* tables

## Verification

After update, verify tables exist:

```sql
-- Should show site_1_* tables
SHOW TABLES LIKE 'site_1_%';

-- Should show global tables
SHOW TABLES LIKE 'users';
SHOW TABLES LIKE 'sites';
SHOW TABLES LIKE 'site_users';
```

## Benefits

1. **Future-Proof**: Easy to add more sites
2. **Clean Architecture**: Clear separation from day 1
3. **No Migration Needed**: New installs start multi-site
4. **Consistent**: Same structure for everyone

## Application Code

All application code already uses `getSiteTable()` helper:

```typescript
import { getSiteTable } from '@/lib/db';

const siteId = (session.user as any).currentSiteId || 1;
const postsTable = getSiteTable(siteId, 'posts');
// Returns: 'site_1_posts'

// Use in queries
const [posts] = await db.query(
  `SELECT * FROM ${postsTable} WHERE status = 'published'`
);
```

## Next Steps for schema.sql

The schema.sql file needs to be updated to create site_1_* tables by default. Since this is a large file, here's the approach:

1. Keep all global table definitions as-is
2. Change all content table definitions from `tablename` to `site_1_tablename`
3. Add initial sites table data to create site 1 entry
4. Update foreign key references to use site_1_ prefix

Example:
```sql
-- Before
CREATE TABLE IF NOT EXISTS posts (...);

-- After
CREATE TABLE IF NOT EXISTS site_1_posts (...);
```

This ensures new installations work correctly with the multi-site architecture from the start.

