# Super Admin Interface

## Overview

Super Administrators have a simplified, focused interface designed specifically for system-level administration rather than content management.

## What Super Admins See

### Sidebar Menu

Super admins see only these menu items:

1. **🌐 Sites**
   - Manage all sites in the multi-site installation
   - Create, edit, and delete sites
   - Assign users to sites with specific roles

2. **👥 Users**
   - **All Users** - Create, edit, and delete user accounts
   - **Roles** - Manage user roles and permissions

**Note:** The site switcher is hidden for super admins since they are not assigned to specific sites. Super admins manage sites from a system level, while site admins use the switcher to work with content across their assigned sites.

### Default Landing Page

When super admins access `/admin`, they are automatically redirected to `/admin/sites` to manage the multi-site system.

## What Super Admins Don't See

To keep the interface focused, super admins do **not** see:

- ❌ Dashboard - Not needed for system administration
- ❌ Site Switcher - Not assigned to sites; work at system level
- ❌ Content Types - Site-specific, managed by site admins
- ❌ Post Types / Pages - Site-specific content
- ❌ Media Library - Site-specific media
- ❌ Taxonomies / Terms - Site-specific organization
- ❌ Menus - Site-specific navigation
- ❌ Settings - Site-specific configuration
- ❌ Tools - Site-specific utilities

## Philosophy

### Super Admin = System Administrator

Super admins are responsible for:
- ✅ **Infrastructure** - Managing multiple sites
- ✅ **User Management** - Creating accounts and assigning roles
- ✅ **Access Control** - Determining who can access which sites

### Site Admin = Content Manager

Regular admins (assigned to specific sites) are responsible for:
- ✅ **Content Creation** - Posts, pages, media
- ✅ **Content Organization** - Taxonomies, menus
- ✅ **Site Configuration** - Settings, appearance

## Benefits

### For Super Admins

1. **Focused Interface** - Only see what matters for system administration
2. **Reduced Clutter** - No content management options or site switcher
3. **Clear Purpose** - Manage sites and users at the system level
4. **Faster Navigation** - Direct access to core functions
5. **No Site Context** - Work at system level, not within specific sites

### For the System

1. **Separation of Concerns** - System admin vs. content admin
2. **Clearer Roles** - Each role has distinct responsibilities
3. **Better Security** - Super admins focus on access control
4. **Scalability** - Easy to manage many sites and users

## User Switching

Super admins can use the **User Switching** feature to temporarily switch to another user's account to:
- Test site-specific permissions
- Debug user-reported issues
- Experience the interface as a content admin
- Verify role configurations

When switched to another user, super admins see that user's full interface (dashboard, content types, etc.) and can work with site-specific content.

## Workflow Example

### Creating a New Site

1. Super admin logs in → Redirected to `/admin/sites`
2. Clicks "Create Site" → Enters site details
3. System creates site with prefixed tables (`site_2_*`)
4. Super admin assigns users to the new site with roles

### Assigning Users

1. Navigate to Sites list
2. Click "👥 Users" button for a site
3. Add users and assign their roles (Admin, Editor, Author)
4. Users can now access and manage that specific site's content

### Managing User Accounts

1. Navigate to Users → All Users
2. Create new user accounts (username, email, password)
3. Users are added to the global users table
4. Assign them to specific sites via Sites → Users

## Technical Implementation

### Sidebar Filtering

```typescript
if (isSuperAdmin) {
  return [
    { name: 'Sites', href: '/admin/sites', icon: '🌐', position: 0 },
    { 
      name: 'Users', 
      icon: '👥', 
      position: 1,
      subItems: [
        { name: 'All Users', href: '/admin/users', icon: '👤' },
        { name: 'Roles', href: '/admin/users/roles', icon: '🎭' },
      ]
    },
  ];
}
```

### Dashboard Redirect

```typescript
useEffect(() => {
  if (isSuperAdmin) {
    router.push('/admin/sites');
  }
}, [isSuperAdmin, router]);
```

## Comparison

| Feature | Super Admin | Site Admin |
|---------|-------------|------------|
| Dashboard | ❌ Redirected | ✅ Full access |
| Site Switcher | ❌ Hidden | ✅ Switch between sites |
| Sites Management | ✅ Full control | ❌ Not visible |
| User Accounts | ✅ Create/edit all | ❌ None (unless has permission) |
| User Roles | ✅ Manage all roles | ❌ None (unless has permission) |
| Posts/Pages | ❌ Not visible | ✅ Manage site content |
| Media | ❌ Not visible | ✅ Upload/manage |
| Taxonomies | ❌ Not visible | ✅ Create/edit |
| Menus | ❌ Not visible | ✅ Build navigation |
| Settings | ❌ Not visible | ✅ Configure site |
| Tools | ❌ Not visible | ✅ Import/export |

## Future Enhancements

Potential additions to super admin interface:

1. **System Settings** - Global configuration (separate from site settings)
2. **Activity Dashboard** - Overview of all sites' activity
3. **Storage Management** - Disk usage across all sites
4. **Backup Management** - System-wide backups
5. **Update Manager** - CMS version updates
6. **Plugin Management** - System-wide plugins/extensions

## Related Documentation

- [Super Admin Role](./SUPER_ADMIN.md) - Role definition and assignment
- [Multi-Site Support](./MULTI_SITE.md) - Multi-site architecture
- [User Switching](./USER_SWITCHING.md) - Testing as other users
- [Site User Management](./SITE_USER_MANAGEMENT.md) - Assigning users to sites

