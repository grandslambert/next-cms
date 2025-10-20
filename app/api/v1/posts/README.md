# Posts API

The Posts API provides full CRUD operations for posts with advanced filtering, pagination, sorting, and resource embedding.

## Endpoints

### GET /api/v1/posts
List posts with filtering, pagination, and sorting.

**Headers:**
- `Authorization: Bearer YOUR_ACCESS_TOKEN`

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `per_page` (number, default: 10, max: 100) - Items per page
- `sort` (string) - Sort field (prefix with `-` for descending)
  - Allowed: `id`, `title`, `created_at`, `updated_at`, `published_at`, `author_id`
- `status` (string) - Filter by status
  - Allowed: `draft`, `pending`, `published`, `scheduled`, `private`
- `post_type` (string, default: 'post') - Filter by post type
- `author_id` (number) - Filter by author
- `date_from` (ISO date) - Filter by date (from)
- `date_to` (ISO date) - Filter by date (to)
- `search` (string) - Search in title and content
- `include` (comma-separated) - Include related resources
  - Options: `content`, `author`, `categories`, `tags`, `featured_image`

**Examples:**
```bash
# List published posts
curl http://localhost:3000/api/v1/posts?status=published \
  -H "Authorization: Bearer YOUR_TOKEN"

# Search posts
curl "http://localhost:3000/api/v1/posts?search=tutorial" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get posts with categories and author
curl "http://localhost:3000/api/v1/posts?include=author,categories,tags" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Sort by date, descending
curl "http://localhost:3000/api/v1/posts?sort=-created_at&per_page=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "My First Post",
      "slug": "my-first-post",
      "excerpt": "This is the excerpt",
      "status": "published",
      "post_type": "post",
      "author_id": 1,
      "featured_image_id": 5,
      "published_at": "2025-10-17T12:00:00Z",
      "created_at": "2025-10-17T10:00:00Z",
      "updated_at": "2025-10-17T12:00:00Z",
      "author": {
        "id": 1,
        "username": "john",
        "display_name": "John Doe",
        "email": "john@example.com"
      },
      "categories": [
        {
          "id": 1,
          "name": "Technology",
          "slug": "technology"
        }
      ]
    }
  ],
  "meta": {
    "timestamp": "2025-10-17T12:30:00Z",
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

### GET /api/v1/posts/:id
Get a single post by ID.

**Headers:**
- `Authorization: Bearer YOUR_ACCESS_TOKEN`

**Query Parameters:**
- `include` (comma-separated) - Include related resources
  - Options: `author`, `categories`, `tags`, `featured_image`, `revisions`

**Example:**
```bash
curl http://localhost:3000/api/v1/posts/123?include=author,categories,tags,featured_image \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "title": "My Post",
    "slug": "my-post",
    "content": "<p>Full post content here...</p>",
    "excerpt": "Post excerpt",
    "status": "published",
    "post_type": "post",
    "author_id": 1,
    "featured_image_id": 5,
    "seo_title": "My Post - SEO Title",
    "seo_description": "SEO description here",
    "seo_keywords": "keyword1, keyword2",
    "custom_fields": {"custom_key": "custom_value"},
    "published_at": "2025-10-17T12:00:00Z",
    "created_at": "2025-10-17T10:00:00Z",
    "updated_at": "2025-10-17T12:00:00Z",
    "author": {
      "id": 1,
      "username": "john",
      "display_name": "John Doe",
      "email": "john@example.com"
    },
    "categories": [...],
    "tags": [...],
    "featured_image": {...}
  }
}
```

### POST /api/v1/posts
Create a new post.

**Headers:**
- `Authorization: Bearer YOUR_ACCESS_TOKEN`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "title": "New Post Title",
  "content": "<p>Post content here...</p>",
  "excerpt": "Short excerpt",
  "status": "draft",
  "post_type": "post",
  "featured_image_id": 5,
  "published_at": "2025-10-17T12:00:00Z",
  "seo_title": "SEO Title",
  "seo_description": "SEO Description",
  "seo_keywords": "keyword1, keyword2",
  "custom_fields": {"key": "value"},
  "category_ids": [1, 2],
  "tag_ids": [3, 4, 5]
}
```

**Required Fields:**
- `title` (string)
- `content` (string)

**Optional Fields:**
- `excerpt` (string, default: '')
- `status` (string, default: 'draft')
- `post_type` (string, default: 'post')
- `featured_image_id` (number)
- `published_at` (ISO datetime)
- `seo_title` (string)
- `seo_description` (string)
- `seo_keywords` (string)
- `custom_fields` (object)
- `category_ids` (array of numbers)
- `tag_ids` (array of numbers)

**Example:**
```bash
curl -X POST http://localhost:3000/api/v1/posts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My New Post",
    "content": "<p>This is the content</p>",
    "excerpt": "Short description",
    "status": "published",
    "category_ids": [1, 2],
    "tag_ids": [3]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 124,
    "title": "My New Post",
    "slug": "my-new-post",
    "content": "<p>This is the content</p>",
    ...
  }
}
```

### PUT /api/v1/posts/:id
Update a post (full update).

**Headers:**
- `Authorization: Bearer YOUR_ACCESS_TOKEN`
- `Content-Type: application/json`

**Request Body:** Same as POST (all fields optional for existing post)

**Example:**
```bash
curl -X PUT http://localhost:3000/api/v1/posts/123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "content": "<p>Updated content</p>",
    "status": "published"
  }'
```

### PATCH /api/v1/posts/:id
Partially update a post (only send fields you want to update).

**Headers:**
- `Authorization: Bearer YOUR_ACCESS_TOKEN`
- `Content-Type: application/json`

**Example:**
```bash
curl -X PATCH http://localhost:3000/api/v1/posts/123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "published",
    "published_at": "2025-10-17T12:00:00Z"
  }'
```

### DELETE /api/v1/posts/:id
Delete a post.

**Headers:**
- `Authorization: Bearer YOUR_ACCESS_TOKEN`

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/v1/posts/123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Post deleted successfully",
    "id": 123
  }
}
```

## Post Status Values

- `draft` - Post is in draft state
- `pending` - Post is pending review
- `published` - Post is published and visible
- `scheduled` - Post is scheduled for future publishing
- `private` - Post is private (not publicly visible)

## Filtering Examples

### By Status
```bash
# Get all published posts
curl "http://localhost:3000/api/v1/posts?status=published"

# Get draft posts
curl "http://localhost:3000/api/v1/posts?status=draft"
```

### By Author
```bash
# Get posts by specific author
curl "http://localhost:3000/api/v1/posts?author_id=5"
```

### By Date Range
```bash
# Get posts from last week
curl "http://localhost:3000/api/v1/posts?date_from=2025-10-10&date_to=2025-10-17"
```

### Search
```bash
# Search in title and content
curl "http://localhost:3000/api/v1/posts?search=tutorial"
```

### Combined Filters
```bash
# Published posts by author 5, sorted by date
curl "http://localhost:3000/api/v1/posts?status=published&author_id=5&sort=-created_at"
```

## Sorting

Prefix field name with `-` for descending order:

```bash
# Newest first
curl "http://localhost:3000/api/v1/posts?sort=-created_at"

# Oldest first
curl "http://localhost:3000/api/v1/posts?sort=created_at"

# Alphabetical by title
curl "http://localhost:3000/api/v1/posts?sort=title"
```

## Including Related Resources

Use the `include` parameter to embed related data:

```bash
# Include author details
curl "http://localhost:3000/api/v1/posts?include=author"

# Include multiple resources
curl "http://localhost:3000/api/v1/posts?include=author,categories,tags,featured_image"

# For single post, include revisions
curl "http://localhost:3000/api/v1/posts/123?include=revisions"
```

## Custom Fields

Posts support custom fields for extensibility:

```json
{
  "title": "Product Post",
  "content": "...",
  "custom_fields": {
    "price": "99.99",
    "sku": "PROD-123",
    "in_stock": true,
    "metadata": {
      "color": "blue",
      "size": "large"
    }
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "title is required",
    "field": "title"
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

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Post not found",
    "details": {"id": 123}
  }
}
```

### 409 Conflict
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Post with slug \"my-post\" already exists"
  }
}
```

## Notes

- Slug is automatically generated from title
- All timestamps are in ISO 8601 format
- Content can be HTML or plain text
- Posts are automatically associated with the authenticated user as author
- All operations are logged in the activity log
- Multi-site aware - posts are site-specific

