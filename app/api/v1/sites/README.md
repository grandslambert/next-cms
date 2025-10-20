# Sites API

Complete API documentation for managing sites in the multi-site system.

## Base URL

```
/api/v1/sites
```

## Authentication

All endpoints require authentication via JWT token or API key.

**Required Permission:** `manage_sites` or `is_super_admin`

## Endpoints

### List Sites

```http
GET /api/v1/sites
```

Retrieve a paginated list of all sites.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `per_page` | integer | 10 | Items per page (max: 100) |
| `search` | string | - | Search in name, display_name, or domain |
| `is_active` | boolean | - | Filter by active status |

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/v1/sites?page=1&per_page=10&search=site" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Example Response

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "site_1",
      "display_name": "Site 1",
      "domain": null,
      "description": "Default site",
      "is_active": 1,
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "timestamp": "2025-10-18T00:00:00.000Z",
    "version": "v1",
    "total": 1,
    "count": 1,
    "per_page": 10,
    "current_page": 1,
    "total_pages": 1
  },
  "links": {
    "self": "/api/v1/sites?page=1&per_page=10",
    "first": "/api/v1/sites?page=1&per_page=10",
    "last": "/api/v1/sites?page=1&per_page=10"
  }
}
```

---

### Get Site

```http
GET /api/v1/sites/:id
```

Retrieve a single site by ID with statistics.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Site ID |

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/v1/sites/1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "site_1",
    "display_name": "Site 1",
    "domain": null,
    "description": "Default site",
    "is_active": 1,
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T00:00:00.000Z",
    "stats": {
      "users": 5
    }
  },
  "meta": {
    "timestamp": "2025-10-18T00:00:00.000Z",
    "version": "v1"
  }
}
```

---

### Create Site

```http
POST /api/v1/sites
```

Create a new site.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | URL-safe site identifier (lowercase letters, numbers, underscores only) |
| `display_name` | string | Yes | Human-readable site name |
| `domain` | string | No | Site domain |
| `description` | string | No | Site description |
| `is_active` | boolean | No | Whether the site is active (default: true) |

#### Example Request

```bash
curl -X POST "http://localhost:3000/api/v1/sites" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "site_2",
    "display_name": "Site 2",
    "domain": "site2.example.com",
    "description": "Second site",
    "is_active": true
  }'
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "site_2",
    "display_name": "Site 2",
    "domain": "site2.example.com",
    "description": "Second site",
    "is_active": 1,
    "created_at": "2025-10-18T00:00:00.000Z",
    "updated_at": "2025-10-18T00:00:00.000Z"
  },
  "meta": {
    "timestamp": "2025-10-18T00:00:00.000Z",
    "version": "v1",
    "message": "Site created successfully"
  }
}
```

---

### Update Site (Full)

```http
PUT /api/v1/sites/:id
```

Fully update a site (all fields required).

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Site ID |

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | URL-safe site identifier |
| `display_name` | string | Yes | Human-readable site name |
| `domain` | string | No | Site domain |
| `description` | string | No | Site description |
| `is_active` | boolean | Yes | Whether the site is active |

#### Example Request

```bash
curl -X PUT "http://localhost:3000/api/v1/sites/2" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "site_2",
    "display_name": "Updated Site 2",
    "domain": "site2.example.com",
    "description": "Updated description",
    "is_active": true
  }'
```

---

### Update Site (Partial)

```http
PATCH /api/v1/sites/:id
```

Partially update a site (only specified fields are updated).

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Site ID |

#### Request Body

All fields are optional:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | URL-safe site identifier |
| `display_name` | string | Human-readable site name |
| `domain` | string | Site domain |
| `description` | string | Site description |
| `is_active` | boolean | Whether the site is active |

#### Example Request

```bash
curl -X PATCH "http://localhost:3000/api/v1/sites/2" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "is_active": false
  }'
```

---

### Delete Site

```http
DELETE /api/v1/sites/:id
```

Delete a site and all its associated data.

⚠️ **Warning:** This will cascade delete all site-specific data (posts, media, settings, etc.)!

**Note:** Cannot delete site ID 1 (default site).

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Site ID |

#### Example Request

```bash
curl -X DELETE "http://localhost:3000/api/v1/sites/2" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Example Response

```json
{
  "success": true,
  "data": null,
  "meta": {
    "timestamp": "2025-10-18T00:00:00.000Z",
    "version": "v1",
    "message": "Site deleted successfully"
  }
}
```

---

## Validation Rules

### Site Name

- Must contain only lowercase letters, numbers, and underscores
- Must be unique across all sites
- Pattern: `/^[a-z0-9_]+$/`
- Example: `site_2`, `my_site_123`

### Domain

- Must be unique across all sites (if provided)
- Can be null

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Site name must contain only lowercase letters, numbers, and underscores",
    "field": "name"
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
    "message": "You do not have permission to manage sites"
  }
}
```

### 404 Not Found

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Site not found"
  }
}
```

### 409 Conflict

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "A site with this name already exists"
  }
}
```

## Activity Logging

All site operations are logged to the activity log:

- `site_created` - When a new site is created
- `site_updated` - When a site is updated
- `site_deleted` - When a site is deleted

## Multi-Site Considerations

- Site ID 1 is the default site and cannot be deleted
- Each site has its own set of tables (prefixed with `site_{id}_`)
- Deleting a site cascades to all related data in the database
- Users can be assigned to multiple sites with different roles per site

## Best Practices

1. **Site Naming**: Use descriptive, URL-safe names (e.g., `main_site`, `blog_site`)
2. **Domains**: Set up domain mapping for production sites
3. **Backups**: Always backup site data before deletion
4. **Testing**: Test site creation/deletion in a development environment first
5. **Permissions**: Restrict site management to super admins only in production

## Related APIs

- **Site Settings**: `/api/v1/settings/site` - Manage site-specific settings
- **Users**: `/api/v1/users` - Manage user assignments across sites
- **Posts**: `/api/v1/posts` - Content is scoped to individual sites

