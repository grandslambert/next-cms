# Multi-Site Support

This CMS supports managing multiple sites from a single installation. Each site has its own content tables while sharing users and roles globally.

## Architecture

### Global Resources (Shared Across All Sites)
- **users** - User accounts
- **roles** - User roles and permissions
- **site_role_overrides** - Site-specific permission customizations for system roles
- **sites** - Site definitions
- **site_users** - Maps users to sites with specific roles
- **user_meta** - User preferences and metadata
- **activity_log** - Global audit trail
- **global_settings** - System-wide settings

### Site-Specific Resources (Prefixed with `site_{id}_`)
Each site has its own set of tables with the prefix `site_{id}_`:

- `site_{id}_posts` - Posts and pages
- `site_{id}_post_meta` - Post custom fields
- `site_{id}_post_revisions` - Post revision history
- `site_{id}_post_types` - Post type definitions
- `site_{id}_taxonomies` - Taxonomy definitions
- `site_{id}_terms` - Taxonomy terms
- `site_{id}_term_meta` - Term metadata
- `site_{id}_term_relationships` - Post-term relationships
- `site_{id}_post_type_taxonomies` - Post type-taxonomy relationships
- `site_{id}_media` - Media files
- `site_{id}_media_folders` - Media folder structure
- `site_{id}_menus` - Navigation menus
- `site_{id}_menu_items` - Menu items
- `site_{id}_menu_item_meta` - Menu item metadata
- `site_{id}_menu_locations` - Menu location definitions
- `site_{id}_settings` - Site settings
- `site_{id}_activity_log` - Activity log

## Installation

### Database Setup

Multi-site support is built into the base schema from installation:

```bash
mysql -u [user] -p [database] < database/schema.sql
```

This automatically creates:
- **Global tables**: `users`, `roles`, `sites`, `site_users`, `user_meta`, `activity_log`
- **Site 1 tables**: `site_1_posts`, `site_1_media`, `site_1_settings`, etc.
- **Default accounts**:
  - Super Administrator (username: `superadmin`, password: `SuperAdmin123!`)
  - Site Administrator for Site 1 (username: `siteadmin`, password: `SiteAdmin123!`)

**No migration needed** - your CMS is multi-site from the start!

⚠️ **Remember to change the default passwords after first login!**

## Managing Sites

### Access

Only **Super Administrators** can manage sites. Access the Sites page at `/admin/sites`.

### Creating a New Site

1. Navigate to **Admin → Sites**
2. Click **"+ Add New Site"**
3. Fill in:
   - **Name**: Lowercase alphanumeric with underscores (e.g., `blog_site`)
   - **Display Name**: Human-readable name (e.g., "Blog Site")
   - **Domain**: Optional domain name for the site
   - **Description**: Optional description
   - **Is Active**: Whether the site is active
4. Click **"Create Site"**

The system will automatically create all necessary tables with the prefix `site_{id}_`.

### Editing a Site

1. Click **"Edit"** on any site in the list
2. Modify the fields
3. Click **"Update Site"**

### Deleting a Site

1. Click **"Delete"** on a site (default site cannot be deleted)
2. Confirm the deletion

**Note**: Deleting a site does NOT automatically drop its database tables for safety. You must manually drop the `site_{id}_*` tables if needed.

## Implementation Guide

### Site Context in Sessions

The CMS automatically manages site context in user sessions:

1. **Login**: User's first assigned site becomes `currentSiteId` in session
2. **Site Switcher**: Users can switch between assigned sites
3. **Table Resolution**: API routes use `currentSiteId` to determine table prefixes
4. **Super Admins**: Have access to all sites, can switch freely

### Database Helper with Site Context

You need to update `lib/db.ts` to support dynamic table prefixes based on the current site context.

Example approach:

```typescript
// lib/db.ts
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'next_cms',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Helper to get site prefix
export function getSitePrefix(siteId: number): string {
  return `site_${siteId}_`;
}

// Helper to get site-prefixed table name
export function getSiteTable(siteId: number, tableName: string): string {
  return `${getSitePrefix(siteId)}${tableName}`;
}

export default pool;
```

### Updating API Routes

Each API route that accesses site-specific content needs to:

1. Get the current site ID from the session
2. Use site-prefixed table names in queries

Example:

```typescript
// Before (single-site)
const [posts] = await db.query('SELECT * FROM posts');

// After (multi-site)
const siteId = (session.user as any).currentSiteId || 1;
const postsTable = getSiteTable(siteId, 'posts');
const [posts] = await db.query(`SELECT * FROM ${postsTable}`);
```

### Site Switcher Component

The site switcher is located in the admin sidebar and allows users to switch between assigned sites:

**Location**: `components/admin/SiteSwitcher.tsx`

**Features**:
- Shows all sites user has access to
- Updates session with new `currentSiteId`
- Refreshes page to load new site's content
- Hidden for super admins (they don't need it)

**Implementation**:
```typescript
// components/admin/SiteSwitcher.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export default function SiteSwitcher() {
  const { data: session } = useSession();
  const currentSiteId = (session?.user as any)?.currentSiteId || 1;

  const { data: sitesData } = useQuery({
    queryKey: ['user-sites'],
    queryFn: async () => {
      const res = await axios.get('/api/sites');
      return res.data;
    },
  });

  const handleSiteChange = async (siteId: number) => {
    // Update session with new site context
    await axios.post('/api/user/set-site', { siteId });
    window.location.reload();
  };

  // Render dropdown of available sites...
}
```

### Queries That Need Updating

The following types of queries need to be updated to use site-prefixed tables:

**Content Queries**:
- All `/api/posts/*` routes
- All `/api/post-types/*` routes
- All `/api/taxonomies/*` routes
- All `/api/terms/*` routes
- All `/api/media/*` routes
- All `/api/menus/*` routes
- All `/api/settings/*` routes

**Public Routes**:
- `app/(public)/[...slug]/page.tsx`
- `app/(public)/blog/[...slug]/page.tsx`
- Any other public-facing content routes

## User Management

### Assigning Users to Sites

Users can be assigned to multiple sites with different roles for each site:

```sql
-- Assign user ID 2 to site ID 3 with role ID 1 (admin)
INSERT INTO site_users (site_id, user_id, role_id) 
VALUES (3, 2, 1);
```

### Permissions

- **Super Admins**: Have access to all sites and the Sites management page
- **Other Users**: Only have access to sites they're assigned to via `site_users` table
- Each user can have a different role per site

### Role Customization

Sites can customize system roles (Admin, Editor, Author, Guest) independently:

- **Global Roles**: System roles are defined globally in the `roles` table
- **Site Overrides**: Site admins can edit roles - changes stored in `site_role_overrides` table
- **Independent Permissions**: Each site can have different permissions for the same role

**Example**:
```sql
-- Site 1 customizes "Editor" role to disable publishing
INSERT INTO site_role_overrides (site_id, role_id, permissions)
VALUES (1, 2, '{"can_publish": false, "manage_posts": true, ...}');

-- Site 2 uses global "Editor" role (default permissions)
-- No override needed

-- Site 3 customizes "Editor" to enable user management
INSERT INTO site_role_overrides (site_id, role_id, permissions)
VALUES (3, 2, '{"can_publish": true, "manage_users": true, ...}');
```

**Benefits**:
- Each site can match its unique workflow
- Global defaults remain unchanged
- Easy to revert (delete override row)
- Super admins control global defaults

## Database Maintenance

### Creating Tables for a New Site

When creating a site via the UI, tables are automatically created. To manually create tables:

```bash
node scripts/create-site-tables.js <site_id>
```

### Dropping Tables for a Deleted Site

Tables are NOT automatically dropped when deleting a site. To manually drop them:

```sql
-- Replace {id} with the site ID
DROP TABLE IF EXISTS site_{id}_activity_log;
DROP TABLE IF EXISTS site_{id}_term_relationships;
DROP TABLE IF EXISTS site_{id}_post_type_taxonomies;
DROP TABLE IF EXISTS site_{id}_term_meta;
DROP TABLE IF EXISTS site_{id}_terms;
DROP TABLE IF EXISTS site_{id}_taxonomies;
DROP TABLE IF EXISTS site_{id}_post_meta;
DROP TABLE IF EXISTS site_{id}_post_revisions;
DROP TABLE IF EXISTS site_{id}_posts;
DROP TABLE IF EXISTS site_{id}_post_types;
DROP TABLE IF EXISTS site_{id}_menu_item_meta;
DROP TABLE IF EXISTS site_{id}_menu_items;
DROP TABLE IF EXISTS site_{id}_menus;
DROP TABLE IF EXISTS site_{id}_menu_locations;
DROP TABLE IF EXISTS site_{id}_media;
DROP TABLE IF EXISTS site_{id}_media_folders;
DROP TABLE IF EXISTS site_{id}_settings;
```

## Migration Checklist

- [ ] Backup database
- [ ] Run migration script
- [ ] Update `lib/db.ts` to support site prefixes
- [ ] Add site context to sessions
- [ ] Create site switcher component
- [ ] Update all API routes to use site-prefixed tables
- [ ] Update public routes to use site-prefixed tables
- [ ] Update middleware if needed
- [ ] Test all functionality
- [ ] Deploy

## Common Patterns

### Getting Current Site ID in API Routes

```typescript
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const siteId = (session?.user as any)?.currentSiteId || 1;
  
  // Use siteId to build table names...
}
```

### Building Dynamic Queries

```typescript
import { getSiteTable } from '@/lib/db';

const siteId = getCurrentSiteId();
const postsTable = getSiteTable(siteId, 'posts');
const postMetaTable = getSiteTable(siteId, 'post_meta');

const query = `
  SELECT p.*, pm.meta_value
  FROM ${postsTable} p
  LEFT JOIN ${postMetaTable} pm ON p.id = pm.post_id
  WHERE p.status = 'published'
`;
```

### Site-Aware Activity Logging

The activity log is site-specific, so logs are stored in the site's activity_log table:

```typescript
import { logActivity } from '@/lib/activity-logger';

// In an API route
await logActivity({
  userId,
  action: 'post_created',
  entityType: 'post',
  entityId: postId,
  entityName: title,
  details: `Created post: ${title}`,
  siteId: currentSiteId, // Add site context to logging
  ipAddress: getClientIp(request),
  userAgent: getUserAgent(request),
});
```

## Troubleshooting

### Error: Table doesn't exist

If you see errors about missing tables, ensure:
1. The site exists in the `sites` table
2. Tables were created for the site: `node scripts/create-site-tables.js <site_id>`
3. Your queries are using the correct site prefix

### Users can't access a site

Check the `site_users` table:
```sql
SELECT * FROM site_users WHERE user_id = <user_id>;
```

If the user isn't assigned, add them:
```sql
INSERT INTO site_users (site_id, user_id, role_id) VALUES (<site_id>, <user_id>, <role_id>);
```

### Migration failed

1. Restore from backup
2. Check the error message
3. Ensure no foreign key constraints are violated
4. Try the migration steps manually

## Future Enhancements

- Auto-assign users to new sites
- Domain-based site detection for public routes
- Site cloning (copy all content from one site to another)
- Site templates (predefined post types, taxonomies, etc.)
- Cross-site content sharing
- Centralized media library option

