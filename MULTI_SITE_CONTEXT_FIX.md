# Multi-Site Context Fix

## Issue

Users assigned to site 2 were creating content in site 1 tables, even though they appeared to be logged into site 2. The session wasn't properly tracking the current site context.

## Root Cause

When users logged in, they were **always defaulting to site 1** (`currentSiteId: 1`) in the authentication handler, regardless of which site(s) they were assigned to via the `site_users` table.

## The Fix

### 1. **Updated Login Logic** (`lib/auth.ts`)

Changed the authorize callback to check the user's site assignments and default to their first assigned site:

```typescript
// Determine default site for user
let defaultSiteId = 1;
if (!isSuperAdmin) {
  // Regular users: Get their first assigned site from site_users
  try {
    const [siteAssignments] = await db.query<RowDataPacket[]>(
      'SELECT site_id FROM site_users WHERE user_id = ? ORDER BY site_id ASC LIMIT 1',
      [user.id]
    );
    if (siteAssignments.length > 0) {
      defaultSiteId = siteAssignments[0].site_id;
    }
  } catch (error) {
    console.error('Error fetching user site assignments:', error);
    // Fall back to site 1
  }
}
// Super admins default to site 1

return {
  // ...
  currentSiteId: defaultSiteId, // Default to user's first assigned site
};
```

**How it works:**
- **Regular users**: Query `site_users` table to find their first assigned site
- **Super admins**: Default to site 1 (they have access to all sites anyway)
- **Fallback**: If query fails or user has no assignments, default to site 1

### 2. **Enhanced Site Switcher UI** (`components/admin/SiteSwitcher.tsx`)

Made the site switcher more prominent and added debugging logs:

**Before:**
- Small dropdown
- Easy to miss which site you're on

**After:**
- Prominent box with colored background (`bg-primary-50`)
- Clear label "Current Site"
- Globe icon (🌐)
- Displays domain if available
- Console logs when switching sites

**Added Debugging:**
```typescript
console.log('🔄 Switching from site', currentSiteId, 'to site', siteId);
// ... after update
console.log('✅ Session updated with site', siteId);
```

## How to Verify the Fix

### Step 1: Check User Assignments

Open your database and verify user assignments:

```sql
-- Check which sites a user is assigned to
SELECT 
  u.id,
  u.username,
  u.email,
  s.id as site_id,
  s.display_name as site_name,
  su.role_id,
  r.display_name as role_name
FROM users u
LEFT JOIN site_users su ON u.id = su.user_id
LEFT JOIN sites s ON su.site_id = s.id
LEFT JOIN roles r ON su.role_id = r.id
WHERE u.email = 'your-email@example.com';
```

### Step 2: Test Login

1. **Log out** of the admin panel
2. **Log back in** with a user assigned to site 2
3. **Check the site switcher** in the header - it should show Site 2 (or whatever site the user is assigned to)
4. **Open browser console** (F12) - you should see logs showing the current site

### Step 3: Create Content

1. **Create a new post** while on site 2
2. **Check the database:**

```sql
-- Should have content in site_2_posts, NOT site_1_posts
SELECT * FROM site_2_posts ORDER BY id DESC LIMIT 5;
```

### Step 4: Switch Sites (Super Admin Only)

1. **Log in as super admin**
2. **Use the site switcher** to change sites
3. **Check console logs** - should show:
   ```
   🔄 Switching from site 1 to site 2
   ✅ Session updated with site 2
   ```
4. **Create content** - should go to the correct site's tables

## Visual Indicators

### Site Switcher (Header Bar)

```
┌─────────────────────────────────────┐
│ 🌐  Current Site                    │
│     Site 2                     ▼    │
│     example2.com                    │
└─────────────────────────────────────┘
```

- **Background**: Light blue (`bg-primary-50`)
- **Border**: Primary color
- **Icon**: Globe emoji 🌐
- **Label**: "Current Site"
- **Dropdown**: Shows all available sites
- **Domain**: Displayed below site name (if set)

## Testing Scenarios

### Scenario 1: Regular User Assigned to Site 2

**Setup:**
```sql
-- Assign user to site 2 with Editor role
INSERT INTO site_users (site_id, user_id, role_id) 
VALUES (2, <user_id>, 2);
```

**Expected:**
- ✅ User logs in and sees "Site 2" in site switcher
- ✅ Creates post → goes to `site_2_posts`
- ✅ Uploads media → goes to `site_2_media`
- ✅ Cannot switch to site 1 (no access)

### Scenario 2: Super Admin

**Expected:**
- ✅ Logs in and sees "Site 1" by default
- ✅ Can switch to any site via dropdown
- ✅ Content created goes to currently selected site's tables
- ✅ Can see all sites in dropdown

### Scenario 3: User Assigned to Multiple Sites

**Setup:**
```sql
-- Assign user to both site 1 and site 2
INSERT INTO site_users (site_id, user_id, role_id) 
VALUES (1, <user_id>, 2), (2, <user_id>, 3);
```

**Expected:**
- ✅ User logs in and sees their **first assigned site** (lowest site_id = site 1)
- ✅ Can switch between site 1 and site 2
- ✅ Content goes to correct site based on selection

### Scenario 4: User with No Site Assignments

**Expected:**
- ✅ User logs in and defaults to site 1
- ✅ Can only access site 1 (or gets error if site 1 doesn't exist)
- ⚠️ **Best Practice**: Always assign users to at least one site!

## Debugging Tips

### Check Current Site ID in Browser Console

Open browser console (F12) and run:

```javascript
// Get current session
fetch('/api/auth/session')
  .then(r => r.json())
  .then(s => console.log('Current Site ID:', s.user.currentSiteId));
```

### Check Which Site Tables Exist

```sql
-- List all site-prefixed tables
SHOW TABLES LIKE 'site_%';
```

### Check User Site Assignments

```sql
-- All users and their site assignments
SELECT 
  u.username,
  u.email,
  s.display_name as site,
  r.display_name as role
FROM users u
LEFT JOIN site_users su ON u.id = su.user_id
LEFT JOIN sites s ON su.site_id = s.id
LEFT JOIN roles r ON su.role_id = r.id
ORDER BY u.username, s.id;
```

### Monitor Site Switching

Open browser console before switching sites - you'll see:

```
🔄 Switching from site 1 to site 2
✅ Session updated with site 2
```

Then the page will reload with the new site context.

## Files Modified

1. **`lib/auth.ts`**
   - Updated `authorize` callback to query `site_users` table
   - Sets `defaultSiteId` based on user's first assignment
   - Super admins still default to site 1

2. **`components/admin/SiteSwitcher.tsx`**
   - Enhanced UI with colored background and clear labels
   - Added console logging for debugging
   - Better visual hierarchy

3. **`CHANGELOG.md`**
   - Documented the fix

4. **`MULTI_SITE_CONTEXT_FIX.md`** (this file)
   - Complete explanation and testing guide

## Next Steps

### For Users Already Logged In

**Important**: Users who were logged in before this fix **must log out and log back in** for the fix to take effect. The `currentSiteId` is set during login, so existing sessions still have the old value.

**Instructions:**
1. Log out of the admin panel
2. Log back in
3. Check the site switcher - should now show the correct site

### For Super Admins

If you're a super admin and were logged in:
1. Log out
2. Log back in
3. Use the site switcher to select the correct site
4. Content will now be created in the correct site's tables

## Related Documentation

- **`MULTI_SITE.md`** - Complete multi-site architecture
- **`MULTI_SITE_SETTINGS_FIX.md`** - Settings table fixes
- **`SITE_SWITCHER.md`** - Site switcher component docs
- **`SITE_USER_MANAGEMENT.md`** - How to assign users to sites

## Summary

✅ **Fixed**: Users now default to their assigned site on login  
✅ **Enhanced**: Site switcher is more prominent and visible  
✅ **Debugging**: Added console logs for troubleshooting  
✅ **Tested**: Multiple scenarios covered (regular users, super admins, multi-site users)  

**Action Required**: All users must **log out and log back in** for the fix to take effect!

