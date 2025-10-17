# User Switching Feature

## Overview

The User Switching feature allows super admins and admins to temporarily switch to another user's account for testing and debugging purposes. This is particularly useful for:

- Testing user-specific permissions
- Debugging user-reported issues
- Verifying role-based access control
- Quality assurance testing

## Security & Access

### Who Can Switch Users?

- ✅ **Super Administrators** - Can switch to any user
- ✅ **Administrators** - Can switch to any user EXCEPT Super Administrators  
- ❌ **Other Roles** - Cannot use user switching

### Button Visibility Rules

The "🔄 Switch" button in the user list only appears when:

1. **You have permission** - You're a Super Admin or Admin
2. **Not yourself** - Can't switch to your own current account
3. **Not your original account** - If already switched, the button won't show for your original account (you must switch back first)
4. **Role restriction** - Admins cannot see the switch button for Super Administrator accounts

### What Happens When Switching?

1. Your original user ID is preserved in the session
2. You gain the target user's:
   - Permissions
   - Role
   - Site assignments
   - Access levels
3. All actions are logged with your original user ID
4. You can switch back at any time

## How to Use

### Switching to Another User

1. **Navigate to Users** - Go to **Users → All Users** in the admin sidebar
2. **Find the User** - Browse or search for the user you want to switch to
3. **Click "🔄 Switch"** - In the Actions column, click the switch button next to the user
   - The button only appears for users you're allowed to switch to
   - You won't see it for yourself, your original account (if already switched), or super admins (if you're a regular admin)
4. **Confirm** - Click OK when prompted
5. The page will reload and you'll be switched to that user's session

### Visual Indicators

When switched to another user, you'll see:

- **Yellow warning badge** showing "⚠️ Testing Mode" in the sidebar user info section
- **Yellow avatar circle** instead of the normal blue
- **"🔙 Switch Back" button** in the sidebar below your user info

### Switching Back

1. **Locate the Switch Back button** - In the sidebar, below the user info section, you'll see a yellow button
2. **Click "🔙 Switch Back"** 
3. The page will reload with your original session restored
4. The warning badge disappears and you're back to normal

## Technical Implementation

### API Endpoints

#### `POST /api/auth/switch-user`

Switches the current session to another user.

**Request Body:**
```json
{
  "targetUserId": 123
}
```

**Response:**
```json
{
  "success": true,
  "switchData": {
    "id": "123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "editor",
    "permissions": {...},
    "isSuperAdmin": false,
    "currentSiteId": 1,
    "originalUserId": "1",
    "isSwitched": true
  }
}
```

#### `DELETE /api/auth/switch-user`

Switches back to the original user.

**Response:**
```json
{
  "success": true,
  "switchData": {
    "id": "1",
    "email": "admin@example.com",
    "name": "Admin User",
    "role": "super_admin",
    "permissions": {...},
    "isSuperAdmin": true,
    "currentSiteId": 1,
    "originalUserId": null,
    "isSwitched": false
  }
}
```

### Session Data

The following fields are added to the NextAuth session:

```typescript
interface Session {
  user: {
    // ... existing fields
    originalUserId?: string;  // ID of the original user (admin who switched)
    isSwitched?: boolean;     // true if currently viewing as another user
  };
}
```

### Activity Logging

All user switching actions are logged with:

- **Action**: `user_switched` or `user_switch_back`
- **Entity Type**: `user`
- **Entity ID**: Target user ID
- **User ID**: Original user ID (who performed the switch)
- **Details**: Username of target/original user

This ensures accountability and traceability.

## Security Considerations

### Protections

1. **Role Restrictions**
   - Only super admins and admins can switch users
   - Regular admins cannot switch to super admin accounts
   - Cannot switch to yourself

2. **Session Preservation**
   - Original user ID is always maintained
   - All logged actions use the original user ID
   - Switch state is preserved across page reloads

3. **Audit Trail**
   - Every switch action is logged
   - IP address and user agent are recorded
   - Full accountability for testing actions

4. **Visual Warnings**
   - Clear "Testing Mode" indicator
   - Yellow warning colors
   - Distinct avatar color
   - Always visible switch back button

### Best Practices

1. **Always switch back** when done testing
2. **Communicate** with users before testing their accounts
3. **Document** what you're testing and why
4. **Review activity logs** regularly
5. **Limit switching time** to minimize confusion

## UI Components

### UserSwitcher Component

Located at: `components/admin/UserSwitcher.tsx`

**Props:** None (uses session context)

**Features:**
- Shows "Switch User" button for admins
- Shows "Switch Back" button when switched
- Modal with searchable user list
- Real-time user filtering
- Loading states
- Error handling

### Sidebar Integration

The UserSwitcher is integrated into the Sidebar component:

```tsx
<div className="mb-3">
  <UserSwitcher />
</div>
```

Position: Above the Help link, below the user info card

## Use Cases

### 1. Permission Testing

Switch to a user with specific permissions to verify:
- What they can and cannot see
- Which actions they can perform
- How content appears to them

### 2. Bug Reproduction

When a user reports a bug:
1. Switch to their account
2. Reproduce the issue in their context
3. Debug with their exact permissions and settings
4. Switch back and fix the issue

### 3. Quality Assurance

Before deploying changes:
1. Switch to different role types
2. Verify all functionality works correctly
3. Test edge cases with limited permissions
4. Ensure UI/UX is consistent

### 4. Training & Support

Help users by:
1. Switching to their account
2. Seeing exactly what they see
3. Guiding them through processes
4. Identifying UI/UX improvements

## Limitations

1. **Cannot switch to other super admins** (unless you are also a super admin)
2. **Requires page reload** after switching (to refresh all data)
3. **Session expires** at the normal timeout (not extended by switching)
4. **One level only** - Cannot chain switches (switch from A to B to C)

## Future Enhancements

Potential improvements:
- Add "Recent Switches" for quick access
- Allow super admins to switch to other super admins
- Add a "Switch As" option directly from user list
- Support for switching without page reload (real-time session update)
- Time limit for switched sessions
- Automatic switch-back after inactivity

## Troubleshooting

### "Unauthorized - Admin only"
- You don't have permission to switch users
- Only super admins and admins can use this feature

### "Cannot switch to super admin"
- Regular admins cannot switch to super admin accounts
- Only super admins can switch to other super admins

### "Not in switched mode"
- You tried to switch back but weren't in switched mode
- This shouldn't happen in normal use

### Switch doesn't persist
- Check browser cookies are enabled
- Verify session timeout settings
- Check for network errors in console

## Related Features

- [Super Admin Role](./SUPER_ADMIN.md)
- [Multi-Site Support](./MULTI_SITE.md)
- [Activity Logging](./ACTIVITY_LOG.md)
- [User Management](./USER_MANAGEMENT.md)

