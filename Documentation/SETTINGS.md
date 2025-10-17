# Settings System

## Overview

The CMS includes a flexible settings system for site-wide configuration that persists in the database.

## Features

### Settings Pages

Access via **Admin → Settings ⚙️**

#### General Settings
- **Site Name** - Your website's name (used in navbar, footer, page titles)
- **Site Tagline** - A short slogan or description
- **Site Description** - Longer description for SEO and about sections

#### Media Settings
- **Image Sizes** - Configure automatic image resizing
- **Custom Sizes** - Add your own size presets
- **Dynamic Configuration** - Changes apply to new uploads

## Database Structure

### Settings Table

```sql
CREATE TABLE settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type ENUM('string', 'number', 'boolean', 'json'),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Setting Types

| Type | Storage | Example |
|------|---------|---------|
| **string** | Plain text | "Next CMS" |
| **number** | Numeric string | "10" → 10 |
| **boolean** | "1" or "0" | "1" → true |
| **json** | JSON string | "{\"width\":150}" |

### Default Settings

```sql
site_name: "Next CMS"
site_tagline: "A powerful content management system"
site_description: "Built with Next.js, Tailwind CSS, and MySQL"
image_sizes: {"thumbnail":{"width":150,"height":150},...}
```

## API Endpoints

### GET /api/settings

Returns all settings as key-value pairs:

```typescript
GET /api/settings

Response:
{
  "settings": {
    "site_name": "Next CMS",
    "site_tagline": "...",
    "image_sizes": {
      "thumbnail": {"width": 150, "height": 150},
      "medium": {"width": 300, "height": 300},
      "large": {"width": 1024, "height": 1024}
    }
  }
}
```

**Features:**
- Automatically parses JSON types
- Converts booleans
- Converts numbers
- Public endpoint (no auth required)

### PUT /api/settings

Update multiple settings at once:

```typescript
PUT /api/settings
Auth: Admin only

Body:
{
  "settings": {
    "site_name": "My Awesome Site",
    "site_tagline": "The best site ever",
    "image_sizes": {
      "thumbnail": {"width": 200, "height": 200},
      "hero": {"width": 1920, "height": 1080}
    }
  }
}
```

**Features:**
- Batch update multiple settings
- Auto-detects type from value
- Creates if not exists, updates if exists
- Admin-only access

## Usage in Code

### Server Components

```typescript
// lib/settings.ts helper
async function getSetting(key: string) {
  const [rows] = await db.query(
    'SELECT setting_value FROM settings WHERE setting_key = ?',
    [key]
  );
  return rows[0]?.setting_value;
}

// In your component
const siteName = await getSetting('site_name');
```

### Client Components

```typescript
const { data } = useQuery({
  queryKey: ['settings'],
  queryFn: async () => {
    const res = await axios.get('/api/settings');
    return res.data;
  },
});

const siteName = data?.settings?.site_name;
```

## General Settings

### Site Name

**Where Used:**
- Navbar logo
- Homepage hero section
- Footer
- Page titles (via metadata)
- Email notifications (future)

**Default:** "Next CMS"

### Site Tagline

**Where Used:**
- Homepage hero subtitle
- SEO descriptions
- About sections

**Default:** "A powerful content management system"

### Site Description

**Where Used:**
- Footer about section
- Meta descriptions
- About page

**Default:** "Built with Next.js, Tailwind CSS, and MySQL"

## Media Settings

### Image Sizes Configuration

Stored as JSON object in `image_sizes` setting.

**Structure:**
```json
{
  "thumbnail": {"width": 150, "height": 150},
  "medium": {"width": 300, "height": 300},
  "large": {"width": 1024, "height": 1024},
  "hero": {"width": 1920, "height": 1080}  // Custom
}
```

**When Used:**
- Media upload automatically generates these sizes
- Sharp resizes images with `fit: 'inside'`
- Maintains aspect ratio
- Won't enlarge smaller images

### Built-in Sizes

**Thumbnail (150×150px)**
- Category icons
- Avatar images
- Grid previews

**Medium (300×300px)**
- Blog listing images
- In-content images
- Card thumbnails

**Large (1024×1024px)**
- Featured images
- Hero sections
- Full post images

### Adding Custom Sizes

**Via Admin UI:**
1. Go to Settings → Media
2. Enter size name (e.g., "hero")
3. Set width and height
4. Click "Add Size"
5. Save Media Settings

**Programmatically:**
```typescript
await axios.put('/api/settings', {
  settings: {
    image_sizes: {
      ...existingSizes,
      hero: { width: 1920, height: 1080 },
      square: { width: 500, height: 500 },
    }
  }
});
```

### Using Custom Sizes

After adding a custom size, it's automatically available:

```typescript
// Upload new image → generates custom size
// In template:
const heroUrl = getImageUrl(url, sizes, 'hero');
```

## Settings in Templates

### Homepage

```typescript
// Uses: site_name, site_tagline
<h1>Welcome to {siteName}</h1>
<p>{siteTagline}</p>
```

### Navbar

```typescript
// Uses: site_name
<Link href="/">{siteName}</Link>
```

### Footer

```typescript
// Uses: site_name, site_description
<h3>{siteName}</h3>
<p>{siteDescription}</p>
<p>&copy; 2025 {siteName}</p>
```

### Image Rendering

```typescript
// Uses: image_sizes (via media API)
// Templates automatically use appropriate size
```

## Admin Interface

### Navigation

Settings accessible via:
- Sidebar: Settings ⚙️
- URL: `/admin/settings`

### Tabs

- **General** - Site information
- **Media** - Image size configuration

### Features

**General Tab:**
- ✅ Form with site name, tagline, description
- ✅ Help text for each field
- ✅ Save button with loading state
- ✅ Toast notifications

**Media Tab:**
- ✅ List of current image sizes
- ✅ Edit width/height for each size
- ✅ Add custom sizes
- ✅ Remove custom sizes (built-ins protected)
- ✅ Note about applying to new uploads only
- ✅ Count of configured sizes

## Extending Settings

### Adding New Settings

**1. Add via Admin (Runtime):**
```typescript
await axios.put('/api/settings', {
  settings: {
    posts_per_page: 10,
    enable_comments: true,
  }
});
```

**2. Add via Database:**
```sql
INSERT INTO settings (setting_key, setting_value, setting_type)
VALUES ('posts_per_page', '10', 'number');
```

**3. Add New Settings Page:**

Create `app/admin/settings/seo/page.tsx`:
```typescript
// SEO settings page
```

Update `app/admin/settings/layout.tsx`:
```typescript
const settingsTabs = [
  { name: 'General', href: '/admin/settings', exact: true },
  { name: 'Media', href: '/admin/settings/media' },
  { name: 'SEO', href: '/admin/settings/seo' }, // NEW
];
```

## Best Practices

### Performance
- ✅ Settings cached per request (server components)
- ✅ Client components use React Query caching
- ✅ Minimal database queries

### Security
- ✅ Only admins can update settings
- ✅ Validation on input
- ✅ SQL injection prevented

### Data Integrity
- ✅ Type enforcement
- ✅ Default fallbacks
- ✅ Graceful error handling

## Example Use Cases

### Custom Posts Per Page

```typescript
// Add setting
INSERT INTO settings VALUES (null, 'posts_per_page', '15', 'number', NOW(), NOW());

// Use in query
const perPage = await getSetting('posts_per_page') || 10;
const [posts] = await db.query('SELECT * FROM posts LIMIT ?', [perPage]);
```

### Site Maintenance Mode

```typescript
// Add setting
settings: { maintenance_mode: true }

// Check in middleware
const isMaintenanceMode = await getSetting('maintenance_mode');
if (isMaintenanceMode && !isAdmin) {
  return <MaintenancePage />;
}
```

### Custom Theme Colors

```typescript
// Store as JSON
settings: {
  theme_colors: {
    primary: '#0ea5e9',
    secondary: '#8b5cf6'
  }
}

// Use in Tailwind config or CSS variables
```

## Troubleshooting

### Settings not appearing

1. Check settings table exists: `SHOW TABLES LIKE 'settings'`
2. Check default settings inserted: `SELECT * FROM settings`
3. Run setup script if needed: `node setup-settings.js`

### Changes not reflecting

1. Restart dev server (settings cached)
2. Check browser console for errors
3. Verify admin permissions

### Image sizes not working

1. Settings saved? Check Settings → Media
2. Only affects NEW uploads (existing images unchanged)
3. Check Sharp is installed: `npm list sharp`

## Future Enhancements

Possible settings to add:
- [ ] SEO defaults (meta descriptions, keywords)
- [ ] Social media links
- [ ] Google Analytics ID
- [ ] Contact email
- [ ] Posts per page
- [ ] Comment settings
- [ ] Email SMTP configuration
- [ ] Theme customization
- [ ] Custom CSS/JavaScript

