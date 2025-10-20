# Menus API

Complete operations for managing navigation menus and menu items.

## Table of Contents
- [Endpoints](#endpoints)
- [Menu Object](#menu-object)
- [Menu Item Object](#menu-item-object)
- [List Menus](#list-menus)
- [Get Single Menu](#get-single-menu)
- [Create Menu](#create-menu)
- [Update Menu](#update-menu)
- [Delete Menu](#delete-menu)
- [Create Menu Item](#create-menu-item)
- [Get Menu Item](#get-menu-item)
- [Update Menu Item](#update-menu-item)
- [Delete Menu Item](#delete-menu-item)
- [Reorder Menu Items](#reorder-menu-items)
- [Menu Item Types](#menu-item-types)
- [Error Responses](#error-responses)

## Endpoints

### Menus
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/menus` | List all menus |
| POST | `/api/v1/menus` | Create a new menu |
| GET | `/api/v1/menus/:id` | Get single menu |
| PUT | `/api/v1/menus/:id` | Update menu (full) |
| PATCH | `/api/v1/menus/:id` | Update menu (partial) |
| DELETE | `/api/v1/menus/:id` | Delete menu |

### Menu Items
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/menus/:id/items` | Add item to menu |
| GET | `/api/v1/menus/:id/items/:itemId` | Get single menu item |
| PATCH | `/api/v1/menus/:id/items/:itemId` | Update menu item |
| DELETE | `/api/v1/menus/:id/items/:itemId` | Delete menu item |
| PUT | `/api/v1/menus/:id/items` | Reorder menu items |

## Menu Object

```json
{
  "id": 1,
  "name": "main-menu",
  "location": "primary",
  "description": "Main navigation menu",
  "item_count": 5,
  "created_at": "2025-10-17T12:00:00.000Z",
  "updated_at": "2025-10-17T12:00:00.000Z"
}
```

## Menu Item Object

```json
{
  "id": 1,
  "menu_id": 1,
  "parent_id": null,
  "type": "post",
  "object_id": 10,
  "post_type": "page",
  "custom_url": null,
  "custom_label": null,
  "menu_order": 1,
  "target": "_self",
  "created_at": "2025-10-17T12:00:00.000Z",
  "updated_at": "2025-10-17T12:00:00.000Z",
  "meta": {
    "icon": "home",
    "css_class": "nav-item"
  }
}
```

## List Menus

**GET** `/api/v1/menus`

List all menus with optional filtering.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (number, optional) - Page number (default: 1)
- `per_page` (number, optional) - Items per page (default: 10, max: 100)
- `search` (string, optional) - Search in name, location, and description
- `include` (string, optional) - Include related data:
  - `items` - Include all menu items (hierarchical structure)

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/menus?include=items" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "main-menu",
      "location": "primary",
      "description": "Main navigation menu",
      "item_count": 3,
      "created_at": "2025-10-17T12:00:00.000Z",
      "updated_at": "2025-10-17T12:00:00.000Z"
    }
  ],
  "meta": {
    "timestamp": "2025-10-17T15:30:00.000Z",
    "version": "v1",
    "pagination": {
      "total": 1,
      "count": 1,
      "per_page": 10,
      "current_page": 1,
      "total_pages": 1
    }
  },
  "links": {
    "self": "/api/v1/menus?page=1&per_page=10"
  }
}
```

## Get Single Menu

**GET** `/api/v1/menus/:id`

Get a specific menu with its items in hierarchical structure.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `hierarchical` (boolean, optional) - Return items in hierarchy (default: true)

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/menus/1" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "main-menu",
    "location": "primary",
    "description": "Main navigation menu",
    "item_count": 5,
    "items": [
      {
        "id": 1,
        "menu_id": 1,
        "parent_id": null,
        "type": "post",
        "object_id": 5,
        "post_type": "page",
        "custom_url": null,
        "custom_label": null,
        "menu_order": 1,
        "target": "_self",
        "meta": {},
        "children": [
          {
            "id": 2,
            "menu_id": 1,
            "parent_id": 1,
            "type": "post",
            "object_id": 8,
            "post_type": "page",
            "menu_order": 1,
            "target": "_self",
            "meta": {},
            "children": []
          }
        ]
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

## Create Menu

**POST** `/api/v1/menus`

Create a new menu.

**Permission Required:** `manage_menus`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "footer-menu",
  "location": "footer",
  "description": "Footer navigation menu"
}
```

**Required Fields:**
- `name` (string) - Unique menu identifier
- `location` (string) - Menu location/position

**Optional Fields:**
- `description` (string) - Menu description

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/v1/menus" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "footer-menu",
    "location": "footer",
    "description": "Footer navigation"
  }'
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "footer-menu",
    "location": "footer",
    "description": "Footer navigation",
    "item_count": 0,
    "created_at": "2025-10-17T15:30:00.000Z",
    "updated_at": "2025-10-17T15:30:00.000Z"
  },
  "meta": {
    "timestamp": "2025-10-17T15:30:00.000Z",
    "version": "v1"
  }
}
```

## Update Menu

**PUT** `/api/v1/menus/:id` (Full update - all fields required)  
**PATCH** `/api/v1/menus/:id` (Partial update - only changed fields)

Update menu details.

**Permission Required:** `manage_menus`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body (PUT):**
```json
{
  "name": "main-navigation",
  "location": "primary",
  "description": "Updated main menu"
}
```

**Request Body (PATCH):**
```json
{
  "description": "Updated description only"
}
```

**Example Request:**
```bash
curl -X PATCH "http://localhost:3000/api/v1/menus/1" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description"
  }'
```

## Delete Menu

**DELETE** `/api/v1/menus/:id`

Delete a menu and all its items.

**Permission Required:** `manage_menus`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Example Request:**
```bash
curl -X DELETE "http://localhost:3000/api/v1/menus/1" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "message": "Menu deleted successfully",
    "id": 1
  },
  "meta": {
    "timestamp": "2025-10-17T15:30:00.000Z",
    "version": "v1"
  }
}
```

## Create Menu Item

**POST** `/api/v1/menus/:id/items`

Add a new item to a menu.

**Permission Required:** `manage_menus`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "type": "post",
  "object_id": 10,
  "post_type": "page",
  "parent_id": null,
  "menu_order": 1,
  "target": "_self",
  "meta": {
    "icon": "home",
    "css_class": "nav-item"
  }
}
```

**Required Fields:**
- `type` (enum) - One of: `post`, `post_type`, `taxonomy`, `term`, `custom`
- For `custom` type:
  - `custom_url` (string) - URL to link to
  - `custom_label` (string) - Display text
- For other types:
  - `object_id` (number) - ID of the referenced object

**Optional Fields:**
- `parent_id` (number) - Parent item ID for nested menus
- `post_type` (string) - For post/post_type items
- `menu_order` (number) - Display order (auto-assigned if not provided)
- `target` (string) - Link target (`_self` or `_blank`, default: `_self`)
- `meta` (object) - Custom metadata

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/v1/menus/1/items" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "custom",
    "custom_url": "https://example.com",
    "custom_label": "External Link",
    "target": "_blank"
  }'
```

## Get Menu Item

**GET** `/api/v1/menus/:id/items/:itemId`

Get a specific menu item with its metadata.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/menus/1/items/5" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Update Menu Item

**PATCH** `/api/v1/menus/:id/items/:itemId`

Update a menu item.

**Permission Required:** `manage_menus`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "menu_order": 2,
  "parent_id": 3,
  "meta": {
    "icon": "star",
    "css_class": "featured"
  }
}
```

**Updatable Fields:**
- `parent_id` (number|null)
- `type` (enum)
- `object_id` (number)
- `post_type` (string)
- `custom_url` (string)
- `custom_label` (string)
- `menu_order` (number)
- `target` (string)
- `meta` (object) - Set individual meta values to `null` to delete

**Example Request:**
```bash
curl -X PATCH "http://localhost:3000/api/v1/menus/1/items/5" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "menu_order": 2,
    "meta": {
      "icon": "star"
    }
  }'
```

## Delete Menu Item

**DELETE** `/api/v1/menus/:id/items/:itemId`

Delete a menu item.

**Permission Required:** `manage_menus`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Protection:** Cannot delete items with children. Delete or reassign children first.

**Example Request:**
```bash
curl -X DELETE "http://localhost:3000/api/v1/menus/1/items/5" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Error Response (has children):**
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Cannot delete menu item with children. Delete or reassign child items first."
  }
}
```

## Reorder Menu Items

**PUT** `/api/v1/menus/:id/items`

Reorder menu items and update parent relationships.

**Permission Required:** `manage_menus`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "items": [
    {
      "id": 1,
      "menu_order": 1,
      "parent_id": null
    },
    {
      "id": 2,
      "menu_order": 1,
      "parent_id": 1
    },
    {
      "id": 3,
      "menu_order": 2,
      "parent_id": null
    }
  ]
}
```

**Example Request:**
```bash
curl -X PUT "http://localhost:3000/api/v1/menus/1/items" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"id": 1, "menu_order": 1, "parent_id": null},
      {"id": 2, "menu_order": 2, "parent_id": null},
      {"id": 3, "menu_order": 1, "parent_id": 2}
    ]
  }'
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "message": "Menu items reordered successfully",
    "updated": 3
  },
  "meta": {
    "timestamp": "2025-10-17T15:30:00.000Z",
    "version": "v1"
  }
}
```

## Menu Item Types

### 1. Post (`type: "post"`)
Link to a specific post or page.

```json
{
  "type": "post",
  "object_id": 10,
  "post_type": "page"
}
```

### 2. Post Type Archive (`type: "post_type"`)
Link to a post type archive page.

```json
{
  "type": "post_type",
  "post_type": "product"
}
```

### 3. Taxonomy Archive (`type: "taxonomy"`)
Link to a taxonomy archive.

```json
{
  "type": "taxonomy",
  "object_id": 1
}
```

### 4. Term (`type: "term"`)
Link to a specific term (category/tag).

```json
{
  "type": "term",
  "object_id": 5
}
```

### 5. Custom URL (`type: "custom"`)
Link to any custom URL.

```json
{
  "type": "custom",
  "custom_url": "https://example.com",
  "custom_label": "External Link",
  "target": "_blank"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Menu name is required"
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
    "message": "You do not have permission to create menus"
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Menu with ID 999 not found"
  }
}
```

### 409 Conflict
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Menu with name 'main-menu' already exists"
  }
}
```

## Features

### Hierarchical Structure
Menu items support unlimited nesting:

```json
{
  "items": [
    {
      "id": 1,
      "custom_label": "Products",
      "children": [
        {
          "id": 2,
          "custom_label": "Category 1",
          "children": [
            {
              "id": 3,
              "custom_label": "Subcategory 1.1",
              "children": []
            }
          ]
        }
      ]
    }
  ]
}
```

### Meta Fields
Store custom data for menu items:

```json
{
  "meta": {
    "icon": "home",
    "css_class": "nav-primary",
    "badge": "New",
    "description": "Homepage link"
  }
}
```

### Drag & Drop Support
The reorder endpoint supports full drag-and-drop functionality:
- Change item order
- Move items between parents
- Move to root level

## Use Cases

### 1. Build Main Navigation
```bash
# Create menu
curl -X POST ".../menus" -d '{"name":"main", "location":"primary"}'

# Add home page
curl -X POST ".../menus/1/items" -d '{"type":"post", "object_id":1, "post_type":"page"}'

# Add products with dropdown
curl -X POST ".../menus/1/items" -d '{"type":"custom", "custom_label":"Products", "custom_url":"#"}'
curl -X POST ".../menus/1/items" -d '{"type":"term", "object_id":5, "parent_id":2}'
```

### 2. Build Footer Menu
```bash
curl -X POST ".../menus" -d '{
  "name":"footer",
  "location":"footer"
}'

curl -X POST ".../menus/2/items" -d '{
  "type":"custom",
  "custom_url":"https://example.com/privacy",
  "custom_label":"Privacy Policy"
}'
```

### 3. Social Links Menu
```bash
curl -X POST ".../menus" -d '{"name":"social", "location":"header"}'

curl -X POST ".../menus/3/items" -d '{
  "type":"custom",
  "custom_url":"https://twitter.com/example",
  "custom_label":"Twitter",
  "target":"_blank",
  "meta": {"icon": "twitter"}
}'
```

---

**Note:** All menu operations require authentication and appropriate permissions. Menu items cascade delete when their parent menu is deleted.

