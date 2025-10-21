# API Routes Migration Guide

## Overview

This guide explains how to migrate API routes from the old single-database pattern to the new multi-database architecture.

## Quick Reference

### Before (Single Database)
```typescript
import { Post } from '@/lib/models';

export async function GET() {
  const posts = await Post.find({});
  return Response.json({ posts });
}
```

### After (Multi-Database)
```typescript
import { SiteModels } from '@/lib/model-factory';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  const session = await getServerSession(authOptions);
  const siteId = (session?.user as any)?.currentSiteId || 1;
  
  const Post = await SiteModels.Post(siteId);
  const posts = await Post.find({});
  return Response.json({ posts });
}
```

## Model Categories

### Global Models (Use `GlobalModels`)
These models live in `nextcms_global` database:
- `User` - User accounts
- `Role` - Roles and permissions  
- `Site` - Site definitions
- `SiteUser` - User-site assignments
- `GlobalSetting` - System-wide settings
- `UserMeta` - User preferences

### Site-Specific Models (Use `SiteModels`)
These models live in `nextcms_site{id}` databases:
- `Setting` - Site settings
- `Post` - Posts and pages
- `PostMeta` - Post metadata
- `PostRevision` - Post revisions
- `PostTerm` - Post-term relationships
- `PostType` - Post type definitions
- `Taxonomy` - Taxonomy definitions
- `Term` - Taxonomy terms
- `Menu` - Navigation menus
- `MenuItem` - Menu items
- `MenuItemMeta` - Menu item metadata
- `MenuLocation` - Menu locations
- `Media` - Media files
- `MediaFolder` - Media folders
- `ActivityLog` - Activity logs

## Migration Patterns

### Pattern 1: Site-Specific Resources

For routes that access site-specific content (posts, media, settings, etc.):

```typescript
// OLD: app/api/posts/route.ts
import { Post, PostType, Taxonomy, Term } from '@/lib/models';

export async function GET(request: NextRequest) {
  const posts = await Post.find({ status: 'published' });
  return Response.json({ posts });
}

// NEW: app/api/posts/route.ts
import { SiteModels } from '@/lib/model-factory';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const siteId = (session?.user as any)?.currentSiteId || 1;
  
  const Post = await SiteModels.Post(siteId);
  const posts = await Post.find({ status: 'published' });
  return Response.json({ posts });
}
```

### Pattern 2: Global Resources

For routes that access global resources (users, roles, sites):

```typescript
// OLD: app/api/users/route.ts
import { User, Role } from '@/lib/models';

export async function GET() {
  const users = await User.find({});
  return Response.json({ users });
}

// NEW: app/api/users/route.ts
import { GlobalModels } from '@/lib/model-factory';

export async function GET() {
  const User = await GlobalModels.User();
  const users = await User.find({});
  return Response.json({ users });
}
```

### Pattern 3: Mixed Resources

For routes that access both global and site-specific resources:

```typescript
// NEW: app/api/posts/[id]/route.ts
import { GlobalModels, SiteModels } from '@/lib/model-factory';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const siteId = (session?.user as any)?.currentSiteId || 1;
  
  // Get site-specific models
  const Post = await SiteModels.Post(siteId);
  const post = await Post.findById(params.id);
  
  // Get global model for author info
  const User = await GlobalModels.User();
  const author = await User.findById(post?.author_id);
  
  return Response.json({ post, author });
}
```

### Pattern 4: Multiple Site-Specific Models

When you need multiple site-specific models:

```typescript
import { getSiteModels } from '@/lib/model-factory';

export async function GET() {
  const session = await getServerSession(authOptions);
  const siteId = (session?.user as any)?.currentSiteId || 1;
  
  // Get all site models at once
  const { Post, PostType, Taxonomy, Term } = await getSiteModels(siteId);
  
  const posts = await Post.find({ status: 'published' });
  const postTypes = await PostType.find({});
  
  return Response.json({ posts, postTypes });
}
```

## Helper Function

Create a helper to get the current site ID:

```typescript
// lib/api-helpers.ts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function getCurrentSiteId(): Promise<number> {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.currentSiteId || 1;
}
```

Then use it in routes:

```typescript
import { getCurrentSiteId } from '@/lib/api-helpers';
import { SiteModels } from '@/lib/model-factory';

export async function GET() {
  const siteId = await getCurrentSiteId();
  const Post = await SiteModels.Post(siteId);
  const posts = await Post.find({});
  return Response.json({ posts });
}
```

## Routes That Need Migration

### High Priority (Site-Specific)
- [ ] `app/api/posts/**` - All post routes
- [ ] `app/api/media/**` - All media routes
- [ ] `app/api/settings/route.ts` - Site settings
- [ ] `app/api/post-types/**` - Post type routes
- [ ] `app/api/taxonomies/**` - Taxonomy routes
- [ ] `app/api/terms/**` - Term routes
- [ ] `app/api/menus/**` - Menu routes
- [ ] `app/api/menu-items/**` - Menu item routes
- [ ] `app/api/menu-locations/**` - Menu location routes
- [ ] `app/api/activity-log/route.ts` - Activity log

### Medium Priority (Global)
- [ ] `app/api/users/**` - User routes (use GlobalModels)
- [ ] `app/api/roles/**` - Role routes (use GlobalModels)
- [ ] `app/api/sites/**` - Site management (use GlobalModels)

### Low Priority (Mixed or Special)
- [ ] `app/api/v1/**` - API v1 routes
- [ ] `app/api/public/**` - Public API routes
- [ ] `app/api/tools/**` - Import/export tools

## Testing Checklist

After migrating a route:

1. ✅ Route connects to correct database (global vs site-specific)
2. ✅ Site ID is properly retrieved from session
3. ✅ Queries filter by site_id where appropriate
4. ✅ Error handling works correctly
5. ✅ Permissions still work as expected
6. ✅ Tests pass (if applicable)

## Common Pitfalls

### ❌ Forgetting to get site ID
```typescript
// Wrong - siteId not defined
const Post = await SiteModels.Post(siteId);
```

### ❌ Using old import pattern
```typescript
// Wrong - direct import
import { Post } from '@/lib/models';
```

### ❌ Not awaiting model factory
```typescript
// Wrong - missing await
const Post = SiteModels.Post(siteId);
```

### ✅ Correct Pattern
```typescript
const session = await getServerSession(authOptions);
const siteId = (session?.user as any)?.currentSiteId || 1;
const Post = await SiteModels.Post(siteId);
```

## Automated Migration Script

For bulk migration, you can use this pattern with find-and-replace:

1. **Find**: `import { (.*) } from '@/lib/models';`
2. **Review**: Determine if models are global or site-specific
3. **Replace**: Update imports and add model factory calls

## Questions?

If you're unsure whether a model is global or site-specific:
- Check if it has a `site_id` field → Site-specific
- Check the model file's collection name comment
- Refer to the model list at the top of this guide

