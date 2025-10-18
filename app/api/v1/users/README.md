# Users API

Complete operations for managing users, roles, and site assignments.

## Table of Contents
- [Endpoints](#endpoints)
- [User Object](#user-object)
- [List Users](#list-users)
- [Get Single User](#get-single-user)
- [Create User](#create-user)
- [Update User](#update-user)
- [Delete User](#delete-user)
- [Permissions](#permissions)
- [Error Responses](#error-responses)

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users` | List all users |
| POST | `/api/v1/users` | Create a new user |
| GET | `/api/v1/users/:id` | Get single user |
| PUT | `/api/v1/users/:id` | Update user (full) |
| PATCH | `/api/v1/users/:id` | Update user (partial) |
| DELETE | `/api/v1/users/:id` | Delete user |

**Note:** Current user information is available at `GET /api/v1/auth/me`.

## User Object

```json
{
  "id": 1,
  "username": "john.doe",
  "first_name": "John",
  "last_name": "Doe",
  "display_name": "John Doe",
  "email": "john.doe@example.com",
  "role_id": 2,
  "role_name": "editor",
  "role_display_name": "Editor",
  "permissions": {
    "manage_posts": true,
    "manage_media": true,
    "manage_users": false
  },
  "sites": [
    {
      "id": 1,
      "name": "main-site",
      "display_name": "Main Site",
      "role_id": 2,
      "site_role_name": "editor"
    }
  ],
  "created_at": "2025-10-17T12:00:00.000Z",
  "updated_at": "2025-10-17T12:00:00.000Z"
}
```

**Note:** Password field is never returned in API responses.

## List Users

**GET** `/api/v1/users`

List all users with filtering and pagination.

**Permission Required:** `manage_users`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (number, optional) - Page number (default: 1)
- `per_page` (number, optional) - Items per page (default: 10, max: 100)
- `search` (string, optional) - Search in username, email, first_name, last_name
- `role_id` (number, optional) - Filter by role ID
- `site_id` (number, optional) - Filter by site assignment

**Example Requests:**

```bash
# List all users
curl -X GET "http://localhost:3000/api/v1/users" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Search for users
curl -X GET "http://localhost:3000/api/v1/users?search=john" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Filter by role
curl -X GET "http://localhost:3000/api/v1/users?role_id=2" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Filter by site
curl -X GET "http://localhost:3000/api/v1/users?site_id=1" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "username": "john.doe",
      "first_name": "John",
      "last_name": "Doe",
      "display_name": "John Doe",
      "email": "john.doe@example.com",
      "role_id": 2,
      "role_name": "editor",
      "role_display_name": "Editor",
      "sites": [
        {
          "id": 1,
          "name": "main-site",
          "display_name": "Main Site",
          "role_id": 2,
          "site_role_name": "editor"
        }
      ],
      "created_at": "2025-10-17T12:00:00.000Z",
      "updated_at": "2025-10-17T12:00:00.000Z"
    }
  ],
  "meta": {
    "timestamp": "2025-10-17T15:30:00.000Z",
    "version": "v1",
    "pagination": {
      "total": 25,
      "count": 10,
      "per_page": 10,
      "current_page": 1,
      "total_pages": 3
    }
  },
  "links": {
    "self": "/api/v1/users?page=1&per_page=10",
    "next": "/api/v1/users?page=2&per_page=10",
    "last": "/api/v1/users?page=3&per_page=10"
  }
}
```

## Get Single User

**GET** `/api/v1/users/:id`

Get a specific user with detailed information.

**Permission Required:** `manage_users` OR user viewing their own profile

**Headers:**
```
Authorization: Bearer <access_token>
```

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/users/1" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "john.doe",
    "first_name": "John",
    "last_name": "Doe",
    "display_name": "John Doe",
    "email": "john.doe@example.com",
    "role_id": 2,
    "role_name": "editor",
    "role_display_name": "Editor",
    "permissions": {
      "manage_posts": true,
      "manage_pages": true,
      "manage_media": true,
      "manage_taxonomies": true,
      "manage_menus": true,
      "manage_users": false,
      "manage_settings": false
    },
    "sites": [
      {
        "id": 1,
        "name": "main-site",
        "display_name": "Main Site",
        "role_id": 2,
        "site_role_name": "editor",
        "site_role_display_name": "Editor"
      },
      {
        "id": 2,
        "name": "blog-site",
        "display_name": "Blog Site",
        "role_id": 3,
        "site_role_name": "author",
        "site_role_display_name": "Author"
      }
    ],
    "created_at": "2025-10-17T12:00:00.000Z",
    "updated_at": "2025-10-17T12:00:00.000Z"
  },
  "meta": {
    "timestamp": "2025-10-17T15:30:00.000Z",
    "version": "v1"
  }
}
```

## Create User

**POST** `/api/v1/users`

Create a new user account.

**Permission Required:** `manage_users`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "jane.smith",
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane.smith@example.com",
  "password": "SecurePassword123!",
  "role_id": 3,
  "sites": [
    {
      "site_id": 1,
      "role_id": 3
    }
  ]
}
```

**Required Fields:**
- `username` (string) - Unique username
- `first_name` (string) - User's first name
- `email` (string) - Unique email address
- `password` (string) - User's password (will be hashed)

**Optional Fields:**
- `last_name` (string) - User's last name
- `role_id` (number) - Global role ID (default: 3)
- `sites` (array) - Site assignments with roles

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/v1/users" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jane.smith",
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane.smith@example.com",
    "password": "SecurePassword123!",
    "role_id": 3,
    "sites": [
      {
        "site_id": 1,
        "role_id": 3
      }
    ]
  }'
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "username": "jane.smith",
    "first_name": "Jane",
    "last_name": "Smith",
    "display_name": "Jane Smith",
    "email": "jane.smith@example.com",
    "role_id": 3,
    "role_name": "author",
    "role_display_name": "Author",
    "sites": [
      {
        "id": 1,
        "name": "main-site",
        "display_name": "Main Site",
        "role_id": 3,
        "site_role_name": "author"
      }
    ],
    "created_at": "2025-10-17T15:30:00.000Z",
    "updated_at": "2025-10-17T15:30:00.000Z"
  },
  "meta": {
    "timestamp": "2025-10-17T15:30:00.000Z",
    "version": "v1"
  }
}
```

## Update User

**PUT** `/api/v1/users/:id` (Full update - all fields required)  
**PATCH** `/api/v1/users/:id` (Partial update - only changed fields)

Update user information.

**Permission Required:** `manage_users` OR user updating their own profile (limited fields)

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body (PUT):**
```json
{
  "username": "jane.smith.updated",
  "first_name": "Jane",
  "last_name": "Smith-Jones",
  "email": "jane.jones@example.com",
  "password": "NewSecurePassword123!",
  "role_id": 2,
  "sites": [
    {
      "site_id": 1,
      "role_id": 2
    }
  ]
}
```

**Request Body (PATCH):**
```json
{
  "last_name": "Smith-Jones",
  "email": "jane.jones@example.com"
}
```

**Updatable Fields:**
- `username` (string) - Must be unique
- `first_name` (string)
- `last_name` (string)
- `email` (string) - Must be unique
- `password` (string) - Will be hashed
- `role_id` (number) - Admin only
- `sites` (array) - Admin only

**Self-Update Restrictions:**
Users updating their own profile can only change:
- `first_name`
- `last_name`
- `email`
- `password`

Users **cannot** change their own `role_id` or `sites`.

**Example Request:**
```bash
curl -X PATCH "http://localhost:3000/api/v1/users/5" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "last_name": "Smith-Jones",
    "email": "jane.jones@example.com"
  }'
```

## Delete User

**DELETE** `/api/v1/users/:id`

Delete a user account and all associated data.

**Permission Required:** `manage_users`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Restrictions:**
- Cannot delete your own account
- Cascades to remove site_users assignments
- Cascades to remove user_meta

**Example Request:**
```bash
curl -X DELETE "http://localhost:3000/api/v1/users/5" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "message": "User deleted successfully",
    "id": 5
  },
  "meta": {
    "timestamp": "2025-10-17T15:30:00.000Z",
    "version": "v1"
  }
}
```

## Permissions

The Users API uses role-based permissions:

### Required Permissions

| Action | Permission | Self-Access |
|--------|-----------|-------------|
| List users | `manage_users` | ✗ |
| Get user | `manage_users` | ✓ |
| Create user | `manage_users` | ✗ |
| Update user | `manage_users` | ✓ (limited) |
| Delete user | `manage_users` | ✗ |

### Self-Access Rules

**Users can view and edit their own profile** with restrictions:
- ✓ Can view their own user data
- ✓ Can update: first_name, last_name, email, password
- ✗ Cannot update: username, role_id, sites
- ✗ Cannot delete their own account

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Username is required"
  }
}
```

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "You cannot delete your own account"
  }
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to create users"
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "User with ID 999 not found"
  }
}
```

### 409 Conflict
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Username 'john.doe' already exists"
  }
}
```

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Email 'john@example.com' already exists"
  }
}
```

## Features

### Multi-Site Support
Users can be assigned to multiple sites with different roles:

```json
{
  "sites": [
    {
      "site_id": 1,
      "role_id": 2
    },
    {
      "site_id": 2,
      "role_id": 3
    }
  ]
}
```

### Password Security
- Passwords are automatically hashed using bcrypt
- Passwords are never returned in API responses
- Password requirements should be enforced client-side

### Role-Based Access
Users inherit permissions from their assigned role:
- Global role applies across all sites
- Site-specific roles override global role for that site

### Search and Filtering
Powerful search across multiple fields:
- Username
- Email
- First name
- Last name

Filter by:
- Role ID
- Site assignment

## Use Cases

### 1. User Management Dashboard
```bash
# List all users with pagination
curl -X GET "http://localhost:3000/api/v1/users?per_page=25"
```

### 2. Create New Team Member
```bash
curl -X POST "http://localhost:3000/api/v1/users" \
  -d '{
    "username": "new.editor",
    "first_name": "New",
    "last_name": "Editor",
    "email": "editor@example.com",
    "password": "TempPassword123!",
    "role_id": 2,
    "sites": [{"site_id": 1, "role_id": 2}]
  }'
```

### 3. Update User Profile
```bash
# User updates their own profile
curl -X PATCH "http://localhost:3000/api/v1/users/5" \
  -d '{"email": "newemail@example.com"}'

# Admin updates user role
curl -X PATCH "http://localhost:3000/api/v1/users/5" \
  -d '{"role_id": 2}'
```

### 4. Search Users
```bash
curl -X GET "http://localhost:3000/api/v1/users?search=john&role_id=2"
```

### 5. Site-Specific Users
```bash
# Get all users for a specific site
curl -X GET "http://localhost:3000/api/v1/users?site_id=1"
```

### 6. Remove User
```bash
curl -X DELETE "http://localhost:3000/api/v1/users/5"
```

## Security Notes

- All endpoints require authentication
- Role-based permissions control access
- Users cannot escalate their own privileges
- Users cannot delete their own account
- Passwords are securely hashed
- Usernames and emails must be unique
- Activity logging tracks all user changes

## Related Endpoints

- **Current User**: `GET /api/v1/auth/me` - Get authenticated user info
- **Roles**: Future endpoint for role management
- **Sites**: Future endpoint for site management

---

**Note:** This API manages user accounts and access. For authentication (login/logout), see the [Auth API](../auth/README.md).

