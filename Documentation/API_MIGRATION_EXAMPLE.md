# API Migration Example - Complete Before & After

This document shows a complete, real-world example of migrating an API route from single-database to multi-database architecture.

## Example: Posts API Route

### BEFORE (`app/api/posts/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Post, PostType, User } from '@/lib/models';

// GET - List posts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const postType = searchParams.get('post_type') || 'post';
    const status = searchParams.get('status');
    const authorId = searchParams.get('author_id');
    
    // Build query
    const query: any = { post_type: postType };
    if (status) query.status = status;
    if (authorId) query.author_id = authorId;
    
    // Fetch posts
    const posts = await Post.find(query)
      .sort({ created_at: -1 })
      .limit(50);
    
    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

// POST - Create new post
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const userId = (session.user as any)._id;
    
    // Validate post type exists
    const postType = await PostType.findOne({ name: body.post_type });
    if (!postType) {
      return NextResponse.json(
        { error: 'Invalid post type' },
        { status: 400 }
      );
    }
    
    // Create post
    const post = await Post.create({
      ...body,
      author_id: userId,
      status: 'draft',
      created_at: new Date(),
      updated_at: new Date(),
    });
    
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}
```

### AFTER (`app/api/posts/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { SiteModels } from '@/lib/model-factory';
import { getCurrentSiteId, getCurrentUserId } from '@/lib/api-helpers';

// GET - List posts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current site ID from session
    const siteId = await getCurrentSiteId();
    
    // Get site-specific model
    const Post = await SiteModels.Post(siteId);
    
    const searchParams = request.nextUrl.searchParams;
    const postType = searchParams.get('post_type') || 'post';
    const status = searchParams.get('status');
    const authorId = searchParams.get('author_id');
    
    // Build query (site_id is automatically filtered by database)
    const query: any = { post_type: postType };
    if (status) query.status = status;
    if (authorId) query.author_id = authorId;
    
    // Fetch posts from site-specific database
    const posts = await Post.find(query)
      .sort({ created_at: -1 })
      .limit(50);
    
    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

// POST - Create new post
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current site ID and user ID
    const siteId = await getCurrentSiteId();
    const userId = await getCurrentUserId();
    
    // Get site-specific models
    const Post = await SiteModels.Post(siteId);
    const PostType = await SiteModels.PostType(siteId);
    
    const body = await request.json();
    
    // Validate post type exists (in this site's database)
    const postType = await PostType.findOne({ name: body.post_type });
    if (!postType) {
      return NextResponse.json(
        { error: 'Invalid post type' },
        { status: 400 }
      );
    }
    
    // Create post in site-specific database
    const post = await Post.create({
      ...body,
      author_id: userId,
      status: 'draft',
      created_at: new Date(),
      updated_at: new Date(),
    });
    
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}
```

## Key Changes Explained

### 1. Import Changes

**Before:**
```typescript
import { Post, PostType, User } from '@/lib/models';
```

**After:**
```typescript
import { SiteModels } from '@/lib/model-factory';
import { getCurrentSiteId, getCurrentUserId } from '@/lib/api-helpers';
```

### 2. Get Site Context

**Added:**
```typescript
const siteId = await getCurrentSiteId(); // Get from session
```

This retrieves the current site from the user's session. Falls back to site 1 if not found.

### 3. Get Model Instances

**Before:**
```typescript
const posts = await Post.find(query); // Direct model usage
```

**After:**
```typescript
const Post = await SiteModels.Post(siteId); // Get model for site
const posts = await Post.find(query); // Use model instance
```

### 4. Site Isolation

**Automatic**: When you query `Post.find()`, it queries the `nextcms_site{id}` database, not a shared database. No need to manually filter by `site_id`!

### 5. Multiple Models

**Before:**
```typescript
const postType = await PostType.findOne({ name: body.post_type });
```

**After:**
```typescript
const PostType = await SiteModels.PostType(siteId); // Get model
const postType = await PostType.findOne({ name: body.post_type });
```

## Benefits Realized

1. **Data Isolation**: Site 1's posts are in `nextcms_site1`, Site 2's in `nextcms_site2`
2. **Simpler Queries**: No need to add `site_id` filters everywhere
3. **Better Security**: Can't accidentally query another site's data
4. **Scalability**: Can move site databases to different servers
5. **Performance**: Smaller databases, better indexes

## Testing

After migration, test:

```bash
# List posts
curl http://localhost:3000/api/posts \
  -H "Cookie: next-auth.session-token=YOUR_SESSION"

# Create post
curl -X POST http://localhost:3000/api/posts \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Post",
    "content": "Test content",
    "post_type": "post"
  }'
```

Verify:
- ✅ Posts are created in correct site database
- ✅ User can only see their site's posts
- ✅ Super admin can switch sites and see different posts
- ✅ Queries are fast and efficient

## Common Patterns

### Pattern: Get Multiple Models

```typescript
// Option 1: Get individually
const Post = await SiteModels.Post(siteId);
const Media = await SiteModels.Media(siteId);
const Setting = await SiteModels.Setting(siteId);

// Option 2: Get all at once
const { Post, Media, Setting } = await getSiteModels(siteId);
```

### Pattern: Mix Global & Site Models

```typescript
import { GlobalModels, SiteModels } from '@/lib/model-factory';

const siteId = await getCurrentSiteId();

// Site-specific
const Post = await SiteModels.Post(siteId);
const post = await Post.findById(postId);

// Global
const User = await GlobalModels.User();
const author = await User.findById(post.author_id);

return { post, author };
```

### Pattern: Super Admin Override

```typescript
import { getSiteIdFromRequestOrSession } from '@/lib/api-helpers';

// Allows super admin to specify ?siteId=2 in URL
const siteId = await getSiteIdFromRequestOrSession(
  request.nextUrl.searchParams
);

const Post = await SiteModels.Post(siteId);
```

## Migration Checklist

When migrating a route:

- [ ] Update imports to use model factory
- [ ] Add `getCurrentSiteId()` call
- [ ] Get model instances with `SiteModels.ModelName(siteId)`
- [ ] Remove manual `site_id` filters (now automatic)
- [ ] Update any cross-model references
- [ ] Test with multiple sites
- [ ] Test permissions still work
- [ ] Update any frontend code that calls this route

