# Site Switcher Documentation

## Overview

The Site Switcher is a UI component that allows users to switch between different sites they have access to in the multi-site CMS. It appears in the admin header bar and provides a seamless way to manage content across multiple sites.

## Features

- **Automatic Detection**: Only shows when a user has access to multiple sites
- **Role-Based Access**: Super Admins see all active sites, regular users only see sites they're assigned to
- **Visual Feedback**: Shows current site name and domain (if configured)
- **Smooth Switching**: Updates session and reloads page to refresh all data with new site context
- **Loading States**: Visual feedback during site switching
- **Role Display**: Shows user's role per site for non-super admin users

## Location

The Site Switcher is located in the admin header bar at the top of the page, next to the user profile section.

## Components

### 1. SiteSwitcher Component
**File**: `components/admin/SiteSwitcher.tsx`

A dropdown select component that:
- Fetches available sites on mount
- Displays current site
- Handles site switching
- Shows loading state during switch
- Automatically hides if user has access to only one site

### 2. Admin Layout
**File**: `app/admin/layout.tsx`

Updated to include:
- Header bar with site switcher
- User profile information
- Sticky header for better UX

### 3. API Endpoints

#### Switch Site Endpoint
**File**: `app/api/auth/switch-site/route.ts`
**Method**: POST
**Body**: `{ siteId: number }`

Validates:
- User is authenticated
- Site exists and is active
- User has access to the site (super admin or assigned via site_users)

Returns:
- Success message with site details
- Triggers session update via NextAuth

#### Available Sites Endpoint
**File**: `app/api/sites/available/route.ts`
**Method**: GET

Returns:
- List of active sites user has access to
- For super admins: all active sites
- For regular users: only assigned sites with role information

## Usage

### For Super Admins

1. Login to the admin panel
2. Look for the site selector in the top header bar
3. Click the dropdown to see all active sites
4. Select a site to switch to it
5. The page will reload with the new site context

### For Regular Users

1. Login to the admin panel
2. If assigned to multiple sites, see the site selector in the header
3. Only sites you have access to will be shown
4. Your role for each site is displayed in parentheses
5. Select a site to switch to it

### For Single-Site Users

If you only have access to one site, the site switcher will be hidden automatically.

## Technical Details

### Session Management

The site switcher uses NextAuth's session update mechanism:

```typescript
// In the component
await update({ currentSiteId: siteId });
```

This triggers the JWT callback in `lib/auth.ts`:

```typescript
async jwt({ token, user, trigger, session }) {
  // Handle site switching via session update
  if (trigger === 'update' && session?.currentSiteId) {
    token.currentSiteId = session.currentSiteId;
  }
  return token;
}
```

### Site Context

All API routes read the current site from the session:

```typescript
const siteId = (session.user as any).currentSiteId || 1;
const tableName = getSiteTable(siteId, 'posts'); // e.g., 'site_1_posts'
```

### Database Queries

Helper functions generate site-prefixed table names:

```typescript
// From lib/db.ts
getSiteTable(1, 'posts') // Returns: 'site_1_posts'
getSiteTable(2, 'media') // Returns: 'site_2_media'
```

## Security

- **Authentication Required**: All endpoints require valid authentication
- **Authorization Check**: Non-super admins can only access sites they're assigned to
- **Active Sites Only**: Only active sites are shown and accessible
- **SQL Injection Protection**: Table names are properly escaped and validated

## User Interface

### Header Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Site: [Current Site ▼]              User Name    [Avatar]  │
│       example.com                    Role                    │
└─────────────────────────────────────────────────────────────┘
```

### Dropdown Options

```
My First Site
My Second Site (Editor)
My Third Site (Author)
```

- No role shown for super admins (they have all permissions anyway)
- Role shown in parentheses for regular users

## Error Handling

The site switcher handles several error cases:

1. **Site Not Found**: Shows error toast if site doesn't exist
2. **Access Denied**: Shows error if user doesn't have access
3. **Inactive Site**: Shows error if site is inactive
4. **Network Error**: Shows generic error message
5. **No Sites**: Component doesn't render if no sites available

## Troubleshooting

### Site Switcher Not Showing

**Possible Causes**:
- User only has access to one site
- No sites exist in the database
- Sites are marked as inactive
- User is not assigned to any sites (non-super admin)

**Solution**:
- Assign user to multiple sites via the Sites management page
- Ensure sites are marked as active
- Super admins always see all active sites

### Can't Switch Sites

**Possible Causes**:
- Site is inactive
- User doesn't have access (non-super admin)
- Session update failed

**Solution**:
- Check site status in Sites management
- Verify user is assigned to site in site_users table
- Check browser console for errors

### Page Doesn't Reload After Switching

**Possible Causes**:
- JavaScript error preventing reload
- Network issue

**Solution**:
- Check browser console for errors
- Refresh page manually
- Clear browser cache

## Future Enhancements

Possible future improvements:

1. **Quick Switch**: Keyboard shortcut for site switching
2. **Recent Sites**: Show recently accessed sites at top
3. **Site Search**: Search/filter sites in dropdown for large installations
4. **Site Favorites**: Pin favorite sites
5. **Site Preview**: Quick preview of site before switching
6. **No Reload Switch**: Update context without full page reload (advanced)

## Related Documentation

- `MULTI_SITE.md` - Complete multi-site architecture guide
- `SUPER_ADMIN.md` - Super admin role documentation
- `MULTI_SITE_PROGRESS.md` - Implementation progress tracker

