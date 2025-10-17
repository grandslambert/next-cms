# Multi-Site Implementation Guide

This guide walks you through completing the multi-site implementation for Next CMS.

## What's Already Implemented ✅

1. **Database Schema**
   - `sites` table for site definitions
   - `site_users` table for user-site-role mappings
   - Site-specific table templates
   - Migration scripts

2. **Site Management**
   - Sites CRUD API (`/api/sites` and `/api/sites/[id]`)
   - Sites management UI (`/admin/sites`)
   - Automatic table creation for new sites
   - Site validation and protection

3. **Access Control**
   - Super Admin-only access to site management
   - Sites menu in admin sidebar (Super Admin only)

4. **Utilities**
   - `scripts/create-site-tables.js` - Creates tables for new sites
   - `scripts/migrate-to-multi-site.js` - Migrates existing installation
   - Database helper utilities documented

## What Needs to Be Completed 🔨

### 1. Add Site Context to Sessions

Update `lib/auth.ts` to include current site ID in the user session:

```typescript
// In the authorize function, after getting user data
return {
  id: user.id.toString(),
  email: user.email,
  name: `${user.first_name} ${user.last_name}`.trim() || user.username,
  role: user.role_name || 'author',
  permissions,
  isSuperAdmin,
  currentSiteId: 1, // Default to site 1, will be updated by site switcher
};
```

Update callbacks to include currentSiteId in token and session.

### 2. Create Site Switcher Component

Create `components/admin/SiteSwitcher.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export default function SiteSwitcher() {
  const { data: session, update } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const currentSiteId = (session?.user as any)?.currentSiteId || 1;

  const { data: sitesData } = useQuery({
    queryKey: ['user-sites'],
    queryFn: async () => {
      const res = await axios.get('/api/sites');
      return res.data;
    },
  });

  const currentSite = sitesData?.sites?.find((s: any) => s.id === currentSiteId);

  const handleSiteChange = async (siteId: number) => {
    try {
      // Update session on server
      await axios.post('/api/user/set-site', { siteId });
      
      // Update client session
      await update({ currentSiteId: siteId });
      
      // Reload to refresh all queries with new site context
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch site:', error);
    }
  };

  if (!sitesData?.sites || sitesData.sites.length <= 1) {
    return null; // Hide if only one site
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        <span>🌐</span>
        <span>{currentSite?.display_name || 'Select Site'}</span>
        <span className="text-gray-400">▼</span>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[200px] z-50">
          {sitesData.sites.map((site: any) => (
            <button
              key={site.id}
              onClick={() => {
                handleSiteChange(site.id);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                site.id === currentSiteId ? 'bg-blue-50 text-blue-700 font-medium' : ''
              }`}
            >
              {site.display_name}
              {site.id === currentSiteId && <span className="ml-2">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 3. Add Site Switcher to Admin Layout

Update `app/admin/layout.tsx` to include the site switcher in the header.

### 4. Create API Endpoint for Site Switching

Create `app/api/user/set-site/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { siteId } = await request.json();

    if (!siteId) {
      return NextResponse.json({ error: 'Site ID required' }, { status: 400 });
    }

    // Verify user has access to this site (unless super admin)
    const isSuperAdmin = (session.user as any).isSuperAdmin;
    
    if (!isSuperAdmin) {
      const [access] = await db.query(
        'SELECT id FROM site_users WHERE site_id = ? AND user_id = ?',
        [siteId, (session.user as any).id]
      );

      if (access.length === 0) {
        return NextResponse.json({ error: 'Access denied to this site' }, { status: 403 });
      }
    }

    // Update session (this depends on how you handle session updates)
    // You may need to update this based on your session management approach

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting site:', error);
    return NextResponse.json({ error: 'Failed to set site' }, { status: 500 });
  }
}
```

### 5. Update Database Helper

Update `lib/db.ts` to add helper functions:

```typescript
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

// Get site prefix
export function getSitePrefix(siteId: number): string {
  return `site_${siteId}_`;
}

// Get site-prefixed table name
export function getSiteTable(siteId: number, tableName: string): string {
  return `${getSitePrefix(siteId)}${tableName}`;
}

// Get table name with backticks for safe SQL
export function getSiteTableSafe(siteId: number, tableName: string): string {
  return `\`${getSitePrefix(siteId)}${tableName}\``;
}

export default pool;
```

### 6. Update API Routes

For EVERY API route that accesses site-specific content, you need to:

#### Pattern to Follow:

```typescript
import { getSiteTable } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get current site ID from session
  const siteId = (session.user as any).currentSiteId || 1;

  // Use site-prefixed table names
  const postsTable = getSiteTable(siteId, 'posts');
  const postMetaTable = getSiteTable(siteId, 'post_meta');

  const [posts] = await db.query(`
    SELECT p.*, pm.meta_value
    FROM ${postsTable} p
    LEFT JOIN ${postMetaTable} pm ON p.id = pm.post_id
    WHERE p.status = 'published'
  `);

  return NextResponse.json({ posts });
}
```

#### Routes That Need Updating:

**Content Management:**
- `app/api/posts/route.ts`
- `app/api/posts/[id]/route.ts`
- `app/api/posts/[id]/revisions/route.ts`
- `app/api/posts/[id]/meta/route.ts`
- `app/api/posts/[id]/versions/route.ts`
- `app/api/posts/[id]/publish/route.ts`
- `app/api/posts/[id]/trash/route.ts`
- `app/api/posts/trash/route.ts`
- `app/api/posts/autosave/route.ts`
- `app/api/posts/process-scheduled/route.ts`

**Post Types:**
- `app/api/post-types/route.ts`
- `app/api/post-types/[id]/route.ts`
- `app/api/post-types/[id]/delete/route.ts`

**Taxonomies:**
- `app/api/taxonomies/route.ts`
- `app/api/taxonomies/[id]/route.ts`

**Terms:**
- `app/api/terms/route.ts`
- `app/api/terms/[id]/route.ts`

**Media:**
- `app/api/media/route.ts`
- `app/api/media/[id]/route.ts`
- `app/api/media/[id]/usage/route.ts`
- `app/api/media/[id]/trash/route.ts`
- `app/api/media/[id]/restore/route.ts`
- `app/api/media/[id]/delete/route.ts`
- `app/api/media/[id]/regenerate/route.ts`
- `app/api/media/trash/route.ts`
- `app/api/media/bulk/route.ts`
- `app/api/media/bulk/delete/route.ts`
- `app/api/media/folders/route.ts`
- `app/api/media/regenerate/route.ts`

**Menus:**
- `app/api/menus/route.ts`
- `app/api/menus/[id]/route.ts`
- `app/api/menu-items/route.ts`
- `app/api/menu-items/[id]/route.ts`
- `app/api/menu-items/[id]/delete/route.ts`
- `app/api/menu-items/reorder/route.ts`
- `app/api/menu-locations/route.ts`
- `app/api/menu-locations/[id]/route.ts`

**Settings:**
- `app/api/settings/route.ts`
- `app/api/settings/authentication/route.ts`

**Activity Log:**
- `app/api/activity-log/route.ts`

**Public Routes:**
- `app/api/public/menus/route.ts`

**Tools:**
- `app/api/tools/export/route.ts`
- `app/api/tools/import/route.ts`

### 7. Update Activity Logger

Update `lib/activity-logger.ts` to use site-specific activity log:

```typescript
export async function logActivity(params: ActivityLogParams & { siteId?: number }) {
  const {
    userId,
    action,
    entityType,
    entityId,
    entityName,
    details,
    changesBefore,
    changesAfter,
    ipAddress,
    userAgent,
    siteId = 1, // Default to site 1
  } = params;

  const activityLogTable = getSiteTable(siteId, 'activity_log');

  try {
    await db.query(
      `INSERT INTO ${activityLogTable} 
       (user_id, action, entity_type, entity_id, entity_name, details, changes_before, changes_after, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        action,
        entityType,
        entityId || null,
        entityName || null,
        details || null,
        changesBefore ? JSON.stringify(changesBefore) : null,
        changesAfter ? JSON.stringify(changesAfter) : null,
        ipAddress || null,
        userAgent || null,
      ]
    );
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
```

### 8. Update Public Routes

Update public-facing pages to use site context:

```typescript
// app/(public)/[...slug]/page.tsx
export default async function Page({ params }: { params: { slug: string[] } }) {
  // Determine site from domain or default to 1
  const siteId = 1; // TODO: Implement domain-based site detection
  
  const slug = params.slug?.join('/') || '';
  
  const postsTable = getSiteTable(siteId, 'posts');
  const [posts] = await db.query(`
    SELECT * FROM ${postsTable} WHERE slug = ? AND status = 'published'
  `, [slug]);
  
  // ... rest of the logic
}
```

## Testing Checklist

After implementing the changes:

- [ ] Super Admin can create new sites
- [ ] Tables are automatically created for new sites
- [ ] Super Admin can edit site details
- [ ] Super Admin can delete sites (except default)
- [ ] Site switcher appears in admin header
- [ ] Users can switch between sites they have access to
- [ ] Content is isolated per site (posts, media, etc.)
- [ ] Users can be assigned to multiple sites
- [ ] Activity logs are site-specific
- [ ] Settings are site-specific
- [ ] Public routes display correct site content
- [ ] Migration works on existing installation
- [ ] All API endpoints use correct site context

## Rollout Strategy

1. **Development Environment:**
   - Implement and test on development first
   - Create multiple test sites
   - Verify data isolation

2. **Staging Environment:**
   - Run migration script with database backup
   - Test all functionality
   - Verify existing content still works

3. **Production:**
   - **BACKUP DATABASE FIRST!**
   - Run migration during low-traffic period
   - Monitor for issues
   - Have rollback plan ready

## Performance Considerations

- Index site_id columns if you add them to join tables
- Consider connection pooling for multiple sites
- Monitor query performance with site prefixes
- Cache site information to reduce lookups

## Security Considerations

- Validate site IDs from user input
- Verify user access to site before switching
- Log site switching actions
- Prevent SQL injection with parameterized queries
- Use `getSiteTableSafe()` for dynamic table names in queries

