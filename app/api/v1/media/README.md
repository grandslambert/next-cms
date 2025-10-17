# Media API

Complete operations for managing media files (images, videos, documents, etc.).

## Table of Contents
- [Endpoints](#endpoints)
- [Media Object](#media-object)
- [List Media](#list-media)
- [Get Single Media](#get-single-media)
- [Update Media Metadata](#update-media-metadata)
- [Delete Media](#delete-media)
- [Restore Media](#restore-media)
- [Error Responses](#error-responses)

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/media` | List all media files |
| GET | `/api/v1/media/:id` | Get single media file |
| PATCH | `/api/v1/media/:id` | Update media metadata |
| DELETE | `/api/v1/media/:id` | Delete media (trash or permanent) |
| POST | `/api/v1/media/:id/restore` | Restore media from trash |

## Media Object

```json
{
  "id": 1,
  "filename": "image-2025-10-17-abc123.jpg",
  "original_name": "my-photo.jpg",
  "title": "My Amazing Photo",
  "alt_text": "A beautiful sunset over mountains",
  "mime_type": "image/jpeg",
  "size": 245680,
  "url": "/uploads/site_1/2025/10/image-2025-10-17-abc123.jpg",
  "sizes": {
    "thumbnail": {
      "width": 150,
      "height": 150,
      "url": "/uploads/site_1/2025/10/image-2025-10-17-abc123-150x150.jpg"
    },
    "medium": {
      "width": 300,
      "height": 300,
      "url": "/uploads/site_1/2025/10/image-2025-10-17-abc123-300x300.jpg"
    },
    "large": {
      "width": 1024,
      "height": 1024,
      "url": "/uploads/site_1/2025/10/image-2025-10-17-abc123-1024x1024.jpg"
    }
  },
  "folder_id": null,
  "uploaded_by": 3,
  "deleted_at": null,
  "created_at": "2025-10-17T12:00:00.000Z"
}
```

## List Media

**GET** `/api/v1/media`

List all media files with flexible filtering options.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (number, optional) - Page number (default: 1)
- `per_page` (number, optional) - Items per page (default: 10, max: 100)
- `mime_type` (string, optional) - Filter by exact mime type (e.g., "image/jpeg", "video/mp4")
- `mime_category` (string, optional) - Filter by mime category (e.g., "image", "video", "audio", "application")
- `folder_id` (number, optional) - Filter by folder ID (use "0" or "null" for root)
- `search` (string, optional) - Search in filename, title, and alt_text
- `include_trash` (boolean, optional) - Include trashed items (default: false)
- `only_trash` (boolean, optional) - Show only trashed items (default: false)
- `include` (string, optional) - Comma-separated list of relations to include:
  - `uploader` - Include uploader details
  - `folder` - Include folder details
  - `usage` - Include usage statistics (posts and terms using this media)

**Example Requests:**

```bash
# List all images
curl -X GET "http://localhost:3000/api/v1/media?mime_category=image" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# List media in a specific folder
curl -X GET "http://localhost:3000/api/v1/media?folder_id=5" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Search media
curl -X GET "http://localhost:3000/api/v1/media?search=sunset" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# List media with uploader and usage info
curl -X GET "http://localhost:3000/api/v1/media?include=uploader,usage" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# List trashed media
curl -X GET "http://localhost:3000/api/v1/media?only_trash=true" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "filename": "image-2025-10-17-abc123.jpg",
      "original_name": "my-photo.jpg",
      "title": "My Amazing Photo",
      "alt_text": "A beautiful sunset",
      "mime_type": "image/jpeg",
      "size": 245680,
      "url": "/uploads/site_1/2025/10/image-2025-10-17-abc123.jpg",
      "sizes": {
        "thumbnail": {...},
        "medium": {...},
        "large": {...}
      },
      "folder_id": null,
      "uploaded_by": 3,
      "deleted_at": null,
      "created_at": "2025-10-17T12:00:00.000Z",
      "uploader": {
        "id": 3,
        "username": "john",
        "display_name": "John Doe"
      },
      "usage": {
        "posts": 2,
        "terms": 1,
        "total": 3
      }
    }
  ],
  "meta": {
    "timestamp": "2025-10-17T15:30:00.000Z",
    "version": "v1",
    "pagination": {
      "total": 45,
      "count": 10,
      "per_page": 10,
      "current_page": 1,
      "total_pages": 5
    }
  },
  "links": {
    "self": "/api/v1/media?page=1&per_page=10",
    "next": "/api/v1/media?page=2&per_page=10",
    "last": "/api/v1/media?page=5&per_page=10"
  }
}
```

## Get Single Media

**GET** `/api/v1/media/:id`

Get a specific media file with detailed information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `include` (string, optional) - Comma-separated list of relations:
  - `folder` - Include folder details
  - `usage` - Include detailed usage (which posts/terms use this media)

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/media/1?include=folder,usage" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "filename": "image-2025-10-17-abc123.jpg",
    "original_name": "my-photo.jpg",
    "title": "My Amazing Photo",
    "alt_text": "A beautiful sunset over mountains",
    "mime_type": "image/jpeg",
    "size": 245680,
    "url": "/uploads/site_1/2025/10/image-2025-10-17-abc123.jpg",
    "sizes": {
      "thumbnail": {
        "width": 150,
        "height": 150,
        "url": "/uploads/site_1/2025/10/image-2025-10-17-abc123-150x150.jpg"
      }
    },
    "folder_id": 5,
    "uploaded_by": 3,
    "deleted_at": null,
    "created_at": "2025-10-17T12:00:00.000Z",
    "uploader": {
      "id": 3,
      "username": "john",
      "display_name": "John Doe"
    },
    "folder": {
      "id": 5,
      "name": "Product Photos",
      "parent_id": null
    },
    "usage": {
      "posts": {
        "count": 2,
        "items": [
          {
            "id": 10,
            "title": "Product Launch",
            "slug": "product-launch",
            "status": "published"
          }
        ]
      },
      "terms": {
        "count": 1,
        "items": [
          {
            "id": 5,
            "name": "Products",
            "slug": "products"
          }
        ]
      },
      "total": 3
    }
  },
  "meta": {
    "timestamp": "2025-10-17T15:30:00.000Z",
    "version": "v1"
  }
}
```

## Update Media Metadata

**PATCH** `/api/v1/media/:id`

Update media metadata (title, alt_text, folder). Note: File itself cannot be changed via API.

**Permission Required:** `manage_media`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Updated Title",
  "alt_text": "Updated alt text for accessibility",
  "folder_id": 10
}
```

**Updatable Fields:**
- `title` (string) - Media title
- `alt_text` (string) - Alternative text for images
- `folder_id` (number|null) - Folder ID (null for root)

**Example Request:**
```bash
curl -X PATCH "http://localhost:3000/api/v1/media/1" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sunset Photo",
    "alt_text": "Beautiful sunset over mountains"
  }'
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "filename": "image-2025-10-17-abc123.jpg",
    "original_name": "my-photo.jpg",
    "title": "Sunset Photo",
    "alt_text": "Beautiful sunset over mountains",
    "mime_type": "image/jpeg",
    "size": 245680,
    "url": "/uploads/site_1/2025/10/image-2025-10-17-abc123.jpg",
    "sizes": {...},
    "folder_id": null,
    "uploaded_by": 3,
    "deleted_at": null,
    "created_at": "2025-10-17T12:00:00.000Z"
  },
  "meta": {
    "timestamp": "2025-10-17T15:30:00.000Z",
    "version": "v1"
  }
}
```

## Delete Media

**DELETE** `/api/v1/media/:id`

Delete media file. By default, moves to trash (soft delete). Can permanently delete with query parameters.

**Permission Required:** `manage_media`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `permanent` (boolean, optional) - Permanently delete instead of trash (default: false)
- `force` (boolean, optional) - Force delete even if media is in use (default: false)

**Delete Behavior:**
1. **Soft Delete (default)**: Moves media to trash (sets `deleted_at`)
2. **Permanent Delete**: If `permanent=true` OR media is already in trash
3. **In Use Protection**: Prevents deletion if media is used by posts/terms (unless `force=true`)

**Example Requests:**

```bash
# Move to trash (soft delete)
curl -X DELETE "http://localhost:3000/api/v1/media/1" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Permanently delete
curl -X DELETE "http://localhost:3000/api/v1/media/1?permanent=true" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Force delete even if in use
curl -X DELETE "http://localhost:3000/api/v1/media/1?force=true" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Example Response (Soft Delete):**
```json
{
  "success": true,
  "data": {
    "message": "Media moved to trash",
    "id": 1
  },
  "meta": {
    "timestamp": "2025-10-17T15:30:00.000Z",
    "version": "v1"
  }
}
```

**Example Response (Permanent Delete):**
```json
{
  "success": true,
  "data": {
    "message": "Media permanently deleted",
    "id": 1
  },
  "meta": {
    "timestamp": "2025-10-17T15:30:00.000Z",
    "version": "v1"
  }
}
```

## Restore Media

**POST** `/api/v1/media/:id/restore`

Restore media from trash.

**Permission Required:** `manage_media`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/v1/media/1/restore" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "filename": "image-2025-10-17-abc123.jpg",
    "original_name": "my-photo.jpg",
    "title": "My Amazing Photo",
    "alt_text": "A beautiful sunset",
    "mime_type": "image/jpeg",
    "size": 245680,
    "url": "/uploads/site_1/2025/10/image-2025-10-17-abc123.jpg",
    "sizes": {...},
    "folder_id": null,
    "uploaded_by": 3,
    "deleted_at": null,
    "created_at": "2025-10-17T12:00:00.000Z"
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
    "message": "Media is in use by 2 post(s) and 1 term(s). Use ?force=true to delete anyway."
  }
}
```

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Media is not in trash"
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
    "message": "You do not have permission to delete media"
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Media with ID 999 not found"
  }
}
```

## Features

### MIME Type Filtering
Filter by exact mime type or category:

```bash
# Exact type
curl -X GET "http://localhost:3000/api/v1/media?mime_type=image/jpeg"

# Category
curl -X GET "http://localhost:3000/api/v1/media?mime_category=image"
# Returns all image types: image/jpeg, image/png, image/gif, etc.

curl -X GET "http://localhost:3000/api/v1/media?mime_category=video"
# Returns all video types: video/mp4, video/webm, etc.
```

### Folder Management
Organize media in folders:

```bash
# Root level media
curl -X GET "http://localhost:3000/api/v1/media?folder_id=0"

# Specific folder
curl -X GET "http://localhost:3000/api/v1/media?folder_id=5"

# Move media to folder
curl -X PATCH "http://localhost:3000/api/v1/media/1" \
  -d '{"folder_id": 10}'

# Move to root
curl -X PATCH "http://localhost:3000/api/v1/media/1" \
  -d '{"folder_id": null}'
```

### Usage Tracking
See where media is used:

```bash
curl -X GET "http://localhost:3000/api/v1/media/1?include=usage" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Returns detailed usage information showing:
- Posts using this as featured image
- Terms using this as category/tag image
- Total usage count

### Trash Management

```bash
# List trash
curl -X GET "http://localhost:3000/api/v1/media?only_trash=true"

# Move to trash
curl -X DELETE "http://localhost:3000/api/v1/media/1"

# Restore from trash
curl -X POST "http://localhost:3000/api/v1/media/1/restore"

# Permanently delete
curl -X DELETE "http://localhost:3000/api/v1/media/1?permanent=true"
```

## Notes

- All requests require authentication
- Updating and deleting media requires `manage_media` permission
- Media files are site-specific (multi-site support)
- Soft delete (trash) is default behavior
- Media in trash can be permanently deleted or restored
- Force delete bypasses usage protection
- File uploads should use the existing `/api/media` endpoint
- The `sizes` field contains different image sizes (for images only)
- All operations are logged in the activity log

## Use Cases

### 1. Media Library Grid
```bash
curl -X GET "http://localhost:3000/api/v1/media?per_page=50&include=uploader" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 2. Image Selector for Posts
```bash
curl -X GET "http://localhost:3000/api/v1/media?mime_category=image&per_page=20" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Find Unused Media
```bash
curl -X GET "http://localhost:3000/api/v1/media?include=usage" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
# Filter client-side for usage.total === 0
```

### 4. Bulk Trash Management
```bash
# Get all trashed items
curl -X GET "http://localhost:3000/api/v1/media?only_trash=true&per_page=100"

# Delete permanently (loop through IDs)
curl -X DELETE "http://localhost:3000/api/v1/media/:id?permanent=true"
```

### 5. Folder Contents
```bash
curl -X GET "http://localhost:3000/api/v1/media?folder_id=5&include=usage" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

**Note:** File upload functionality should reference the existing admin media upload endpoint (`/api/media`) or can be added to the REST API in a future update with proper multipart/form-data handling.

