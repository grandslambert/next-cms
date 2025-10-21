# Comprehensive Database Fixes Required

## Rule: Site-specific models (in `nextcms_site{id}` databases) have NO `site_id` field

### Files to Fix:

All queries that use `site_id: new mongoose.Types.ObjectId(siteId)` in site-specific models need the `site_id` filter REMOVED.

#### Media API Routes (38 instances)
- `app/api/media/bulk/route.ts`
- `app/api/media/regenerate/route.ts`
- `app/api/media/trash/empty/route.ts`
- `app/api/media/bulk/permanent-delete/route.ts`
- `app/api/media/[id]/permanent-delete/route.ts`
- `app/api/media/folders/route.ts`
- `app/api/media/route.ts`
- `app/api/media/[id]/route.ts`
- `app/api/media/[id]/usage/route.ts`
- `app/api/media/[id]/restore/route.ts`
- `app/api/media/[id]/move/route.ts`
- `app/api/media/folders/all/route.ts`

#### Other API Routes
- `app/api/menu-items/[id]/route.ts`
- `app/api/menu-items/route.ts`
- `app/api/post-types/route.ts`
- `app/api/posts/autosave/route.ts`
- `app/api/menu-locations/route.ts`
- `app/api/menus/route.ts`
- `app/api/user/meta/route.ts` (UserMeta is GLOBAL - site_id should be Number, not ObjectId)

## Fix Pattern

### BEFORE (WRONG):
```typescript
const Media = await SiteModels.Media(siteId);
const media = await Media.find({ site_id: new mongoose.Types.ObjectId(siteId) });
```

### AFTER (CORRECT):
```typescript
const Media = await SiteModels.Media(siteId);
const media = await Media.find({}); // NO site_id filter!
// Database isolation handles the site separation
```

### Special Case: UserMeta (Global DB)
```typescript
// BEFORE (WRONG):
query.site_id = new mongoose.Types.ObjectId(siteId);

// AFTER (CORRECT):
query.site_id = parseInt(siteId); // Number, not ObjectId
```

