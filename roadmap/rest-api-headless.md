# REST API for Headless CMS

## Overview
Transform Next CMS into a fully-featured headless CMS by exposing a comprehensive REST API that allows external applications to consume and manage content.

## Goals
- Enable decoupled front-end applications
- Support mobile app development
- Provide complete CRUD operations for all content
- Maintain backward compatibility with existing features

## Key Features

### Content Endpoints
- **Posts**: Full CRUD operations for all post types
- **Media**: Upload, retrieve, update, and delete media
- **Taxonomies**: Manage categories, tags, and custom taxonomies
- **Menus**: Retrieve menu structures
- **Users**: User management and authentication
- **Settings**: Site configuration access

### Authentication & Authorization
- **JWT Tokens**: Secure token-based authentication
- **API Keys**: Long-lived keys for server-to-server
- **OAuth 2.0**: Third-party application access
- **Refresh Tokens**: Secure token renewal
- **Rate Limiting**: Prevent abuse per key/user

### Advanced Features
- **Filtering**: Complex query filtering by any field
- **Sorting**: Multi-field sorting
- **Pagination**: Cursor and offset-based pagination
- **Field Selection**: Request only needed fields (sparse fieldsets)
- **Embedding**: Include related resources in single request
- **Search**: Full-text search across content
- **Bulk Operations**: Process multiple items at once

## API Endpoints

### Posts & Content
```
GET    /api/v1/posts                    # List posts
GET    /api/v1/posts/:id                # Get single post
POST   /api/v1/posts                    # Create post
PUT    /api/v1/posts/:id                # Update post
PATCH  /api/v1/posts/:id                # Partial update
DELETE /api/v1/posts/:id                # Delete post

GET    /api/v1/posts/:id/revisions      # Get revisions
POST   /api/v1/posts/:id/revert         # Revert to revision
```

### Custom Post Types
```
GET    /api/v1/{post-type}              # List items
GET    /api/v1/{post-type}/:id          # Get single item
POST   /api/v1/{post-type}              # Create item
PUT    /api/v1/{post-type}/:id          # Update item
DELETE /api/v1/{post-type}/:id          # Delete item
```

### Media
```
GET    /api/v1/media                    # List media
GET    /api/v1/media/:id                # Get media details
POST   /api/v1/media                    # Upload media
PUT    /api/v1/media/:id                # Update media metadata
DELETE /api/v1/media/:id                # Delete media

POST   /api/v1/media/batch              # Bulk upload
POST   /api/v1/media/:id/regenerate     # Regenerate sizes
```

### Taxonomies
```
GET    /api/v1/taxonomies               # List taxonomies
GET    /api/v1/taxonomies/:slug         # Get taxonomy

GET    /api/v1/{taxonomy}/terms         # List terms
GET    /api/v1/{taxonomy}/terms/:id     # Get term
POST   /api/v1/{taxonomy}/terms         # Create term
PUT    /api/v1/{taxonomy}/terms/:id     # Update term
DELETE /api/v1/{taxonomy}/terms/:id     # Delete term
```

### Menus
```
GET    /api/v1/menus                    # List menus
GET    /api/v1/menus/:id                # Get menu with items
GET    /api/v1/menus/location/:slug     # Get menu by location
```

### Users
```
GET    /api/v1/users                    # List users
GET    /api/v1/users/:id                # Get user
POST   /api/v1/users                    # Create user
PUT    /api/v1/users/:id                # Update user
DELETE /api/v1/users/:id                # Delete user

GET    /api/v1/users/me                 # Current user
PUT    /api/v1/users/me                 # Update current user
```

### Authentication
```
POST   /api/v1/auth/login               # Login (get JWT)
POST   /api/v1/auth/refresh             # Refresh token
POST   /api/v1/auth/logout              # Invalidate token
POST   /api/v1/auth/register            # Register new user (if enabled)
POST   /api/v1/auth/forgot-password     # Password reset
POST   /api/v1/auth/reset-password      # Set new password
```

### Settings
```
GET    /api/v1/settings                 # Get all settings
GET    /api/v1/settings/:key            # Get specific setting
PUT    /api/v1/settings                 # Update settings
```

### Sites (Multi-site)
```
GET    /api/v1/sites                    # List sites
GET    /api/v1/sites/:id                # Get site details
POST   /api/v1/sites                    # Create site
PUT    /api/v1/sites/:id                # Update site
DELETE /api/v1/sites/:id                # Delete site
```

## Query Parameters

### Filtering
```
GET /api/v1/posts?status=published
GET /api/v1/posts?author_id=5
GET /api/v1/posts?category=news&tag=featured
GET /api/v1/posts?date_from=2025-01-01&date_to=2025-12-31
GET /api/v1/posts?search=keyword
```

### Sorting
```
GET /api/v1/posts?sort=title           # Ascending
GET /api/v1/posts?sort=-created_at     # Descending
GET /api/v1/posts?sort=title,-date     # Multiple fields
```

### Pagination
```
GET /api/v1/posts?page=2&per_page=20
GET /api/v1/posts?offset=40&limit=20
GET /api/v1/posts?cursor=eyJpZCI6MTIzfQ
```

### Field Selection
```
GET /api/v1/posts?fields=id,title,excerpt
GET /api/v1/posts?fields=id,title,author.name,featured_image.url
```

### Embedding/Include
```
GET /api/v1/posts?include=author,categories,featured_image
GET /api/v1/posts/:id?include=revisions,comments
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    "id": 123,
    "title": "My Post",
    "content": "...",
    "status": "published",
    "created_at": "2025-10-17T10:00:00Z",
    "updated_at": "2025-10-17T12:00:00Z"
  },
  "meta": {
    "timestamp": "2025-10-17T12:30:00Z",
    "version": "v1"
  }
}
```

### List Response
```json
{
  "success": true,
  "data": [
    { "id": 1, "title": "Post 1" },
    { "id": 2, "title": "Post 2" }
  ],
  "meta": {
    "pagination": {
      "total": 100,
      "count": 20,
      "per_page": 20,
      "current_page": 1,
      "total_pages": 5
    }
  },
  "links": {
    "self": "/api/v1/posts?page=1",
    "next": "/api/v1/posts?page=2",
    "last": "/api/v1/posts?page=5"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Post not found",
    "details": {
      "post_id": 123
    }
  },
  "meta": {
    "timestamp": "2025-10-17T12:30:00Z",
    "request_id": "abc-123-def"
  }
}
```

## Authentication Flow

### JWT Authentication
```bash
# 1. Login
POST /api/v1/auth/login
{
  "username": "user",
  "password": "pass"
}

# Response
{
  "success": true,
  "data": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "expires_in": 3600,
    "token_type": "Bearer"
  }
}

# 2. Use token in requests
GET /api/v1/posts
Authorization: Bearer eyJhbGc...

# 3. Refresh when expired
POST /api/v1/auth/refresh
{
  "refresh_token": "eyJhbGc..."
}
```

### API Key Authentication
```bash
GET /api/v1/posts
X-API-Key: your-api-key-here
```

## Rate Limiting

### Headers
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1634567890
```

### Tiers
- **Free**: 100 requests/hour
- **Basic**: 1,000 requests/hour
- **Pro**: 10,000 requests/hour
- **Enterprise**: Custom limits

## Implementation Phases

### Phase 1: Core API (3-4 weeks)
- API routing structure
- Authentication (JWT)
- Basic CRUD for posts
- Error handling

### Phase 2: Content Types (2-3 weeks)
- Custom post types
- Taxonomies
- Media endpoints
- Menus

### Phase 3: Advanced Features (2-3 weeks)
- Complex filtering
- Search functionality
- Field selection
- Embedding

### Phase 4: Security & Performance (2-3 weeks)
- Rate limiting
- API keys
- Caching
- Query optimization

### Phase 5: Documentation (1-2 weeks)
- Interactive API docs (Swagger/OpenAPI)
- Code examples
- SDKs (JavaScript, Python, PHP)
- Postman collection

## SDKs

### JavaScript/TypeScript
```typescript
import { NextCMSClient } from '@nextcms/js-sdk';

const client = new NextCMSClient({
  baseURL: 'https://your-site.com',
  apiKey: 'your-api-key'
});

// Get posts
const posts = await client.posts.list({
  status: 'published',
  per_page: 10
});

// Create post
const newPost = await client.posts.create({
  title: 'My New Post',
  content: 'Post content here',
  status: 'draft'
});
```

### Python
```python
from nextcms import Client

client = Client(
    base_url='https://your-site.com',
    api_key='your-api-key'
)

# Get posts
posts = client.posts.list(status='published', per_page=10)

# Create post
new_post = client.posts.create({
    'title': 'My New Post',
    'content': 'Post content here',
    'status': 'draft'
})
```

## User Stories

1. **Mobile Developer**: "I want to build a mobile app that displays our blog content"
2. **Front-end Developer**: "I want to use React/Vue/Svelte with Next CMS as the backend"
3. **Integration Specialist**: "I want to sync content between Next CMS and other systems"
4. **API Consumer**: "I want complete documentation and SDKs to speed development"

## Success Metrics
- API response time: <200ms (p95)
- API uptime: >99.9%
- Authentication success rate: >99%
- SDK downloads: 1000+ in first quarter

## Dependencies
- Advanced caching (for API performance)
- Activity logging (for API audit trail)
- Webhooks (for API events)

## Risks & Mitigation
- **Risk**: API abuse and DoS attacks
  - **Mitigation**: Rate limiting, API keys, monitoring
  
- **Risk**: Breaking changes affecting existing integrations
  - **Mitigation**: API versioning, deprecation warnings, changelog
  
- **Risk**: Performance impact on existing system
  - **Mitigation**: Separate API processes, caching, query optimization

## Related Features
- GraphQL API (alternative query interface)
- Webhooks (event notifications for API changes)
- Advanced caching (API response caching)

