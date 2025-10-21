# MongoDB Multi-Database Architecture

## Overview

Next CMS now uses a **separate database per site** architecture for MongoDB. This provides better isolation, scalability, and security for multi-site deployments.

## Database Structure

### Global Database: `nextcms_global`
Contains resources shared across all sites:
- **users** - User accounts
- **roles** - Permission roles
- **sites** - Site definitions
- **site_users** - User-to-site assignments
- **global_settings** - System-wide settings
- **user_meta** - User preferences

### Site Databases: `nextcms_site{id}`
Each site has its own database containing:
- **settings** - Site-specific settings
- **post_types** - Custom post type definitions
- **posts** - Posts, pages, and custom content
- **post_meta** - Post custom fields
- **post_revisions** - Post revision history
- **taxonomies** - Taxonomy definitions
- **terms** - Taxonomy terms
- **post_terms** - Post-term relationships
- **menus** - Navigation menus
- **menu_items** - Menu items
- **menu_item_meta** - Menu item metadata
- **menu_locations** - Menu location definitions
- **media** - Media files
- **media_folders** - Media folder structure
- **activity_log** - Site-specific activity logs

## Benefits

1. **Complete Isolation**: Each site's data is in a separate database
2. **Independent Backups**: Backup/restore individual sites
3. **Scalability**: Move specific sites to different servers
4. **Security**: Stricter access control per site
5. **Performance**: Smaller databases with better indexing

## Usage

### Database Initialization

Initialize the databases with sample data:

```bash
npx ts-node --project tsconfig.node.json scripts/init-mongodb.ts
```

Clear and reinitialize:

```bash
npx ts-node --project tsconfig.node.json scripts/init-mongodb.ts --clear
```

### Using Models in Code

#### Global Models

For accessing global resources (users, roles, sites):

```typescript
import { GlobalModels } from '@/lib/model-factory';

// Get model instance
const User = await GlobalModels.User();
const users = await User.find({ status: 'active' });

const Site = await GlobalModels.Site();
const sites = await Site.find({ is_active: true });
```

#### Site-Specific Models

For accessing site-specific content:

```typescript
import { SiteModels } from '@/lib/model-factory';

// Get the current site ID from session
const siteId = session?.user?.currentSiteId || 1;

// Get model instances for the specific site
const Post = await SiteModels.Post(siteId);
const posts = await Post.find({ status: 'published' });

const Media = await SiteModels.Media(siteId);
const images = await Media.find({ mimetype: /^image\// });
```

#### Getting All Models at Once

```typescript
import { getGlobalModels, getSiteModels } from '@/lib/model-factory';

// Get all global models
const globalModels = await getGlobalModels();
const { User, Role, Site } = globalModels;

// Get all site models
const siteModels = await getSiteModels(siteId);
const { Post, Media, Setting } = siteModels;
```

### API Route Example

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { SiteModels } from '@/lib/model-factory';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Get site ID from session
  const siteId = (session.user as any).currentSiteId || 1;
  
  // Get site-specific models
  const Post = await SiteModels.Post(siteId);
  const PostType = await SiteModels.PostType(siteId);
  
  // Query the site's database
  const posts = await Post.find({ 
    status: 'published',
    post_type: 'post'
  }).sort({ published_at: -1 }).limit(10);
  
  return NextResponse.json({ posts });
}
```

## Connection Management

The system automatically manages database connections with caching:

```typescript
import { connectToGlobalDB, connectToSiteDB } from '@/lib/mongodb';

// Connect to global database
const globalConn = await connectToGlobalDB();

// Connect to a specific site database
const siteConn = await connectToSiteDB(1); // Site 1
const site2Conn = await connectToSiteDB(2); // Site 2

// Connections are cached - subsequent calls return the same connection
```

## Creating a New Site

When creating a new site:

1. Create the site record in the global database
2. The site's database will be created automatically when first accessed
3. Initialize the site with default data if needed

```typescript
import { GlobalModels, SiteModels } from '@/lib/model-factory';

// Create site in global database
const Site = await GlobalModels.Site();
const newSite = await Site.create({
  name: 'blog',
  display_name: 'My Blog',
  domain: 'blog.example.com',
  is_active: true
});

// Initialize site database with defaults
const siteId = newSite._id.toString();
const PostType = await SiteModels.PostType(siteId);
const Taxonomy = await SiteModels.Taxonomy(siteId);
// ... create default post types, taxonomies, etc.
```

## Migration Strategy

### From Single Database

If migrating from a single-database setup:

1. Identify all site-specific documents (those with `site_id` field)
2. For each site:
   - Create the new site database
   - Copy site-specific documents to the new database
   - Update references as needed
3. Keep global data in the global database

### Adding More Sites

To add a new site to an existing installation:

1. Create site record in global database
2. Assign users to the site via `site_users`
3. The site's database will be created on first access
4. Optionally seed with default content

## Environment Configuration

Add your MongoDB connection string to `.env`:

```env
MONGODB_URI=mongodb://localhost:27017/
# or for MongoDB Atlas:
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
```

The system will automatically create and connect to:
- `nextcms_global`
- `nextcms_site1`
- `nextcms_site2`
- etc.

## Troubleshooting

### Cannot connect to database

Ensure your `MONGODB_URI` in `.env` points to your MongoDB instance **without** a database name at the end:

✅ Good: `mongodb://localhost:27017/`
❌ Bad: `mongodb://localhost:27017/nextcms`

### Site database not created

The database will be created automatically on first connection. If you need to pre-create:

```bash
# In MongoDB shell
use nextcms_site2
db.createCollection('posts')
```

### Models not found

Ensure you're using the model factory functions:

```typescript
// ✅ Correct
const Post = await SiteModels.Post(siteId);

// ❌ Incorrect (old single-database pattern)
import Post from '@/lib/models/Post';
```

## Performance Considerations

1. **Connection Pooling**: Connections are automatically pooled and cached
2. **Indexes**: All models have appropriate indexes defined
3. **Query Optimization**: Use projection to limit returned fields
4. **Aggregation**: Use MongoDB aggregation pipelines for complex queries

## Security

1. Each site's database is completely isolated
2. Cross-site queries require explicit permissions
3. Use MongoDB user roles to restrict database access
4. Implement row-level security via middleware

## Backup Strategy

### Full System Backup

```bash
mongodump --uri="mongodb://localhost:27017/"
```

### Single Site Backup

```bash
mongodump --uri="mongodb://localhost:27017/nextcms_site1"
```

### Restore

```bash
mongorestore --uri="mongodb://localhost:27017/" dump/
```

## Next Steps

After implementing this architecture, you'll need to:

1. ✅ Update all API routes to use the new model factory
2. ✅ Update frontend components that directly access models
3. ✅ Update middleware to handle site-specific database connections
4. ✅ Update any background jobs or scheduled tasks
5. ✅ Test all multi-site functionality

See [API_MIGRATION.md](./API_MIGRATION.md) for guidance on updating API routes.

