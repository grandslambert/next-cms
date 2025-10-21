# Database Fixes Applied

## Core Issue
The system was incorrectly treating `site_id` fields:
1. Using `Site._id` (ObjectId) instead of `Site.id` (Number) for site references
2. Adding `site_id` filters to site-specific models that don't have that field
3. Using ObjectId for `site_id` in global models (SiteUser, UserMeta) instead of Number

## Files Fixed

### ✅ Global Database (SuperAdmin) Routes
1. **`app/api/users/route.ts`**
   - Fixed role validation using `GlobalModels.Role()`
   - Fixed `site_id` conversion from ObjectId to Number in site assignments
   - Fixed site lookups to use `Site.findOne({ id: ... })`

2. **`app/api/users/[id]/route.ts`**
   - Fixed `Site.find({ id: { $in: siteIds } })` instead of `_id`
   - Fixed `.lean()` TypeScript issues with `as any[]`

3. **`app/api/sites/route.ts`**
   - Fixed GET to use numeric `site.id` for queries
   - Fixed POST to use `site.id` for database initialization

4. **`app/api/sites/[id]/route.ts`**
   - Fixed all handlers (GET, PUT, DELETE) to use `Site.findOne({ id: siteId })`
   - Changed `params.id` parsing to `parseInt()`

5. **`app/api/sites/[id]/users/route.ts`**
   - Fixed GET to use numeric `site_id` in `SiteUser` queries
   - Fixed POST to use numeric `site_id` when creating `SiteUser`

6. **`app/api/sites/[id]/users/[userId]/route.ts`**
   - Fixed PUT and DELETE to use numeric `site_id`

7. **`app/api/sites/available/route.ts`**
   - Fixed to query `Site.find({ id: { $in: siteIds } })`

8. **`app/api/auth/switch-site/route.ts`**
   - Fixed to use numeric site ID validation and lookup

### ✅ Site-Specific Routes
9. **`app/api/post-types/route.ts`**
   - Completely rewritten to use `SiteModels.PostType(siteId)`
   - Removed ALL `site_id` filters and fields (doesn't exist in model)
   - Fixed GET and POST handlers

10. **`app/api/user/meta/route.ts`**
    - Switched to `GlobalModels.UserMeta()`
    - Changed `site_id` from ObjectId to Number

11. **`package.json`**
    - Updated `dev` script to auto-clean `.next` and kill node processes

## Remaining Files to Fix (38 media-related instances)
These need the same pattern - remove `site_id` filters:
- app/api/media/** (all routes)
- app/api/menu-items/** (all routes)
- app/api/menu-locations/**
- app/api/menus/**
- app/api/posts/autosave/**

## Test Now
The critical SuperAdmin functions should work:
1. ✅ Login
2. ✅ View sites
3. ✅ Create sites
4. ✅ View users
5. ✅ Create users (with role validation fix)
6. ✅ Site switching

## Database Structure (Final)
- **Global DB** (`nextcms_global`): Users, Roles, Sites, SiteUser, UserMeta
- **Site DBs** (`nextcms_site{id}`): All content (Posts, Media, Menus, etc.)
- **Key Rule**: `Site.id` (Number) → used everywhere for site references
- **SiteUser.site_id** → Number
- **UserMeta.site_id** → Number
- **Site-specific models** → NO site_id field

