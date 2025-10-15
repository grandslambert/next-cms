# Media Metadata Management

## Overview

Next CMS now supports adding titles and alt text to all media files, improving organization, accessibility, and SEO.

## Features

### Title Field
- **Purpose**: Provides a descriptive name for media files
- **Usage**: Displayed in the media library instead of the filename
- **Benefits**: Better organization and easier identification of images

### Alt Text Field
- **Purpose**: Describes images for accessibility and SEO
- **Usage**: Used by screen readers and search engines
- **Benefits**: 
  - Improves accessibility for visually impaired users
  - Enhances SEO by providing image context to search engines
  - Displays when images fail to load

## How to Use

### Adding Metadata During Upload
When uploading new media files, the system automatically creates empty title and alt text fields that you can edit later.

### Editing Metadata

1. Navigate to **Media Library** (`/admin/media`)
2. Hover over any media item
3. Click the **✏️ Edit** button
4. A modal will open with:
   - Image preview
   - **Title** field - Enter a descriptive title
   - **Alt Text** field - Describe the image (for images only)
   - File information (size, type, upload date, URL)
5. Click **Save Changes**

### Viewing Metadata

In the media library grid:
- The **title** is displayed as the primary label (falls back to filename if empty)
- **Alt text** is shown below the title with "Alt:" prefix (if provided)
- File size is shown at the bottom

## Database Schema

```sql
CREATE TABLE media (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  title VARCHAR(255),              -- New field
  alt_text VARCHAR(255),            -- New field
  mime_type VARCHAR(100) NOT NULL,
  size INT NOT NULL,
  url VARCHAR(500) NOT NULL,
  sizes JSON,
  uploaded_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Update Media Metadata
```
PUT /api/media/[id]
```

**Request Body:**
```json
{
  "title": "Beautiful Sunset",
  "alt_text": "A vibrant orange sunset over the ocean with silhouetted palm trees"
}
```

**Response:**
```json
{
  "media": {
    "id": 1,
    "filename": "sunset-1234567890.jpg",
    "title": "Beautiful Sunset",
    "alt_text": "A vibrant orange sunset over the ocean with silhouetted palm trees",
    "url": "/uploads/2025/10/sunset-1234567890.jpg",
    ...
  }
}
```

### Get Media Details
```
GET /api/media/[id]
```

Returns full media object including title and alt_text fields.

## Migration

For existing installations, run the migration script:

```bash
node scripts/add-media-metadata.js
```

Or manually run the SQL:

```sql
ALTER TABLE media ADD title VARCHAR(255) AFTER original_name;
ALTER TABLE media ADD alt_text VARCHAR(255) AFTER title;
```

## Best Practices

### Writing Good Titles
- Be descriptive and concise
- Include relevant keywords
- Example: "Product Hero Banner" instead of "IMG_1234"

### Writing Good Alt Text
- Describe what's in the image clearly
- Keep it under 125 characters when possible
- Don't start with "image of" or "picture of"
- Be specific about important details
- Examples:
  - ✅ "Red bicycle leaning against a brick wall on a sunny day"
  - ❌ "Bicycle"
  - ✅ "CEO Jane Smith presenting quarterly results to investors"
  - ❌ "Photo of presentation"

### When to Skip Alt Text
- Decorative images that don't add content (use empty alt="")
- Images already described in surrounding text
- Icons with visible text labels

## Accessibility Impact

Proper alt text ensures:
- **Screen readers** can describe images to visually impaired users
- **Search engines** can understand image content
- **Users with slow connections** see descriptions while images load
- **Compliance** with WCAG 2.1 accessibility guidelines

## SEO Benefits

Images with descriptive titles and alt text:
- Rank better in image search results
- Contribute to overall page SEO
- Provide context for content indexing
- Improve user experience signals

## Future Enhancements

Potential improvements for future versions:
- [ ] Bulk edit metadata for multiple images
- [ ] AI-generated alt text suggestions
- [ ] Character counter for alt text
- [ ] Caption field for image captions
- [ ] Copyright/credit information
- [ ] Focal point selection for cropping
- [ ] Tags/keywords for better organization

## Version History

**v1.0.2** - Initial release of media metadata management
- Added title and alt_text fields
- Created edit modal interface
- Added database migration scripts

