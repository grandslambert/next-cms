# Permissions Proxy Issue

## Problem

JavaScript Proxy objects don't serialize properly when sending data from server to client. When NextAuth creates the JWT token and sends it to the client, the Proxy object for super admin permissions gets serialized and loses its Proxy behavior.

## Current Implementation

```typescript
// In lib/auth.ts
if (isSuperAdmin) {
  permissions = new Proxy({ is_super_admin: true }, {
    get: (target, prop) => {
      return true; // Always return true
    }
  });
}
```

## Issue

When this Proxy is serialized for the JWT/session, it becomes a plain object `{ is_super_admin: true }` and loses the Proxy trap that returns `true` for any property access.

## Solution

Instead of relying on the Proxy object on the client side, components should explicitly check the `isSuperAdmin` flag before checking individual permissions.

**Before:**
```typescript
const hasPermission = permissions[`manage_posts_${pt.name}`];
```

**After:**
```typescript
const hasPermission = isSuperAdmin || permissions[`manage_posts_${pt.name}`];
```

## Files That Need This Pattern

1. ✅ `app/admin/page.tsx` - Dashboard (FIXED)
2. ✅ `hooks/usePermission.ts` - Permission hook (already handles this correctly)
3. ✅ `components/admin/Sidebar.tsx` - Menu item visibility (already handles this)
4. Any other components that check permissions directly

## Alternative Solution

We could serialize ALL permissions for super admins as `true` values instead of using a Proxy:

```typescript
if (isSuperAdmin) {
  // List all possible permissions explicitly
  permissions = {
    is_super_admin: true,
    view_dashboard: true,
    manage_posts_post: true,
    manage_posts_page: true,
    manage_others_posts: true,
    can_publish: true,
    can_delete: true,
    can_delete_others: true,
    manage_media: true,
    manage_taxonomies: true,
    manage_users: true,
    manage_roles: true,
    manage_post_types: true,
    manage_settings: true,
    manage_menus: true,
    // ... etc
  };
}
```

However, this approach:
- Requires maintaining a master list of all permissions
- Doesn't handle dynamic permissions (like `manage_posts_${customType}`)
- Is more brittle and harder to maintain

Therefore, the **explicit `isSuperAdmin` check** is the better solution.

