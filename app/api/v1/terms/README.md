# Terms API

Complete CRUD operations for taxonomy terms (categories, tags, and custom taxonomy terms).

## Table of Contents
- [Endpoints](#endpoints)
- [Term Object](#term-object)
- [List Terms](#list-terms)
- [Get Single Term](#get-single-term)
- [Create Term](#create-term)
- [Update Term](#update-term)
- [Delete Term](#delete-term)
- [Error Responses](#error-responses)

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/terms` | List all terms |
| GET | `/api/v1/terms/:id` | Get single term |
| POST | `/api/v1/terms` | Create term |
| PUT | `/api/v1/terms/:id` | Update term (full) |
| PATCH | `/api/v1/terms/:id` | Update term (partial) |
| DELETE | `/api/v1/terms/:id` | Delete term |

## Term Object

```json
{
  "id": 1,
  "taxonomy_id": 1,
  "taxonomy_name": "category",
  "taxonomy_label": "Categories",
  "name": "News",
  "slug": "news",
  "description": "Latest news and updates",
  "parent_id": null,
  "image_id": null,
  "count": 15,
  "created_at": "2025-10-17T12:00:00.000Z",
  "updated_at": "2025-10-17T12:00:00.000Z"
}
```

## List Terms

**GET** `/api/v1/terms`

List all terms with flexible filtering options.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (number, optional) - Page number (default: 1)
- `per_page` (number, optional) - Items per page (default: 10, max: 100)
- `taxonomy_id` (number, optional) - Filter by taxonomy ID
- `taxonomy` (string, optional) - Filter by taxonomy name (e.g., "category", "tag")
- `parent_id` (number, optional) - Filter by parent ID (use "0" or "null" for top-level terms)
- `search` (string, optional) - Search in term name and description
- `include` (string, optional) - Comma-separated list of relations to include:
  - `parent` - Include parent term details
  - `children` - Include child terms
  - `image` - Include featured image
  - `meta` - Include term meta fields

**Example Requests:**

```bash
# List all terms
curl -X GET "http://localhost:3000/api/v1/terms" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# List categories only
curl -X GET "http://localhost:3000/api/v1/terms?taxonomy=category" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# List top-level categories with children
curl -X GET "http://localhost:3000/api/v1/terms?taxonomy=category&parent_id=0&include=children" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Search terms
curl -X GET "http://localhost:3000/api/v1/terms?search=news&include=parent,image" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "taxonomy_id": 1,
      "taxonomy_name": "category",
      "taxonomy_label": "Categories",
      "name": "News",
      "slug": "news",
      "description": "Latest news and updates",
      "parent_id": null,
      "image_id": null,
      "count": 15,
      "created_at": "2025-10-17T12:00:00.000Z",
      "updated_at": "2025-10-17T12:00:00.000Z",
      "children": [
        {
          "id": 5,
          "name": "Tech News",
          "slug": "tech-news",
          "count": 8
        }
      ]
    }
  ],
  "meta": {
    "timestamp": "2025-10-17T15:30:00.000Z",
    "version": "v1",
    "pagination": {
      "total": 10,
      "count": 10,
      "per_page": 10,
      "current_page": 1,
      "total_pages": 1
    }
  },
  "links": {
    "self": "/api/v1/terms?page=1&per_page=10"
  }
}
```

## Get Single Term

**GET** `/api/v1/terms/:id`

Get a specific term with optional related data.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `include` (string, optional) - Comma-separated list of relations:
  - `parent` - Include parent term
  - `children` - Include child terms
  - `image` - Include featured image
  - `meta` - Include term meta fields
  - `posts` - Include recent posts (10 most recent)

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/terms/1?include=parent,children,image,meta,posts" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "taxonomy_id": 1,
    "taxonomy_name": "category",
    "taxonomy_label": "Categories",
    "name": "News",
    "slug": "news",
    "description": "Latest news and updates",
    "parent_id": null,
    "image_id": 5,
    "count": 15,
    "hierarchical": true,
    "created_at": "2025-10-17T12:00:00.000Z",
    "updated_at": "2025-10-17T12:00:00.000Z",
    "parent": null,
    "children": [
      {
        "id": 5,
        "name": "Tech News",
        "slug": "tech-news",
        "count": 8
      }
    ],
    "image": {
      "id": 5,
      "filename": "news-category.jpg",
      "url": "/uploads/site_1/2025/10/news-category.jpg",
      "alt_text": "News Category Image",
      "title": "News"
    },
    "meta": {
      "color": "#ff0000",
      "icon": "📰"
    },
    "recent_posts": [
      {
        "id": 10,
        "title": "Latest Update",
        "slug": "latest-update",
        "status": "published",
        "published_at": "2025-10-17T10:00:00.000Z"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-10-17T15:30:00.000Z",
    "version": "v1"
  }
}
```

## Create Term

**POST** `/api/v1/terms`

Create a new term.

**Permission Required:** `manage_taxonomies`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "taxonomy_id": 1,
  "name": "Technology",
  "slug": "technology",
  "description": "Technology related posts",
  "parent_id": null,
  "image_id": null,
  "meta": {
    "color": "#0066cc",
    "icon": "💻"
  }
}
```

**Required Fields:**
- `taxonomy_id` (number) - ID of the taxonomy this term belongs to
- `name` (string) - Term name

**Optional Fields:**
- `slug` (string) - URL-friendly identifier (auto-generated from name if not provided)
- `description` (string) - Term description
- `parent_id` (number|null) - Parent term ID for hierarchical taxonomies
- `image_id` (number|null) - Featured image ID
- `meta` (object) - Custom meta fields (key-value pairs)

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/v1/terms" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "taxonomy_id": 1,
    "name": "Technology",
    "description": "Technology related posts",
    "meta": {
      "color": "#0066cc"
    }
  }'
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": 10,
    "taxonomy_id": 1,
    "taxonomy_name": "category",
    "taxonomy_label": "Categories",
    "name": "Technology",
    "slug": "technology",
    "description": "Technology related posts",
    "parent_id": null,
    "image_id": null,
    "count": 0,
    "created_at": "2025-10-17T15:30:00.000Z",
    "updated_at": "2025-10-17T15:30:00.000Z"
  },
  "meta": {
    "timestamp": "2025-10-17T15:30:00.000Z",
    "version": "v1"
  }
}
```

## Update Term

**PUT** `/api/v1/terms/:id` - Full update
**PATCH** `/api/v1/terms/:id` - Partial update

Update an existing term.

**Permission Required:** `manage_taxonomies`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body (PATCH example):**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "image_id": 15,
  "meta": {
    "color": "#ff0000"
  }
}
```

**Updatable Fields:**
- `name` (string) - Term name
- `slug` (string) - URL-friendly identifier (must be unique within taxonomy)
- `description` (string) - Term description
- `parent_id` (number|null) - Parent term ID (cannot be self)
- `image_id` (number|null) - Featured image ID
- `meta` (object) - Custom meta fields

**Example Request:**
```bash
curl -X PATCH "http://localhost:3000/api/v1/terms/10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated technology description",
    "image_id": 20
  }'
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": 10,
    "taxonomy_id": 1,
    "taxonomy_name": "category",
    "taxonomy_label": "Categories",
    "name": "Technology",
    "slug": "technology",
    "description": "Updated technology description",
    "parent_id": null,
    "image_id": 20,
    "count": 0,
    "created_at": "2025-10-17T15:30:00.000Z",
    "updated_at": "2025-10-17T15:35:00.000Z"
  },
  "meta": {
    "timestamp": "2025-10-17T15:35:00.000Z",
    "version": "v1"
  }
}
```

## Delete Term

**DELETE** `/api/v1/terms/:id`

Delete a term. Terms with children cannot be deleted.

**Permission Required:** `manage_taxonomies`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Example Request:**
```bash
curl -X DELETE "http://localhost:3000/api/v1/terms/10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "message": "Term deleted successfully",
    "id": 10
  },
  "meta": {
    "timestamp": "2025-10-17T15:30:00.000Z",
    "version": "v1"
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "A term cannot be its own parent"
  }
}
```

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Cannot delete term with children. Delete or reassign children first."
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
    "message": "You do not have permission to create terms"
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Term with ID 999 not found"
  }
}
```

### 409 Conflict
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Term with slug \"technology\" already exists in this taxonomy"
  }
}
```

### 422 Validation Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Field 'name' is required",
    "field": "name"
  }
}
```

## Features

### Hierarchical Support
Terms can have parent-child relationships for hierarchical taxonomies (like categories):

```bash
# Get top-level terms
curl -X GET "http://localhost:3000/api/v1/terms?taxonomy=category&parent_id=0" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Get children of a specific term
curl -X GET "http://localhost:3000/api/v1/terms?parent_id=1&include=children" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Meta Fields
Store custom data with terms:

```bash
curl -X POST "http://localhost:3000/api/v1/terms" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "taxonomy_id": 1,
    "name": "Featured",
    "meta": {
      "color": "#ff0000",
      "icon": "⭐",
      "is_featured": true,
      "priority": 10
    }
  }'
```

### Slug Generation
Slugs are automatically generated from the term name:
- Input: `"Technology & Science"` → Slug: `"technology-science"`
- Input: `"News!!!"` → Slug: `"news"`

### Search
Search across term names and descriptions:

```bash
curl -X GET "http://localhost:3000/api/v1/terms?search=tech" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Notes

- All requests require authentication
- Creating, updating, and deleting terms requires `manage_taxonomies` permission
- Term slugs must be unique within their taxonomy
- Terms cannot be their own parent
- Terms with children cannot be deleted directly
- Deleting a term will remove all its post associations
- Terms are site-specific (multi-site support)
- The `count` field shows the number of posts associated with the term
- Meta fields are stored in `site_X_term_meta` table
- All operations are logged in the activity log

## Use Cases

### 1. Get all categories for a post form
```bash
curl -X GET "http://localhost:3000/api/v1/terms?taxonomy=category&per_page=100" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 2. Create a category hierarchy
```bash
# Create parent
curl -X POST "http://localhost:3000/api/v1/terms" \
  -d '{"taxonomy_id": 1, "name": "Programming"}' \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Create child
curl -X POST "http://localhost:3000/api/v1/terms" \
  -d '{"taxonomy_id": 1, "name": "JavaScript", "parent_id": 10}' \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Get term with all related data
```bash
curl -X GET "http://localhost:3000/api/v1/terms/1?include=parent,children,image,meta,posts" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. Update term meta only
```bash
curl -X PATCH "http://localhost:3000/api/v1/terms/1" \
  -d '{"meta": {"featured": true}}' \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

