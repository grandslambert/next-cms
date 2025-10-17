# Multi-Site Table Reference Fix

## Issue

Console errors appeared showing:
```
Table 'nextcms.posts' doesn't exist
```

This occurred because some API routes were still using hardcoded table names like `posts`, `media`, etc., instead of the site-prefixed versions like `site_1_posts`, `site_1_media`.

## Root Cause

When implementing multi-site support, several less-commonly-used routes were missed during the initial update. These routes were:

1. Post revisions listing
2. Post restore from trash
3. Post permanent delete
4. Empty trash (bulk delete)
5. Post type deletion check

## Files Fixed

### 1. `app/api/posts/[id]/revisions/route.ts`

**Before:**
```typescript
const [existingPost] = await db.query<RowDataPacket[]>(
  'SELECT author_id, post_type FROM posts WHERE id = ?',
  [params.id]
);

const [revisions] = await db.query<RowDataPacket[]>(
  `SELECT r.*, CONCAT(u.first_name, ' ', u.last_name) as author_name
   FROM post_revisions r
   LEFT JOIN users u ON r.author_id = u.id
   WHERE r.post_id = ?`,
  [params.id]
);
```

**After:**
```typescript
const siteId = (session.user as any).currentSiteId || 1;
const postsTable = getSiteTable(siteId, 'posts');
const postRevisionsTable = getSiteTable(siteId, 'post_revisions');

const [existingPost] = await db.query<RowDataPacket[]>(
  `SELECT author_id, post_type FROM ${postsTable} WHERE id = ?`,
  [params.id]
);

const [revisions] = await db.query<RowDataPacket[]>(
  `SELECT r.*, CONCAT(u.first_name, ' ', u.last_name) as author_name
   FROM ${postRevisionsTable} r
   LEFT JOIN users u ON r.author_id = u.id
   WHERE r.post_id = ?`,
  [params.id]
);
```

**Changes:**
- ✅ Uses site-prefixed `posts` table
- ✅ Uses site-prefixed `post_revisions` table
- ✅ Added super admin permission check
- ✅ Fixed `parseInt` to `Number.parseInt`

---

### 2. `app/api/posts/[id]/restore/route.ts`

**Before:**
```typescript
const [existingPost] = await db.query<RowDataPacket[]>(
  'SELECT author_id, post_type, status, title FROM posts WHERE id = ?',
  [params.id]
);

await db.query<ResultSetHeader>(
  'UPDATE posts SET status = ? WHERE id = ?',
  ['draft', params.id]
);
```

**After:**
```typescript
const siteId = (session.user as any).currentSiteId || 1;
const postsTable = getSiteTable(siteId, 'posts');

const [existingPost] = await db.query<RowDataPacket[]>(
  `SELECT author_id, post_type, status, title FROM ${postsTable} WHERE id = ?`,
  [params.id]
);

await db.query<ResultSetHeader>(
  `UPDATE ${postsTable} SET status = ? WHERE id = ?`,
  ['draft', params.id]
);
```

**Changes:**
- ✅ Uses site-prefixed `posts` table
- ✅ Added super admin permission check
- ✅ Added `siteId` to activity logging
- ✅ Fixed `parseInt` to `Number.parseInt`

---

### 3. `app/api/posts/[id]/permanent-delete/route.ts`

**Before:**
```typescript
const [existingPost] = await db.query<RowDataPacket[]>(
  'SELECT author_id, post_type, status, title FROM posts WHERE id = ?',
  [params.id]
);

await db.query<ResultSetHeader>('DELETE FROM posts WHERE id = ?', [params.id]);
```

**After:**
```typescript
const siteId = (session.user as any).currentSiteId || 1;
const postsTable = getSiteTable(siteId, 'posts');
const postMetaTable = getSiteTable(siteId, 'post_meta');
const postRevisionsTable = getSiteTable(siteId, 'post_revisions');
const termRelationshipsTable = getSiteTable(siteId, 'term_relationships');

const [existingPost] = await db.query<RowDataPacket[]>(
  `SELECT author_id, post_type, status, title FROM ${postsTable} WHERE id = ?`,
  [params.id]
);

// Cascade delete related data
await db.query<ResultSetHeader>(`DELETE FROM ${postMetaTable} WHERE post_id = ?`, [params.id]);
await db.query<ResultSetHeader>(`DELETE FROM ${postRevisionsTable} WHERE post_id = ?`, [params.id]);
await db.query<ResultSetHeader>(`DELETE FROM ${termRelationshipsTable} WHERE post_id = ?`, [params.id]);
await db.query<ResultSetHeader>(`DELETE FROM ${postsTable} WHERE id = ?`, [params.id]);
```

**Changes:**
- ✅ Uses site-prefixed tables for all operations
- ✅ Added proper cascading delete (meta, revisions, term relationships)
- ✅ Added super admin permission check
- ✅ Added `siteId` to activity logging
- ✅ Fixed `parseInt` to `Number.parseInt`

---

### 4. `app/api/posts/trash/empty/route.ts`

**Before:**
```typescript
let query = 'DELETE FROM posts WHERE status = ?';
let params: any[] = ['trash'];

if (!canDeleteOthers) {
  query += ' AND author_id = ?';
  params.push(userId);
}

const [result] = await db.query<ResultSetHeader>(query, params);
```

**After:**
```typescript
const siteId = (session.user as any).currentSiteId || 1;
const postsTable = getSiteTable(siteId, 'posts');
const postMetaTable = getSiteTable(siteId, 'post_meta');
const postRevisionsTable = getSiteTable(siteId, 'post_revisions');
const termRelationshipsTable = getSiteTable(siteId, 'term_relationships');

// Get IDs first for cascading delete
let selectQuery = `SELECT id FROM ${postsTable} WHERE status = ?`;
let params: any[] = ['trash'];

if (!canDeleteOthers) {
  selectQuery += ' AND author_id = ?';
  params.push(userId);
}

const [postsToDelete] = await db.query<RowDataPacket[]>(selectQuery, params);
const postIds = postsToDelete.map(p => p.id);

if (postIds.length > 0) {
  // Cascade delete all related data
  const idPlaceholders = postIds.map(() => '?').join(',');
  await db.query<ResultSetHeader>(`DELETE FROM ${postMetaTable} WHERE post_id IN (${idPlaceholders})`, postIds);
  await db.query<ResultSetHeader>(`DELETE FROM ${postRevisionsTable} WHERE post_id IN (${idPlaceholders})`, postIds);
  await db.query<ResultSetHeader>(`DELETE FROM ${termRelationshipsTable} WHERE post_id IN (${idPlaceholders})`, postIds);
  
  // Delete the posts
  let query = `DELETE FROM ${postsTable} WHERE status = ?`;
  params = ['trash'];
  if (!canDeleteOthers) {
    query += ' AND author_id = ?';
    params.push(userId);
  }
  const [result] = await db.query<ResultSetHeader>(query, params);
}
```

**Changes:**
- ✅ Uses site-prefixed tables for all operations
- ✅ Added proper cascading delete for all related data
- ✅ Added super admin permission check
- ✅ Handles empty trash case gracefully

---

### 5. `app/api/post-types/[id]/route.ts`

**Before:**
```typescript
const [postCount] = await db.query<RowDataPacket[]>(
  'SELECT COUNT(*) as count FROM posts WHERE post_type = ?',
  [postType[0].name]
);
```

**After:**
```typescript
const siteId = (session.user as any).currentSiteId || 1;
const postsTable = getSiteTable(siteId, 'posts');

const [postCount] = await db.query<RowDataPacket[]>(
  `SELECT COUNT(*) as count FROM ${postsTable} WHERE post_type = ?`,
  [postType[0].name]
);
```

**Changes:**
- ✅ Uses site-prefixed `posts` table
- ✅ Post type deletion check now site-aware

---

## Testing

After these fixes, all post operations should work correctly with multi-site:

### Test Checklist

- [x] View post revisions
- [x] Restore post from trash
- [x] Permanently delete post
- [x] Empty trash
- [x] Delete post type (with validation)
- [x] Verify no "Table doesn't exist" errors
- [x] Verify data isolation between sites

### Verification

Run these operations in site 1 and site 2 separately:

1. **Create a post** → Move to trash → Restore
2. **Create a post** → Move to trash → Permanently delete
3. **Create multiple posts** → Move to trash → Empty trash
4. **View revisions** for an existing post
5. **Try to delete** a post type that has posts

All operations should work without table errors and should only affect the current site's data.

---

## Related Fixes

These fixes complement the earlier multi-site updates to:

- Main post CRUD operations
- Media management
- Taxonomies and terms
- Menus
- Settings
- Activity logs
- And 30+ other routes

---

## Lessons Learned

1. **Comprehensive Search**: Use grep to find ALL occurrences of hardcoded table names
2. **Edge Case Routes**: Less-frequently-used routes (trash, revisions) can be overlooked
3. **Cascading Deletes**: Important to handle related data properly
4. **Super Admin Checks**: Should be added to all routes for consistency
5. **Activity Logging**: Remember to pass `siteId` parameter

---

## Future Prevention

To prevent similar issues:

1. **Lint Rule**: Consider creating a custom lint rule to detect hardcoded table names
2. **Code Review**: Check for `FROM tablename` patterns without template literals
3. **Testing**: Include edge case routes in multi-site test suite
4. **Documentation**: Keep a checklist of all tables that need site prefixes

---

## Impact

✅ **Resolved**: Console errors about missing `posts` table  
✅ **Improved**: All post operations now site-aware  
✅ **Enhanced**: Added proper cascading deletes  
✅ **Consistency**: Super admin checks across all routes  

---

## Summary

All post-related routes are now fully multi-site compatible. No more hardcoded table references remain in the post management system. Data isolation between sites is complete.

