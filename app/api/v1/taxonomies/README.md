# Taxonomies API

Complete CRUD operations for taxonomies (categories, tags, and custom taxonomies).

## Table of Contents
- [Endpoints](#endpoints)
- [Taxonomy Object](#taxonomy-object)
- [List Taxonomies](#list-taxonomies)
- [Get Single Taxonomy](#get-single-taxonomy)
- [Create Taxonomy](#create-taxonomy)
- [Update Taxonomy](#update-taxonomy)
- [Delete Taxonomy](#delete-taxonomy)
- [Error Responses](#error-responses)

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/taxonomies` | List all taxonomies |
| GET | `/api/v1/taxonomies/:id` | Get single taxonomy |
| POST | `/api/v1/taxonomies` | Create taxonomy |
| PUT | `/api/v1/taxonomies/:id` | Update taxonomy (full) |
| PATCH | `/api/v1/taxonomies/:id` | Update taxonomy (partial) |
| DELETE | `/api/v1/taxonomies/:id` | Delete taxonomy |

## Taxonomy Object

```json
{
  "id": 1,
  "name": "category",
  "label": "Categories",
  "singular_label": "Category",
  "description": "Organize content into categories",
  "hierarchical": true,
  "public": true,
  "show_in_menu": true,
  "show_in_dashboard": false,
  "menu_position": 1,
  "term_count": 5,
  "created_at": "2025-10-17T12:00:00.000Z",
  "updated_at": "2025-10-17T12:00:00.000Z"
}
```

## List Taxonomies

**GET** `/api/v1/taxonomies`

List all taxonomies with term counts.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (number, optional) - Page number (default: 1)
- `per_page` (number, optional) - Items per page (default: 10, max: 100)

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/taxonomies?per_page=20" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "category",
      "label": "Categories",
      "singular_label": "Category",
      "hierarchical": true,
      "term_count": 5,
      "created_at": "2025-10-17T12:00:00.000Z",
      "updated_at": "2025-10-17T12:00:00.000Z"
    }
  ],
  "meta": {
    "timestamp": "2025-10-17T15:30:00.000Z",
    "version": "v1",
    "pagination": {
      "total": 2,
      "count": 2,
      "per_page": 20,
      "current_page": 1,
      "total_pages": 1
    }
  },
  "links": {
    "self": "/api/v1/taxonomies?page=1&per_page=20"
  }
}
```

## Get Single Taxonomy

**GET** `/api/v1/taxonomies/:id`

Get a specific taxonomy with associated post types.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/taxonomies/1" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "category",
    "label": "Categories",
    "singular_label": "Category",
    "description": "Organize content into categories",
    "hierarchical": true,
    "public": true,
    "show_in_menu": true,
    "show_in_dashboard": false,
    "menu_position": 1,
    "term_count": 5,
    "post_types": [
      {
        "id": 1,
        "name": "post",
        "label": "Posts"
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

## Create Taxonomy

**POST** `/api/v1/taxonomies`

Create a new taxonomy.

**Permission Required:** `manage_taxonomies`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "product_category",
  "label": "Product Categories",
  "singular_label": "Product Category",
  "description": "Organize products into categories",
  "hierarchical": true,
  "public": true,
  "show_in_menu": true,
  "show_in_dashboard": true,
  "menu_position": 25
}
```

**Required Fields:**
- `name` (string) - Unique identifier (lowercase, no spaces)
- `label` (string) - Plural display name
- `singular_label` (string) - Singular display name

**Optional Fields:**
- `description` (string) - Taxonomy description
- `hierarchical` (boolean) - Allow parent-child relationships (default: false)
- `public` (boolean) - Show in public areas (default: true)
- `show_in_menu` (boolean) - Show in admin menu (default: true)
- `show_in_dashboard` (boolean) - Show in dashboard (default: false)
- `menu_position` (number) - Menu order (default: 20)

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/v1/taxonomies" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "product_category",
    "label": "Product Categories",
    "singular_label": "Product Category",
    "hierarchical": true
  }'
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "name": "product_category",
    "label": "Product Categories",
    "singular_label": "Product Category",
    "hierarchical": true,
    "term_count": 0,
    "created_at": "2025-10-17T15:30:00.000Z",
    "updated_at": "2025-10-17T15:30:00.000Z"
  },
  "meta": {
    "timestamp": "2025-10-17T15:30:00.000Z",
    "version": "v1"
  }
}
```

## Update Taxonomy

**PUT** `/api/v1/taxonomies/:id` - Full update
**PATCH** `/api/v1/taxonomies/:id` - Partial update

Update an existing taxonomy. Note: `name` cannot be changed.

**Permission Required:** `manage_taxonomies`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body (PATCH example):**
```json
{
  "label": "Updated Label",
  "show_in_dashboard": true
}
```

**Example Request:**
```bash
curl -X PATCH "http://localhost:3000/api/v1/taxonomies/3" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label": "Updated Label"}'
```

## Delete Taxonomy

**DELETE** `/api/v1/taxonomies/:id`

Delete a taxonomy. Cannot delete default taxonomies (category, tag).

**Permission Required:** `manage_taxonomies`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Example Request:**
```bash
curl -X DELETE "http://localhost:3000/api/v1/taxonomies/3" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "message": "Taxonomy deleted successfully",
    "id": 3
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
    "message": "Cannot delete default taxonomies"
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
    "message": "You do not have permission to create taxonomies"
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Taxonomy with ID 999 not found"
  }
}
```

### 409 Conflict
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Taxonomy with name \"product_category\" already exists"
  }
}
```

## Notes

- All requests require authentication
- Creating, updating, and deleting taxonomies requires `manage_taxonomies` permission
- Default taxonomies (`category` and `tag`) cannot be deleted
- Taxonomy `name` cannot be changed after creation
- Deleting a taxonomy will cascade delete all its terms and relationships
- Taxonomies are site-specific (multi-site support)
- All operations are logged in the activity log

