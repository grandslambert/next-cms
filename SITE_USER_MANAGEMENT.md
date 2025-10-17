# Site User Management

## Overview

The Next CMS multi-site system uses a flexible user assignment model where:
- **Users are global** - A single user account exists in the `users` table
- **Site assignments are specific** - Users are assigned to sites via the `site_users` table
- **Roles are site-specific** - A user can have different roles on different sites

## User Visibility

### Super Administrators

Super admins see **all users** globally with site assignments:
- Navigate to **Users → All Users**
- View every user account in the system
- See which sites each user is assigned to (displayed as badges)
- See "Not assigned" for users without site assignments
- No filtering by site
- Can manually assign users to sites via **Sites → [Site] → Users**

### Site Administrators

Site admins see **only users assigned to their current site**:
- Navigate to **Users → All Users**
- View only users assigned to the current site (shown in site switcher)
- Filtered automatically based on `currentSiteId` in session
- Users are filtered via `site_users` table join

## Creating Users

### As Super Administrator

When a super admin creates a user:
1. User is created in the global `users` table
2. **No automatic site assignment** - user exists but isn't assigned to any site
3. Super admin must manually assign the user to site(s) via **Sites → [Site] → Users**
4. User can be assigned to multiple sites with different roles

### As Site Administrator

When a site admin creates a user:
1. User is created in the global `users` table
2. **Automatically assigned to current site** - added to `site_users` table
3. User is assigned the role selected in the create form
4. User immediately appears in the site admin's user list
5. User can log in and access the assigned site

## Database Structure

### Users Table (Global)

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NOT NULL,  -- Default role (not used in multi-site context)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Site Users Table (Site Assignments)

```sql
CREATE TABLE site_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  site_id INT NOT NULL,
  user_id INT NOT NULL,
  role_id INT NOT NULL,  -- Role for this specific site
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  UNIQUE KEY unique_site_user (site_id, user_id)
);
```

## User List Queries

### Super Admin Query

Returns all users with their site assignments:

```sql
-- Get all users
SELECT u.id, u.username, u.first_name, u.last_name, u.email, u.role_id, 
       r.name as role_name, r.display_name as role_display_name, u.created_at
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
ORDER BY u.created_at DESC

-- For each user, get site assignments
SELECT s.id, s.name, s.display_name, su.role_id, r.display_name as role_display_name
FROM site_users su
JOIN sites s ON su.site_id = s.id
LEFT JOIN roles r ON su.role_id = r.id
WHERE su.user_id = ?
ORDER BY s.name ASC
```

### Site Admin Query

Returns only users assigned to current site:

```sql
SELECT u.id, u.username, u.first_name, u.last_name, u.email, u.role_id, 
       r.name as role_name, r.display_name as role_display_name, u.created_at
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
INNER JOIN site_users su ON u.id = su.user_id
WHERE su.site_id = ?
ORDER BY u.created_at DESC
```

## User Creation Process

### Site Admin Creating User

1. **Navigate**: Users → All Users → + New User
2. **Fill Form**: Username, Name, Email, Password, Role
3. **Submit**: User is created
4. **Backend Process**:
   ```javascript
   // Create user in global users table
   INSERT INTO users (username, first_name, last_name, email, password_hash, role_id)
   VALUES (?, ?, ?, ?, ?, ?)
   
   // Automatically assign to current site
   INSERT INTO site_users (site_id, user_id, role_id)
   VALUES (currentSiteId, newUserId, role_id)
   ```
5. **Result**: User appears in site admin's user list immediately

### Super Admin Creating User

1. **Navigate**: Users → All Users → + New User
2. **Fill Form**: Username, Name, Email, Password, Role
3. **Submit**: User is created (NOT assigned to any site)
4. **Manual Assignment**:
   - Navigate to Sites → [Site Name]
   - Click "👥 Users" button
   - Click "+ Assign User"
   - Select user and role
   - User is now assigned to that site

## Use Cases

### Single-Site User

**Scenario**: A content editor who works on only Site 1

1. Super admin creates user
2. Super admin assigns user to Site 1 with "Editor" role
3. User logs in → automatically directed to Site 1
4. User sees Site 1 content in their interface
5. No site switcher (only one site assigned)

### Multi-Site User

**Scenario**: A content manager who works on Sites 1, 2, and 3

1. Super admin creates user
2. Super admin assigns user to:
   - Site 1 with "Editor" role
   - Site 2 with "Admin" role
   - Site 3 with "Author" role
3. User logs in → automatically directed to Site 1 (first assigned)
4. User sees site switcher in sidebar
5. User can switch between sites
6. Permissions change based on role for each site

### Site-Specific Admin

**Scenario**: An admin who manages only Site 2

1. Super admin creates user
2. Super admin assigns user to Site 2 with "Admin" role
3. User logs in → automatically directed to Site 2
4. User can create/manage posts on Site 2
5. User can create new users (automatically assigned to Site 2)
6. User sees only Site 2 users in user list
7. User cannot see or access other sites

## Permissions and Roles

### Role Application

The `role_id` in `site_users` determines what a user can do on that specific site:

- **Super Admin** (ID: 0) - System-wide, not site-specific
- **Admin** (ID: 1) - Full site management
- **Editor** (ID: 2) - Publish and manage all content
- **Author** (ID: 3) - Create and publish own content

### Permission Scope

Permissions are **site-scoped**:
- Editor on Site 1 can publish posts on Site 1
- Same user might be Author on Site 2 (can only manage own posts)
- Each site has its own content, media, menus, etc.

## API Implementation

### GET /api/users

**Super Admin**: Returns all users
**Site Admin**: Returns users assigned to `currentSiteId`

```typescript
if (isSuperAdmin) {
  // Query all users
} else {
  // Query users with INNER JOIN on site_users
  // WHERE site_id = currentSiteId
}
```

### POST /api/users

**Super Admin**: Creates user, no site assignment
**Site Admin**: Creates user, auto-assigns to `currentSiteId`

```typescript
// Create user
const [result] = await db.query('INSERT INTO users ...');
const newUserId = result.insertId;

// Auto-assign if site admin
if (!isSuperAdmin) {
  await db.query(
    'INSERT INTO site_users (site_id, user_id, role_id) VALUES (?, ?, ?)',
    [currentSiteId, newUserId, role_id]
  );
}
```

## Best Practices

### For Super Admins

1. **Plan site structure first** - Create sites before assigning users
2. **Assign thoughtfully** - Consider which sites each user needs access to
3. **Use appropriate roles** - Don't give Admin role unless necessary
4. **Document assignments** - Keep track of who has access to what
5. **Review regularly** - Audit user assignments periodically

### For Site Admins

1. **Create users as needed** - They'll be automatically assigned to your site
2. **Choose appropriate roles** - Author for content creators, Editor for publishers
3. **Don't create duplicate users** - Check if user already exists (super admin can assign them)
4. **Use descriptive names** - Help identify users by full name and email

## Security Considerations

### Isolation

- Site admins **cannot see** users from other sites
- Site admins **cannot modify** site assignments
- Site admins **cannot elevate** users to super admin
- Site admins are **limited to their site's context**

### Super Admin Power

Super admins can:
- ✅ View all users globally
- ✅ Create users without site assignment
- ✅ Assign users to any site with any role
- ✅ Remove users from sites
- ✅ Change user roles on any site
- ✅ Delete users globally

### Activity Logging

All user creation and assignment actions are logged:
- Who created the user
- Which site they were assigned to
- What role they were given
- IP address and timestamp

## Troubleshooting

### User Can't See Any Content

**Problem**: User logs in but sees empty dashboard

**Solution**: 
1. Check if user is assigned to any site: `SELECT * FROM site_users WHERE user_id = ?`
2. If not assigned, super admin needs to assign them via Sites interface

### Site Admin Can't See User

**Problem**: Site admin knows user exists but can't see them in list

**Cause**: User is not assigned to the site admin's current site

**Solution**:
1. Super admin assigns user to that site
2. User will then appear in site admin's user list

### User Has Wrong Permissions

**Problem**: User can't perform expected actions

**Solution**:
1. Check user's role for current site: `SELECT role_id FROM site_users WHERE user_id = ? AND site_id = ?`
2. Verify role permissions: `SELECT permissions FROM roles WHERE id = ?`
3. Update role assignment if needed

## Related Documentation

- [Multi-Site Architecture](./MULTI_SITE.md) - Overall multi-site system design
- [Sites Management](./SITES_MANAGEMENT.md) - Creating and managing sites
- [User Switching](./USER_SWITCHING.md) - Testing as other users
- [Super Admin Interface](./SUPER_ADMIN_INTERFACE.md) - Super admin capabilities
