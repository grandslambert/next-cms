# Migration Guide: Pages to Custom Post Types

## Overview

In version 1.0.3, Pages have been converted from a separate table to a custom post type. This unifies all content under a single system and enables powerful features like custom hierarchical post types.

## What Changed

### Before (v1.0.2)
```
posts table      → Blog posts
pages table      → Static pages (separate)
```

### After (v1.0.3)
```
posts table      → All content types
  - post_type = 'post'     → Blog posts
  - post_type = 'page'     → Static pages
  - post_type = 'portfolio' → Custom type
  - post_type = 'product'   → Custom type
```

## Migration Steps

### 1. Run the Migration Script

```bash
node scripts/migrate-pages-to-posts.js
```

This will:
- Add `hierarchical` column to `post_types` table
- Add `parent_id` and `menu_order` to `posts` table
- Create 'page' post type (hierarchical)
- Migrate all pages from `pages` table to `posts` table
- Update 'post' type to be non-hierarchical

### 2. Verify Migration

**Check Pages in Admin:**
1. Go to admin panel
2. You should see "📄 Pages" in the sidebar (from post types)
3. Click it to view your migrated pages
4. Create a test page to ensure it works

**Check Public Site:**
1. Visit your site
2. Navigate to existing page URLs (e.g., `/about`)
3. Confirm pages still display correctly

### 3. Drop Old Tables (Optional)

**IMPORTANT**: Only do this after verifying everything works!

```sql
-- Check if any data remains in pages table
SELECT COUNT(*) FROM pages;

-- If count is 0 or matches migrated count, drop the table
DROP TABLE IF EXISTS pages;
```

## Breaking Changes

### API Endpoints

**Old:**
```javascript
GET /api/pages
POST /api/pages
PUT /api/pages/[id]
DELETE /api/pages/[id]
```

**New:**
```javascript
GET /api/posts?post_type=page
POST /api/posts (with post_type: 'page')
PUT /api/posts/[id]
DELETE /api/posts/[id]
```

### Admin Routes

**Old:**
```
/admin/pages
/admin/pages/new
/admin/pages/[id]
```

**New:**
```
/admin/post-type/page
/admin/post-type/page/new
/admin/post-type/page/[id]
```

### Frontend

**Public page routes** (`/[slug]`) work exactly the same - no changes needed!

The dynamic route now queries:
```sql
WHERE post_type = 'page' AND slug = ?
```

Instead of querying the pages table.

## Database Schema Changes

### post_types Table

**Added:**
```sql
hierarchical BOOLEAN DEFAULT FALSE
show_in_dashboard BOOLEAN DEFAULT TRUE
```

### posts Table

**Added:**
```sql
parent_id INT NULL
menu_order INT DEFAULT 0
FOREIGN KEY (parent_id) REFERENCES posts(id) ON DELETE SET NULL
INDEX idx_parent_id (parent_id)
```

## Rollback (If Needed)

If you need to rollback:

1. The `pages` table still exists with your original data
2. The old API routes have been removed but data is safe
3. You can manually restore the old routes from git history
4. Pages data is duplicated (in both `pages` and `posts` tables)

**To rollback completely:**
```sql
-- Delete migrated pages from posts table
DELETE FROM posts WHERE post_type = 'page';

-- Remove page post type
DELETE FROM post_types WHERE name = 'page';

-- Restore old admin routes from git history
```

## Benefits of Migration

### Unified System
✅ All content in one place  
✅ Consistent editing interface  
✅ Shared media and category systems  
✅ Single API for all content types  

### New Capabilities
✅ Create hierarchical custom post types (documentation, products with subcategories)  
✅ Mix and match features for any content type  
✅ Control which types show in dashboard  
✅ Flexible content organization  

### Simplified Codebase
✅ Removed duplicate code for pages  
✅ Single set of CRUD operations  
✅ Easier to maintain and extend  

## Custom Post Type Examples

Now that the system is unified, you can easily create:

**Hierarchical Documentation:**
```json
{
  "name": "doc",
  "label": "Documentation",
  "hierarchical": true,
  "supports": {
    "title": true,
    "content": true
  }
}
```

**Product Categories:**
```json
{
  "name": "product",
  "label": "Products",
  "hierarchical": true,
  "supports": {
    "title": true,
    "content": true,
    "excerpt": true,
    "featured_image": true
  }
}
```

## Troubleshooting

### "Page not found" on existing pages

**Issue**: Old pages aren't displaying

**Solution**: Run the migration script again or check:
```sql
SELECT * FROM posts WHERE post_type = 'page';
```

### Pages appear in Posts list

**Issue**: Post type filter not working

**Solution**: Ensure you're using `?post_type=page` parameter

### Hierarchical features not showing

**Issue**: Parent selector missing

**Solution**: Verify post type has `hierarchical = TRUE`:
```sql
UPDATE post_types SET hierarchical = TRUE WHERE name = 'page';
```

## Support

If you encounter issues during migration, check:
1. Database error logs
2. Browser console
3. Server terminal output
4. Verify all migration script steps completed successfully

## Version Requirements

- **Minimum Version**: 1.0.3
- **Database**: MySQL 5.7+ with utf8mb4 support
- **Node.js**: 18+

