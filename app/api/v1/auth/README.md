# Authentication API

The Authentication API provides JWT-based authentication for the REST API.

## Endpoints

### POST /api/v1/auth/login
Authenticate user and receive JWT tokens.

**Request:**
```json
{
  "username": "your-username",
  "password": "your-password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "user": {
      "id": 1,
      "username": "john",
      "email": "john@example.com",
      "role": "admin",
      "site_id": 1
    }
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "superadmin",
    "password": "SuperAdmin123!"
  }'
```

### POST /api/v1/auth/refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "refresh_token": "eyJhbGc..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "user": {
      "id": 1,
      "username": "john",
      "email": "john@example.com",
      "role": "admin",
      "site_id": 1
    }
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "YOUR_REFRESH_TOKEN"
  }'
```

### POST /api/v1/auth/logout
Logout and blacklist current token.

**Headers:**
- `Authorization: Bearer YOUR_ACCESS_TOKEN`

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### GET /api/v1/auth/me
Get current authenticated user information.

**Headers:**
- `Authorization: Bearer YOUR_ACCESS_TOKEN`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "john",
    "email": "john@example.com",
    "display_name": "John Doe",
    "is_super_admin": false,
    "current_site_id": 1,
    "current_role": "admin",
    "sites": [
      {
        "site_id": 1,
        "site_name": "Main Site",
        "role_name": "Administrator",
        "role_slug": "admin"
      }
    ],
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

**Example:**
```bash
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Token Types

### Access Token
- **Purpose**: Authenticate API requests
- **Lifetime**: 1 hour (configurable via `JWT_EXPIRES_IN`)
- **Usage**: Include in `Authorization: Bearer TOKEN` header

### Refresh Token
- **Purpose**: Obtain new access token without re-authentication
- **Lifetime**: 7 days (configurable via `JWT_REFRESH_EXPIRES_IN`)
- **Usage**: Send to `/auth/refresh` endpoint

## Authentication Flow

```
1. Login
   ↓
2. Receive access_token + refresh_token
   ↓
3. Use access_token for API requests
   ↓
4. When access_token expires (after 1 hour):
   a. Use refresh_token to get new tokens
   b. Continue with new access_token
   ↓
5. When refresh_token expires (after 7 days):
   - User must login again
```

## Environment Variables

Configure authentication in your `.env` or `.env.local`:

```env
# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Or use NEXTAUTH_SECRET
NEXTAUTH_SECRET=your-nextauth-secret
```

## Security Features

### Token Security
- Tokens are signed with HS256 algorithm
- Tokens include expiration time
- Tokens are blacklisted on logout
- Refresh tokens have longer expiration

### Password Security
- Passwords are hashed with bcrypt
- Failed login attempts are logged
- Account lockout after multiple failures (future)

### Activity Logging
- All login/logout events are logged
- IP address and user agent captured
- Searchable audit trail

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid username or password"
  }
}
```

### 401 Invalid Token
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Invalid or expired token"
  }
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Account is disabled"
  }
}
```

## Testing with curl

### Complete Example Flow

```bash
# 1. Login
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "superadmin", "password": "SuperAdmin123!"}')

# Extract access token
ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.data.access_token')
REFRESH_TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.data.refresh_token')

echo "Access Token: $ACCESS_TOKEN"

# 2. Get current user
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 3. Refresh token
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\": \"$REFRESH_TOKEN\"}"

# 4. Logout
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

## Alternative: API Key Authentication

Instead of JWT tokens, you can use API keys for server-to-server authentication:

```bash
curl http://localhost:3000/api/v1/posts \
  -H "X-API-Key: your-api-key-here"
```

API keys:
- Don't expire (unless explicitly set)
- Can be revoked individually
- Tied to specific user accounts
- Track usage statistics

## Next Steps

- API Key management endpoints (create, list, revoke)
- OAuth 2.0 support for third-party apps
- Two-factor authentication
- Account lockout after failed attempts
- Password reset via API

