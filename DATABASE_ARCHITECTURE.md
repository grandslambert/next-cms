# Database Architecture

## Media Reference Design

### Proper Relational Structure

The CMS uses **media IDs** (foreign keys) instead of storing URLs directly. This is proper database normalization and provides significant benefits.

### Database Schema

**Posts Table:**
```sql
featured_image_id INT
FOREIGN KEY (featured_image_id) REFERENCES media(id) ON DELETE SET NULL
```

**Pages Table:**
```sql
featured_image_id INT
FOREIGN KEY (featured_image_id) REFERENCES media(id) ON DELETE SET NULL
```

**Categories Table:**
```sql
image_id INT
FOREIGN KEY (image_id) REFERENCES media(id) ON DELETE SET NULL
```

### Why Use IDs Instead of URLs?

**❌ Bad Approach (storing URLs):**
```sql
featured_image VARCHAR(255)  -- Stores "/uploads/image.jpg"
```

Problems:
- If file path changes, must update ALL records
- No cascade delete - orphaned references
- Can't access image metadata (sizes, dimensions)
- No referential integrity
- Wasted storage (repeated long strings)

**✅ Good Approach (storing IDs):**
```sql
featured_image_id INT
FOREIGN KEY (featured_image_id) REFERENCES media(id)
```

Benefits:
- ✅ Single source of truth (media table)
- ✅ Automatic cleanup (SET NULL on delete)
- ✅ Easy to update file paths centrally
- ✅ Can access all image sizes via JOIN
- ✅ Referential integrity enforced
- ✅ Efficient storage (INT vs VARCHAR)
- ✅ Proper relational design

### How It Works

**Storing an Image:**
```javascript
// User selects image from MediaSelector
MediaSelector returns: (id: 5, url: "/uploads/2025/10/image.jpg")

// Component stores
setFeaturedImageId(5);  // For database
setFeaturedImageUrl(url);  // For preview only

// API receives
{ featured_image_id: 5 }

// Database stores
INSERT INTO posts (..., featured_image_id) VALUES (..., 5)
```

**Retrieving with Image Data:**
```sql
SELECT p.*, 
       m.url as featured_image_url,
       m.sizes as featured_image_sizes
FROM posts p
LEFT JOIN media m ON p.featured_image_id = m.id
WHERE p.id = 1
```

Returns:
```json
{
  "id": 1,
  "title": "My Post",
  "featured_image_id": 5,
  "featured_image_url": "/uploads/2025/10/image.jpg",
  "featured_image_sizes": "{\"thumbnail\":{...}, \"medium\":{...}}"
}
```

**Using in Templates:**
```typescript
// Get appropriate size
const imageUrl = getImageUrl(
  post.featured_image_url,  // Fallback
  post.featured_image_sizes, // JSON with all sizes
  'medium'  // Preferred size
);
```

### Cascade Behavior

**When media is deleted:**
```sql
DELETE FROM media WHERE id = 5;
```

Automatically:
- Posts with `featured_image_id = 5` → Set to NULL
- Pages with `featured_image_id = 5` → Set to NULL  
- Categories with `image_id = 5` → Set to NULL
- No orphaned references
- No broken images

### Benefits Summary

| Aspect | URL Storage | ID Storage |
|--------|-------------|------------|
| **Flexibility** | ❌ Hard to change paths | ✅ Easy central updates |
| **Data Integrity** | ❌ No enforcement | ✅ Foreign keys |
| **Orphan Prevention** | ❌ Manual cleanup | ✅ Automatic CASCADE |
| **Metadata Access** | ❌ Need separate lookup | ✅ Simple JOIN |
| **Storage Efficiency** | ❌ 255+ bytes | ✅ 4 bytes (INT) |
| **Relational Design** | ❌ Not normalized | ✅ Properly normalized |

### Query Performance

With indexes on foreign keys:
```sql
INDEX on posts.featured_image_id
INDEX on pages.featured_image_id
INDEX on categories.image_id
```

JOINs are fast and efficient.

### Migration Path

Old records with NULL image IDs work fine:
- LEFT JOIN returns NULL for image data
- Templates handle gracefully with fallbacks
- Can migrate incrementally

### Admin Preview

While editing:
- `featured_image_id` → Saved to database
- `featured_image_url` → Used for preview only
- URL not persisted in posts/pages/categories

### TypeScript Types

```typescript
interface Post {
  id: number;
  title: string;
  featured_image_id: number | null;
  // ... other fields
  
  // From JOIN (not in database)
  featured_image_url?: string;
  featured_image_sizes?: string; // JSON
}
```

## Other Foreign Key Relationships

The CMS uses foreign keys throughout:

```sql
-- User relationships
posts.author_id → users.id (CASCADE DELETE)
pages.author_id → users.id (CASCADE DELETE)
media.uploaded_by → users.id (CASCADE DELETE)

-- Content relationships  
pages.parent_id → pages.id (SET NULL)
categories.parent_id → categories.id (SET NULL)

-- Media relationships (NEW)
posts.featured_image_id → media.id (SET NULL)
pages.featured_image_id → media.id (SET NULL)
categories.image_id → media.id (SET NULL)

-- Category relationships
post_categories.post_id → posts.id (CASCADE DELETE)
post_categories.category_id → categories.id (CASCADE DELETE)
```

### Cascade Actions

**ON DELETE CASCADE:**
- Delete user → All their posts/pages/media deleted
- Delete post → All its category relationships deleted

**ON DELETE SET NULL:**
- Delete media → featured_image_id set to NULL (post remains)
- Delete parent page → child pages' parent_id set to NULL
- Delete parent category → sub-categories remain

This is **proper relational database design** that ensures data integrity and makes the system maintainable!

