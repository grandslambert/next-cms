# Next CMS MongoDB Database Structure - FINAL SPEC

## Overview
The system uses **database-level isolation** for multi-site architecture. Each site has its own MongoDB database.

## Database Names
- **Global Database**: `nextcms_global`
- **Site Databases**: `nextcms_site{id}` where `{id}` is the numeric Site.id (e.g., `nextcms_site1`, `nextcms_site2`)

---

## Global Database Collections

### 1. `sites`
**Purpose**: Store site metadata
**Schema**:
- `_id`: ObjectId (MongoDB document ID)
- `id`: **Number** (Sequential ID used for database naming)
- `name`: String (internal name, unique)
- `display_name`: String
- `description`: String
- `domain`: String
- `is_active`: Boolean
- `created_at`: Date
- `updated_at`: Date

**Key Points**:
- `id` is auto-incremented (1, 2, 3, ...)
- `id` maps to database name: `nextcms_site{id}`
- **NEVER use `_id` for site_id references - always use `id`**

### 2. `users`
**Purpose**: Global user accounts
**Schema**:
- `_id`: ObjectId
- `username`: String
- `email`: String
- `password`: String (hashed)
- `first_name`: String
- `last_name`: String
- `role`: **ObjectId** (ref to `roles._id`)
- `is_super_admin`: Boolean
- `status`: String
- `created_at`: Date
- `updated_at`: Date

### 3. `roles`
**Purpose**: User roles and permissions
**Schema**:
- `_id`: ObjectId
- `name`: String (e.g., 'administrator', 'editor')
- `label`: String (display name)
- `permissions`: Object
- `created_at`: Date
- `updated_at`: Date

### 4. `site_users`
**Purpose**: Map users to sites with site-specific roles
**Schema**:
- `_id`: ObjectId
- `site_id`: **Number** (references `sites.id`, NOT `sites._id`)
- `user_id`: ObjectId (references `users._id`)
- `role_id`: ObjectId (references `roles._id`)
- `assigned_at`: Date

**CRITICAL**: `site_id` is a **Number**, not ObjectId!

### 5. `user_meta`
**Purpose**: User preferences per site
**Schema**:
- `_id`: ObjectId
- `user_id`: ObjectId (references `users._id`)
- `site_id`: **Number** (references `sites.id`, NOT `sites._id`)
- `meta_key`: String
- `meta_value`: Mixed
- `created_at`: Date
- `updated_at`: Date

**CRITICAL**: `site_id` is a **Number**, not ObjectId!

### 6. `global_settings`
**Purpose**: System-wide settings
**Schema**:
- `_id`: ObjectId
- `key`: String
- `value`: Mixed
- `group`: String
- `created_at`: Date
- `updated_at`: Date

### 7. `activity_logs` (global)
**Purpose**: Global activity logs (SuperAdmin actions, cross-site actions)
**Schema**:
- `_id`: ObjectId
- `user_id`: ObjectId
- `action`: String
- `entity_type`: String
- `entity_id`: String
- `entity_name`: String
- `details`: String
- `changes_before`: Object
- `changes_after`: Object
- `ip_address`: String
- `user_agent`: String
- `created_at`: Date

**Note**: NO `site_id` field - these are global logs

---

## Site Database Collections (in `nextcms_site{id}`)

All site-specific collections are stored in their respective site databases.

**CRITICAL RULE**: Site-specific models have **NO `site_id` field** because database isolation provides the separation.

### Collections per site:
1. `posts` - Content posts/pages
2. `post_meta` - Post metadata
3. `post_revisions` - Post revision history
4. `post_types` - Custom post types
5. `taxonomies` - Taxonomies (categories, tags, etc.)
6. `terms` - Taxonomy terms
7. `post_terms` - Post-to-term relationships
8. `menus` - Navigation menus
9. `menu_items` - Menu item entries
10. `menu_item_meta` - Menu item metadata
11. `menu_locations` - Menu locations
12. `media` - Media files
13. `media_folders` - Media organization
14. `settings` - Site-specific settings
15. `activity_logs` - Site-specific activity logs

**None of these collections have a `site_id` field.**

---

## API Route Patterns

### Pattern 1: Global Database Queries
```typescript
// Get models
const Site = await GlobalModels.Site();
const User = await GlobalModels.User();
const Role = await GlobalModels.Role();
const SiteUser = await GlobalModels.SiteUser();

// Query sites by numeric ID
const site = await Site.findOne({ id: siteId }); // siteId is Number

// Query site users (site_id is Number)
const siteUsers = await SiteUser.find({ site_id: siteId }); // siteId is Number

// Create site user (site_id is Number)
await SiteUser.create({
  site_id: siteId, // Number
  user_id: userObjectId, // ObjectId
  role_id: roleObjectId, // ObjectId
});
```

### Pattern 2: Site-Specific Database Queries
```typescript
// Get the numeric site ID from session
const siteId = (session.user as any).currentSiteId; // Number

// Get site-specific models
const PostType = await SiteModels.PostType(siteId);
const Post = await SiteModels.Post(siteId);
const Media = await SiteModels.Media(siteId);

// Query - NO site_id filter needed!
const posts = await Post.find({ status: 'published' });
const media = await Media.find({ trash: false });

// Create - NO site_id field!
await Post.create({
  title: 'My Post',
  content: 'Content here',
  // NO site_id!
});
```

---

## Common Mistakes to Avoid

### ❌ WRONG: Using `_id` for site references
```typescript
await SiteUser.create({
  site_id: site._id, // WRONG! site._id is ObjectId
});
```

### ✅ CORRECT: Using `id` for site references
```typescript
await SiteUser.create({
  site_id: site.id, // CORRECT! site.id is Number
});
```

### ❌ WRONG: Adding site_id to site-specific models
```typescript
await Post.create({
  site_id: siteId, // WRONG! Post doesn't have site_id
  title: 'My Post',
});
```

### ✅ CORRECT: No site_id in site-specific models
```typescript
await Post.create({
  title: 'My Post', // CORRECT! No site_id needed
});
```

### ❌ WRONG: Using ObjectId for site_id in global models
```typescript
await SiteUser.create({
  site_id: new mongoose.Types.ObjectId(siteId), // WRONG! site_id is Number
});
```

### ✅ CORRECT: Using Number for site_id in global models
```typescript
await SiteUser.create({
  site_id: parseInt(siteId), // CORRECT! site_id is Number
});
```

---

## Summary

1. **Global DB** (`nextcms_global`): Users, Roles, Sites, SiteUser, UserMeta, Global Settings, Global Activity Logs
2. **Site DBs** (`nextcms_site{id}`): All content and site-specific data
3. **Site.id** (Number) → used for database naming and all site_id references
4. **Site._id** (ObjectId) → only for internal MongoDB document reference
5. **SiteUser.site_id** → Number
6. **UserMeta.site_id** → Number
7. **Site-specific models** → NO site_id field at all

