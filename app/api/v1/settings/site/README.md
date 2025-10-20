# Site Settings API

Complete API documentation for managing site-specific settings.

## Base URL

```
/api/v1/settings/site
```

## Authentication

All endpoints require authentication via JWT token or API key.

**Required Permission:** `manage_settings` or `is_super_admin`

**Site Context:** All operations are scoped to the authenticated user's current site.

## Endpoints

### List Site Settings

```http
GET /api/v1/settings/site
```

Retrieve a paginated list of all settings for the current site.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `per_page` | integer | 50 | Items per page (max: 100) |
| `search` | string | - | Search in setting_key |

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/v1/settings/site?page=1&per_page=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Example Response

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "setting_key": "site_title",
      "setting_value": "My Site",
      "setting_type": "string",
      "parsed_value": "My Site",
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "setting_key": "posts_per_page",
      "setting_value": "10",
      "setting_type": "number",
      "parsed_value": 10,
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-01T00:00:00.000Z"
    },
    {
      "id": 3,
      "setting_key": "enable_comments",
      "setting_value": "1",
      "setting_type": "boolean",
      "parsed_value": true,
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "timestamp": "2025-10-18T00:00:00.000Z",
    "version": "v1",
    "total": 3,
    "count": 3,
    "per_page": 50,
    "current_page": 1,
    "total_pages": 1
  },
  "links": {
    "self": "/api/v1/settings/site?page=1&per_page=50",
    "first": "/api/v1/settings/site?page=1&per_page=50",
    "last": "/api/v1/settings/site?page=1&per_page=50"
  }
}
```

---

### Get Site Setting

```http
GET /api/v1/settings/site/:key
```

Retrieve a single setting by key.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `key` | string | Yes | Setting key (URL-encoded) |

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/v1/settings/site/site_title" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "id": 1,
    "setting_key": "site_title",
    "setting_value": "My Site",
    "setting_type": "string",
    "parsed_value": "My Site",
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T00:00:00.000Z"
  },
  "meta": {
    "timestamp": "2025-10-18T00:00:00.000Z",
    "version": "v1"
  }
}
```

---

### Update or Create Site Setting

```http
PUT /api/v1/settings/site/:key
PATCH /api/v1/settings/site/:key
```

Update an existing setting or create a new one if it doesn't exist.

**Note:** PUT and PATCH behave identically for settings.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `key` | string | Yes | Setting key (URL-encoded) |

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `setting_value` | any | Yes | The new value for the setting |
| `setting_type` | string | No | Type of setting: `string`, `number`, `boolean`, `json` (default: `string` for new settings) |

#### Setting Types

| Type | Description | Example Value | Stored As |
|------|-------------|---------------|-----------|
| `string` | Text value | `"My Site"` | `"My Site"` |
| `number` | Numeric value | `10` or `"10"` | `"10"` |
| `boolean` | True/false value | `true` or `false` | `"1"` or `"0"` |
| `json` | JSON object/array | `{"key": "value"}` | `"{\"key\":\"value\"}"` |

#### Example Request - String Setting

```bash
curl -X PUT "http://localhost:3000/api/v1/settings/site/site_title" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "setting_value": "My Awesome Site",
    "setting_type": "string"
  }'
```

#### Example Request - Boolean Setting

```bash
curl -X PUT "http://localhost:3000/api/v1/settings/site/enable_comments" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "setting_value": false,
    "setting_type": "boolean"
  }'
```

#### Example Request - Number Setting

```bash
curl -X PUT "http://localhost:3000/api/v1/settings/site/posts_per_page" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "setting_value": 20,
    "setting_type": "number"
  }'
```

#### Example Request - JSON Setting

```bash
curl -X PUT "http://localhost:3000/api/v1/settings/site/theme_config" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "setting_value": {
      "primary_color": "#3B82F6",
      "secondary_color": "#10B981"
    },
    "setting_type": "json"
  }'
```

#### Example Response - Update

```json
{
  "success": true,
  "data": {
    "id": 1,
    "setting_key": "site_title",
    "setting_value": "My Awesome Site",
    "setting_type": "string",
    "parsed_value": "My Awesome Site",
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-10-18T00:00:00.000Z"
  },
  "meta": {
    "timestamp": "2025-10-18T00:00:00.000Z",
    "version": "v1",
    "message": "Setting updated successfully"
  }
}
```

#### Example Response - Create

```json
{
  "success": true,
  "data": {
    "id": 4,
    "setting_key": "new_setting",
    "setting_value": "value",
    "setting_type": "string",
    "parsed_value": "value",
    "created_at": "2025-10-18T00:00:00.000Z",
    "updated_at": "2025-10-18T00:00:00.000Z"
  },
  "meta": {
    "timestamp": "2025-10-18T00:00:00.000Z",
    "version": "v1",
    "message": "Setting created successfully"
  }
}
```

---

## Setting Types in Detail

### String

- Default type for new settings
- No transformation applied
- Stored and returned as-is

```json
{
  "setting_value": "Some text",
  "setting_type": "string"
}
// Stored as: "Some text"
// parsed_value: "Some text"
```

### Number

- Accepts numbers or numeric strings
- Parsed as float for `parsed_value`
- Stored as string in database

```json
{
  "setting_value": 42,
  "setting_type": "number"
}
// Stored as: "42"
// parsed_value: 42
```

### Boolean

- Accepts `true`, `false`, `1`, `0`
- Stored as `"1"` (true) or `"0"` (false)
- `parsed_value` returns actual boolean

```json
{
  "setting_value": true,
  "setting_type": "boolean"
}
// Stored as: "1"
// parsed_value: true
```

### JSON

- Accepts objects or arrays
- Automatically stringified if object is provided
- `parsed_value` returns parsed JSON object

```json
{
  "setting_value": {"theme": "dark", "sidebar": true},
  "setting_type": "json"
}
// Stored as: "{\"theme\":\"dark\",\"sidebar\":true}"
// parsed_value: {"theme": "dark", "sidebar": true}
```

---

## Response Fields

Each setting response includes:

| Field | Description |
|-------|-------------|
| `id` | Setting ID |
| `setting_key` | Setting identifier |
| `setting_value` | Raw string value as stored in database |
| `setting_type` | Data type of the setting |
| `parsed_value` | Value parsed according to its type |
| `created_at` | Creation timestamp |
| `updated_at` | Last update timestamp |

---

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "setting_value is required",
    "field": "setting_value"
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
    "message": "You do not have permission to manage settings"
  }
}
```

### 404 Not Found

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Setting not found"
  }
}
```

---

## Activity Logging

All settings operations are logged to the activity log:

- `settings_updated` - When a setting is created or updated

Activity logs include:
- Setting key
- Old value (for updates)
- New value
- Site ID context

---

## Common Settings

Here are some commonly used site settings:

| Key | Type | Description |
|-----|------|-------------|
| `site_title` | string | Site title |
| `site_description` | string | Site description/tagline |
| `site_url` | string | Full site URL |
| `posts_per_page` | number | Number of posts per page |
| `enable_comments` | boolean | Enable/disable comments |
| `comment_moderation` | boolean | Require comment moderation |
| `default_post_status` | string | Default status for new posts |
| `timezone` | string | Site timezone |
| `date_format` | string | Date format string |
| `time_format` | string | Time format string |
| `theme` | string | Active theme name |
| `theme_config` | json | Theme configuration object |
| `seo_enabled` | boolean | Enable SEO features |
| `analytics_id` | string | Google Analytics ID |

---

## Best Practices

1. **Type Consistency**: Always specify `setting_type` when creating settings
2. **Key Naming**: Use lowercase with underscores (e.g., `posts_per_page`)
3. **JSON Settings**: Use for complex configurations
4. **Validation**: Validate settings on the client side before updating
5. **Defaults**: Always have fallback defaults in your application
6. **Caching**: Consider caching settings on the client side
7. **Documentation**: Document custom settings for your team

---

## Multi-Site Considerations

- Settings are completely isolated per site
- Each site has its own `site_{id}_settings` table
- Settings for Site 1 are in `site_1_settings`, Site 2 in `site_2_settings`, etc.
- Users can only manage settings for sites they have access to
- The current site is determined from the authenticated user's context

---

## Related APIs

- **Sites**: `/api/v1/sites` - Manage sites
- **Posts**: `/api/v1/posts` - Content is affected by site settings
- **Users**: `/api/v1/users` - User permissions control settings access

---

## Migration from Global Settings

If you need to migrate from global settings to site-specific settings:

1. Export global settings
2. For each site, import the settings using PUT requests
3. Customize per-site as needed
4. Global settings are managed through the admin UI only

