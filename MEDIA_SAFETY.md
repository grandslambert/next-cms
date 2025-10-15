# Media Deletion Safety System

## Overview

The CMS implements a comprehensive safety system to prevent accidental data loss when deleting media files.

## Features

### 1. Usage Detection

Before deletion, the system checks:
- ✅ Posts using this image as featured image
- ✅ Pages using this image
- ✅ Categories using this image
- ✅ Total usage count

### 2. Warning Dialog

**If image is NOT used:**
```
Are you sure you want to delete "vacation.jpg"?
```

**If image IS used:**
```
⚠️ WARNING: This image is currently being used in:

📝 2 Post(s):
   - Summer Vacation Tips
   - Best Beaches 2025

📄 1 Page(s):
   - About Us

🏷️ 1 Categories:
   - Travel

If you delete this image, it will be removed from all these locations.

Are you sure you want to continue?
```

### 3. Automatic Cleanup

When user confirms deletion:

1. **Foreign Keys Automatically Clear References**
   ```sql
   -- These happen automatically via ON DELETE SET NULL:
   UPDATE posts SET featured_image_id = NULL WHERE featured_image_id = 5;
   UPDATE pages SET featured_image_id = NULL WHERE featured_image_id = 5;
   UPDATE categories SET image_id = NULL WHERE image_id = 5;
   ```

2. **All Image Sizes Deleted**
   ```
   /uploads/2025/10/image.jpg (deleted)
   /uploads/2025/10/image-large.jpg (deleted)
   /uploads/2025/10/image-medium.jpg (deleted)
   /uploads/2025/10/image-thumbnail.jpg (deleted)
   ```

3. **Database Record Removed**
   ```sql
   DELETE FROM media WHERE id = 5;
   ```

### 4. Success Notification

**Simple (no usage):**
```
✅ Media deleted successfully
```

**With cleared references:**
```
✅ Media deleted successfully (cleared from 4 locations: 2 posts, 1 pages, 1 categories)
```

### 5. Cache Invalidation

Automatically refreshes:
- ✅ Media library list
- ✅ Posts list (if posts affected)
- ✅ Pages list (if pages affected)
- ✅ Categories list (if categories affected)

Content updates instantly without manual refresh!

## Technical Implementation

### API Endpoint: Check Usage

**GET /api/media/:id/usage**

```typescript
Response:
{
  "usage": {
    "posts": [
      { "id": 1, "title": "My Post" },
      { "id": 5, "title": "Another Post" }
    ],
    "pages": [
      { "id": 2, "title": "About" }
    ],
    "categories": [
      { "id": 3, "name": "Travel" }
    ],
    "total": 4
  }
}
```

### API Endpoint: Delete with Response

**DELETE /api/media/:id**

```typescript
Response:
{
  "success": true,
  "cleared_references": {
    "posts": 2,
    "pages": 1,
    "categories": 1,
    "total": 4
  }
}
```

### Database Foreign Keys

```sql
-- Posts table
ALTER TABLE posts 
ADD FOREIGN KEY (featured_image_id) 
REFERENCES media(id) 
ON DELETE SET NULL;

-- Pages table
ALTER TABLE pages 
ADD FOREIGN KEY (featured_image_id) 
REFERENCES media(id) 
ON DELETE SET NULL;

-- Categories table
ALTER TABLE categories 
ADD FOREIGN KEY (image_id) 
REFERENCES media(id) 
ON DELETE SET NULL;
```

**ON DELETE SET NULL** means:
- Image reference automatically becomes NULL
- Content (post/page/category) is NOT deleted
- No orphaned references
- No broken images

## User Flow

### Scenario 1: Unused Image

1. User clicks delete button
2. System checks usage → 0 results
3. Simple confirmation: "Are you sure?"
4. User confirms
5. Image deleted
6. Toast: "Media deleted successfully"

### Scenario 2: Image in Use

1. User clicks delete button
2. System checks usage → 4 results found
3. Detailed warning with list of posts/pages/categories
4. User sees exactly where it's used
5. User can cancel or proceed
6. If confirmed:
   - Image deleted from filesystem (all sizes)
   - References cleared automatically (foreign keys)
   - Database record removed
7. Toast: "Media deleted successfully (cleared from 4 locations: ...)"
8. Affected content automatically refreshed

## Benefits

### Data Integrity
- ✅ No orphaned references (foreign keys enforce)
- ✅ No broken images on frontend
- ✅ Automatic cleanup (no manual intervention)

### User Safety
- ✅ Clear warning before deletion
- ✅ Shows exact usage locations
- ✅ User can make informed decision
- ✅ Can cancel if unsure

### User Experience
- ✅ Transparent process
- ✅ Detailed feedback
- ✅ Automatic cache refresh
- ✅ No page reload needed

### Developer Benefits
- ✅ Foreign keys handle complexity
- ✅ No manual cleanup code needed
- ✅ Consistent behavior
- ✅ Type-safe TypeScript

## Edge Cases Handled

### Image Used Multiple Times

If image is used in 10 posts:
- Shows all 10 in warning (scrollable if needed)
- Clears all 10 references
- Reports "cleared from 10 locations"

### Partial Deletion Failure

If filesystem delete fails but DB succeeds:
- Database still cleaned up
- Error logged to console
- User gets success (DB is source of truth)

### Concurrent Deletion

If two admins try to delete same image:
- First succeeds
- Second gets "Media not found" error
- No duplicate processing

### Permission Check

Only authenticated users can:
- Check usage
- Delete media

## Testing

### Test Usage Detection

1. Upload an image
2. Set as featured image on a post
3. Set as featured image on a page
4. Set as category image
5. Try to delete
6. Should show warning with all 3 usages

### Test Cleanup

After deletion:
1. Check post - featured_image_id should be NULL
2. Check page - featured_image_id should be NULL
3. Check category - image_id should be NULL
4. Check filesystem - all files removed
5. Check media table - record gone

### Test Unused Deletion

1. Upload image
2. Don't use it anywhere
3. Delete
4. Should get simple confirmation
5. Should delete without warnings

## Code Example

### Frontend Check Usage

```typescript
const checkUsage = async (mediaId: number) => {
  const res = await axios.get(`/api/media/${mediaId}/usage`);
  const usage = res.data.usage;
  
  if (usage.total > 0) {
    console.log('Image used in:');
    console.log('Posts:', usage.posts.length);
    console.log('Pages:', usage.pages.length);
    console.log('Categories:', usage.categories.length);
  }
};
```

### Backend Check and Delete

```typescript
// Check usage
const [usage] = await db.query(
  'SELECT COUNT(*) as count FROM posts WHERE featured_image_id = ?',
  [mediaId]
);

// Delete (foreign keys handle cleanup)
await db.query('DELETE FROM media WHERE id = ?', [mediaId]);
// Posts automatically updated to featured_image_id = NULL
```

## Best Practices

### For Admins

1. **Check warning carefully** before deleting
2. **Note which content uses the image** 
3. **Consider replacing** instead of deleting
4. **Backup important images** before deletion

### For Developers

1. **Always use foreign keys** for references
2. **Check usage** before destructive operations
3. **Provide clear feedback** to users
4. **Log important actions** for audit trail

## Security

- ✅ Authentication required for all operations
- ✅ Admin-only deletion
- ✅ SQL injection prevented (parameterized queries)
- ✅ Filesystem access controlled

## Performance

- Fast usage checks (indexed foreign keys)
- Single transaction for cleanup
- Minimal database queries (3 COUNT queries)
- Efficient cache invalidation

## Future Enhancements

Possible improvements:
- [ ] "Replace Image" button instead of delete
- [ ] Bulk delete with usage summary
- [ ] Restore deleted images (trash system)
- [ ] Audit log of deletions
- [ ] Email notification to content authors
- [ ] Preview content using the image

---

**The system provides WordPress-level safety with better transparency!** 🛡️

