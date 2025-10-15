# Custom Post Types

## Overview

Custom Post Types allow you to create different content types beyond the default "Posts", similar to WordPress. This feature enables you to organize different kinds of content (portfolios, products, events, testimonials, etc.) with their own management interfaces and capabilities.

## What Are Custom Post Types?

Think of custom post types as **content blueprints**. Each post type can have:
- **Custom name and labels** (Portfolio, Product, Event, etc.)
- **Different features** (some might not need excerpts or categories)
- **Custom icon** for the admin menu
- **Custom menu position** in the sidebar
- **Own management interface** in the admin panel

## Default Post Types

The system includes two built-in post types:

### Posts
- **Name**: `post`
- **Label**: Posts
- **Icon**: 📝
- **Hierarchical**: No
- **Supports**: Title, Content, Excerpt, Featured Image, Categories
- **Use**: Regular blog posts

### Pages
- **Name**: `page`
- **Label**: Pages
- **Icon**: 📄
- **Hierarchical**: Yes (supports parent/child)
- **Supports**: Title, Content, Featured Image
- **Use**: Static pages (About, Contact, etc.)

Neither of these can be deleted - they're the core content types.

## Creating Custom Post Types

### Via Admin Interface

1. Go to **Settings → Post Types**
2. Click **+ Add New**
3. Fill in the form:

   **Name (slug)**: `portfolio` 
   - Lowercase, alphanumeric, underscores only
   - Cannot be changed after creation
   - Used in URLs and database

   **Plural Label**: `Portfolio Items`
   - Shown in admin menu and page titles

   **Singular Label**: `Portfolio Item`
   - Used in buttons and single item references

   **Description**: `Portfolio projects and work samples`
   - Optional helper text

   **Icon**: `🎨`
   - Emoji shown in the admin menu

   **Menu Position**: `6`
   - Controls order in sidebar (lower = higher up)

   **Show in Dashboard Content Summary**: ✓
   - Displays this post type in the dashboard overview
   - Uncheck for internal/hidden post types

   **Supports** (check what applies):
   - ✓ Title
   - ✓ Content
   - ✓ Excerpt
   - ✓ Featured Image
   - ✓ Categories

4. Click **Create Post Type**

### Via API

```
POST /api/post-types
```

**Request:**
```json
{
  "name": "portfolio",
  "label": "Portfolio Items",
  "singular_label": "Portfolio Item",
  "description": "Portfolio projects and work samples",
  "icon": "🎨",
  "menu_position": 6,
  "show_in_dashboard": true,
  "supports": {
    "title": true,
    "content": true,
    "excerpt": true,
    "featured_image": true,
    "categories": false
  }
}
```

## Managing Custom Post Types

### Admin Menu

After creating a custom post type, it automatically appears in the admin sidebar based on its menu position:

```
Dashboard (0)
Posts (5)
Portfolio Items (6)      ← Your custom post type
Pages (10)
Categories (15)
Media (20)
Users (25)
Settings (30)
```

### Content Management

Each post type has its own dedicated pages:
- **List view**: `/admin/post-type/portfolio`
- **Create new**: `/admin/post-type/portfolio/new`
- **Edit**: `/admin/post-type/portfolio/[id]`

The interface adapts based on the post type's "supports" settings:
- If `content` is disabled, no rich text editor
- If `categories` is disabled, no category selector
- If `featured_image` is disabled, no image picker
- If `excerpt` is disabled, no excerpt field

## Supported Features

### Title
Every post type should support titles (always enabled).

### Content
Full rich text editor with formatting capabilities.

### Excerpt
Short summary or description field.

### Featured Image
Media library integration for main image selection.

### Categories
Ability to organize items into categories.

### Hierarchical
When enabled, items can have parent/child relationships:
- **Parent Selector**: Choose a parent item or leave as top-level
- **Menu Order**: Control the display order (lower numbers first)
- **Use Cases**: Pages with sub-pages, nested portfolios, documentation with sections
- **Example**: About → Team, Services → Web Design

**Note**: Only enable hierarchical for content that needs nested organization.

## Editing Post Types

1. Go to **Settings → Post Types**
2. Click **Edit** on any post type
3. Modify any field except **Name** (slug)
4. Click **Update Post Type**

**Note:** You cannot change the `name` (slug) after creation as it's used in URLs and database records.

## Deleting Post Types

1. Go to **Settings → Post Types**
2. Click **Delete** on a custom post type
3. Confirm deletion

**Restrictions:**
- Cannot delete the default "post" post type
- Cannot delete post types that have existing content
- Delete all content first, then delete the post type

## Menu Positioning

Menu positions control the order items appear in the admin sidebar:

| Position | Typical Usage |
|----------|---------------|
| 0-4 | Dashboard and primary sections |
| 5-9 | Post types (default Posts = 5) |
| 10-19 | Pages and hierarchical content |
| 20-24 | Media library |
| 25-29 | Users and management |
| 30+ | Settings and utilities |

**Example Custom Positions:**
- Portfolio: 6 (right after Posts)
- Products: 7
- Events: 8
- Testimonials: 9

## Database Schema

### post_types Table

```sql
CREATE TABLE post_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  label VARCHAR(255) NOT NULL,
  singular_label VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  supports JSON,
  public BOOLEAN DEFAULT TRUE,
  show_in_dashboard BOOLEAN DEFAULT TRUE,
  menu_position INT DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### posts Table Update

```sql
ALTER TABLE posts 
ADD COLUMN post_type VARCHAR(100) DEFAULT 'post' AFTER id,
ADD INDEX idx_post_type (post_type);
```

## Use Cases

### Portfolio
```json
{
  "name": "portfolio",
  "label": "Portfolio",
  "singular_label": "Portfolio Item",
  "icon": "🎨",
  "supports": {
    "title": true,
    "content": true,
    "featured_image": true,
    "categories": true
  }
}
```

### Products/Services
```json
{
  "name": "product",
  "label": "Products",
  "singular_label": "Product",
  "icon": "🛍️",
  "supports": {
    "title": true,
    "content": true,
    "excerpt": true,
    "featured_image": true
  }
}
```

### Testimonials
```json
{
  "name": "testimonial",
  "label": "Testimonials",
  "singular_label": "Testimonial",
  "icon": "💬",
  "supports": {
    "title": true,
    "content": true
  }
}
```

### Events
```json
{
  "name": "event",
  "label": "Events",
  "singular_label": "Event",
  "icon": "📅",
  "supports": {
    "title": true,
    "content": true,
    "excerpt": true,
    "featured_image": true,
    "categories": true
  }
}
```

## API Endpoints

### List All Post Types
```
GET /api/post-types
```

### Get Single Post Type
```
GET /api/post-types/[id]
```

### Create Post Type
```
POST /api/post-types
```

### Update Post Type
```
PUT /api/post-types/[id]
```

### Delete Post Type
```
DELETE /api/post-types/[id]
```

### Get Posts by Type
```
GET /api/posts?post_type=portfolio
```

## Best Practices

### Naming Conventions

**DO:**
- ✅ Use singular nouns: `portfolio`, `product`, `event`
- ✅ Use lowercase: `team_member`
- ✅ Be descriptive: `case_study` not `cs`
- ✅ Use underscores for spaces: `portfolio_item`

**DON'T:**
- ❌ Use plurals: `portfolios`
- ❌ Use uppercase: `Portfolio`
- ❌ Use special characters: `portfolio-item`
- ❌ Use reserved names: `page`, `media`, `user`

### Feature Selection

Only enable features you actually need:

**Minimal (Testimonials):**
- Title ✓
- Content ✓
- Everything else ✗

**Standard (Blog Posts):**
- Title ✓
- Content ✓
- Excerpt ✓
- Featured Image ✓
- Categories ✓

**Media-Focused (Portfolio):**
- Title ✓
- Content ✓
- Featured Image ✓
- Excerpt ✗ (if content is descriptive enough)
- Categories ✓ (for filtering)

## Migration

For existing installations, run:

```bash
node scripts/add-post-types.js
```

This will:
1. Create the `post_types` table
2. Add `post_type` column to `posts` table
3. Create the default "post" post type
4. Set all existing posts to post_type = 'post'

## Limitations

- Cannot rename a post type after creation (would break existing content)
- Cannot delete post types with existing content
- Slug conflicts: different post types can have posts with the same slug (handled automatically)
- Categories are shared across all post types

## Future Enhancements

Potential improvements for future versions:

- [ ] Custom taxonomies per post type (not just categories)
- [ ] Custom fields/meta boxes per post type
- [ ] Post type-specific templates on the frontend
- [ ] Hierarchical custom post types (parent/child relationships)
- [ ] Custom post type archives on the public site
- [ ] Bulk post type conversion
- [ ] Import/export post type configurations
- [ ] Post type capabilities and permissions
- [ ] Custom post statuses per type

## Version History

**v1.0.3** (Planned) - Initial release of custom post types
- Create, edit, delete post types
- Dynamic admin menu integration
- Feature toggles (supports)
- Post type-specific admin pages
- Database migration scripts

