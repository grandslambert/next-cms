# Super Admin Role

The super admin role is a built-in role that has unrestricted access to all features and bypasses all permission checks in the CMS.

## Overview

Super admins have complete control over the system and are not subject to any permission restrictions. When a user is assigned the super admin role, they automatically have access to all features regardless of what permissions are explicitly defined.

## Key Features

- **Bypass All Permission Checks**: Super admins automatically pass all permission checks without needing explicit permissions
- **System Role**: The super admin role is marked as `is_system: true` and cannot be deleted
- **Universal Access**: No feature or content is restricted from super admins

## Database Details

The super admin role is stored in the `roles` table with:
- **ID**: `0` (ensures it's always first in the list)
- **Name**: `super_admin`
- **Display Name**: `Super Administrator`
- **Permissions**: `{"is_super_admin": true}` (special flag)

## Implementation

### Backend (API Routes)

The super admin check is implemented at the authentication level in `lib/auth.ts`. When a super admin logs in:

1. Their role is detected as `super_admin`
2. A special permissions proxy is created that returns `true` for any permission check
3. The `isSuperAdmin` flag is set to `true` in the session

This means any existing permission check like:
```typescript
if (!(session.user as any).permissions?.manage_users) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

Will automatically pass for super admins because `permissions.manage_users` will always return `true`.

### Frontend (React Hooks)

The `usePermission` hook has been updated to check for super admin status:

```typescript
const { hasPermission, isSuperAdmin } = usePermission('manage_users');
```

Super admins will always have `hasPermission: true` regardless of the permission being checked.

## Installation

### For New Installations

The super admin role is automatically created when running the schema setup:
```bash
mysql -u [user] -p [database] < database/schema.sql
```

### For Existing Installations

Run the migration script to add the super admin role:

**Option 1: Using Node.js Script**
```bash
node scripts/add-super-admin-role.js
```

**Option 2: Using SQL Directly**
```bash
mysql -u [user] -p [database] < database/add-super-admin-role.sql
```

## Assigning Users to Super Admin

To make a user a super admin, update their `role_id` to `0`:

```sql
-- Make a specific user a super admin
UPDATE users SET role_id = 0 WHERE id = [user_id];

-- Example: Make the default admin user a super admin
UPDATE users SET role_id = 0 WHERE username = 'admin';

-- Example: Make a user by email a super admin
UPDATE users SET role_id = 0 WHERE email = 'admin@example.com';
```

## Security Considerations

⚠️ **Important Security Notes:**

1. **Use Sparingly**: Only assign super admin to trusted users who need complete system access
2. **Audit Trail**: All super admin actions are still logged in the activity log
3. **Cannot Be Restricted**: There is no way to restrict super admin access through permissions
4. **System Role**: The super admin role cannot be deleted or modified through the UI

## Differences from Regular Admin

| Feature | Admin | Super Admin |
|---------|-------|-------------|
| Permission Checks | Subject to defined permissions | Bypasses all permission checks |
| Can be Modified | Yes | No (system role) |
| Can be Deleted | Yes | No (system role) |
| Explicit Permissions Required | Yes | No |
| Default Access | Based on permissions | All features |

## Technical Details

### How Permission Bypass Works

The permission bypass is implemented using a JavaScript Proxy in `lib/auth.ts`:

```typescript
if (isSuperAdmin) {
  permissions = new Proxy({ is_super_admin: true }, {
    get: (target, prop) => {
      // Always return true for any permission check
      return true;
    }
  });
}
```

This ensures that any property access on the permissions object (e.g., `permissions.manage_users`, `permissions.manage_settings`, etc.) will always return `true` for super admins.

### Session Data

Super admins have the following additional properties in their session:
- `session.user.role`: `'super_admin'`
- `session.user.isSuperAdmin`: `true`
- `session.user.permissions`: Proxy object that returns `true` for any permission

## Common Use Cases

1. **System Maintenance**: When performing system-wide changes or maintenance
2. **Emergency Access**: When regular admin permissions are insufficient
3. **Development**: For developers who need full system access during development
4. **Initial Setup**: For the primary system administrator during initial setup

## Troubleshooting

### Super Admin Not Working After Migration

1. Verify the role was created:
   ```sql
   SELECT * FROM roles WHERE name = 'super_admin';
   ```

2. Verify the user has the correct role_id:
   ```sql
   SELECT id, username, email, role_id FROM users WHERE role_id = 0;
   ```

3. Clear browser cache and log out/in again to refresh the session

### Permission Still Denied

1. Ensure you're logged in with the super admin account
2. Check the browser console for the session data to verify `isSuperAdmin: true`
3. Restart the Next.js development server to pick up auth changes

