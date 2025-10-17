# Next CMS REST API v1

Welcome to the Next CMS REST API v1 documentation.

## Base URL

```
https://your-site.com/api/v1
```

## Authentication

The API supports multiple authentication methods:

### 1. JWT Bearer Token (Recommended for client applications)

```bash
# Login to get token
curl -X POST https://your-site.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your-username",
    "password": "your-password"
  }'

# Use token in requests
curl https://your-site.com/api/v1/posts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. API Key (For server-to-server)

```bash
curl https://your-site.com/api/v1/posts \
  -H "X-API-Key: YOUR_API_KEY"
```

## Response Format

All API responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2025-10-17T12:00:00Z",
    "version": "v1"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": { ... }
  },
  "meta": {
    "timestamp": "2025-10-17T12:00:00Z",
    "version": "v1"
  }
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "timestamp": "2025-10-17T12:00:00Z",
    "version": "v1",
    "pagination": {
      "total": 100,
      "count": 10,
      "per_page": 10,
      "current_page": 1,
      "total_pages": 10
    }
  },
  "links": {
    "self": "/api/v1/posts?page=1",
    "next": "/api/v1/posts?page=2",
    "last": "/api/v1/posts?page=10"
  }
}
```

## Common Query Parameters

### Pagination

```
?page=1&per_page=20
```

### Sorting

```
?sort=title           # Ascending
?sort=-created_at     # Descending (use minus sign)
?sort=title,-date     # Multiple fields
```

### Filtering

```
?status=published
?author_id=5
?date_from=2025-01-01&date_to=2025-12-31
?search=keyword
```

### Field Selection

Request only specific fields to reduce payload size:

```
?fields=id,title,excerpt
?fields=id,title,author.name,featured_image.url
```

### Including Related Resources

```
?include=author,categories,featured_image
```

## Rate Limiting

API requests are rate limited based on your authentication:

- **Unauthenticated**: 100 requests/hour
- **Authenticated**: 1,000 requests/hour
- **API Key**: 10,000 requests/hour

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1634567890
```

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `BAD_REQUEST` | 400 | Invalid request format |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `INVALID_TOKEN` | 401 | Token is invalid or expired |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `RESOURCE_NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

## Available Endpoints

### Authentication
- `POST /auth/login` - Login and get JWT token
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/logout` - Logout and invalidate token

### Posts
- `GET /posts` - List posts
- `GET /posts/:id` - Get single post
- `POST /posts` - Create post
- `PUT /posts/:id` - Update post
- `DELETE /posts/:id` - Delete post

### Pages
- `GET /pages` - List pages
- `GET /pages/:id` - Get single page
- `POST /pages` - Create page
- `PUT /pages/:id` - Update page
- `DELETE /pages/:id` - Delete page

### Media
- `GET /media` - List media
- `GET /media/:id` - Get media details
- `POST /media` - Upload media
- `PUT /media/:id` - Update media metadata
- `DELETE /media/:id` - Delete media

### Taxonomies
- `GET /taxonomies` - List all taxonomies
- `GET /taxonomies/:slug` - Get taxonomy details
- `GET /taxonomies/:taxonomy/terms` - List terms
- `POST /taxonomies/:taxonomy/terms` - Create term
- `PUT /taxonomies/:taxonomy/terms/:id` - Update term
- `DELETE /taxonomies/:taxonomy/terms/:id` - Delete term

### Menus
- `GET /menus` - List all menus
- `GET /menus/:id` - Get menu with items
- `GET /menus/location/:slug` - Get menu by location

### Users
- `GET /users` - List users
- `GET /users/:id` - Get user
- `GET /users/me` - Get current user
- `POST /users` - Create user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

### Settings
- `GET /settings` - Get all settings
- `GET /settings/:key` - Get specific setting
- `PUT /settings` - Update settings

### Sites (Multi-site)
- `GET /sites` - List sites
- `GET /sites/:id` - Get site details
- `POST /sites` - Create site
- `PUT /sites/:id` - Update site
- `DELETE /sites/:id` - Delete site

## CORS

Cross-Origin Resource Sharing (CORS) is enabled for all API endpoints. Configure allowed origins in your environment variables:

```env
CORS_ORIGIN=https://your-frontend-app.com
```

## Versioning

The API is versioned using URL path versioning. The current version is `v1`.

Future versions will be available at `/api/v2`, `/api/v3`, etc.

## SDKs

Official SDKs are available for:

- JavaScript/TypeScript: `@nextcms/js-sdk`
- Python: `nextcms-python`
- PHP: `nextcms/php-sdk`

## Support

For API support and questions:
- Documentation: https://docs.nextcms.com
- Issues: https://github.com/your-repo/next-cms/issues
- Community: https://community.nextcms.com

## Changelog

### v1.0.0 (Current)
- Initial release
- Full REST API for all content types
- JWT and API Key authentication
- Pagination, filtering, and sorting
- Rate limiting
- CORS support

