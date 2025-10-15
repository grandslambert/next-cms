# Image Management System

## WordPress-Style Image Handling

The CMS now features a sophisticated image management system similar to WordPress.

## Features

### 📁 Organized Folder Structure

Images are automatically organized by upload date:
```
public/uploads/
├── 2025/
│   ├── 01/
│   │   ├── image-123456789.jpg (full size)
│   │   ├── image-123456789-large.jpg
│   │   ├── image-123456789-medium.jpg
│   │   └── image-123456789-thumbnail.jpg
│   └── 02/
└── 2024/
```

### 📏 Multiple Image Sizes

When you upload an image, 4 sizes are automatically generated:

| Size | Dimensions | Use Case |
|------|------------|----------|
| **Thumbnail** | 150×150px | Category icons, small previews |
| **Medium** | 300×300px | Content images, galleries |
| **Large** | 1024×1024px | Featured images, hero images |
| **Full** | Original | High-quality display, downloads |

**Notes:**
- Images are resized proportionally (not cropped)
- Smaller originals aren't enlarged
- Maintains aspect ratio with `fit: 'inside'`

### 🎯 Smart Size Selection

**Admin Side:**
- Users simply select an image from the media library
- The full/original URL is stored in the database
- No need to choose sizes manually

**Frontend Side:**
- Templates automatically use the appropriate size:
  - **Homepage cards**: Medium (300px)
  - **Blog listing**: Medium (300px)  
  - **Single post/page hero**: Large (1024px)
  - **Category icons**: Thumbnail (150px)
- Falls back to original if sizes not available

### 🖼️ Visual Grid Display

- Grid shows **thumbnail versions** for faster loading
- "Multiple sizes" badge on images with size variants
- Hover to see "Select" button
- Currently selected image highlighted
- One-click selection - no size choice needed

## Technical Details

### Image Processing

**Library:** Sharp (fast Node.js image processing)

**Process:**
1. Upload received as File/Blob
2. Sharp loads image and reads metadata
3. Original saved as "full" size
4. Sharp resizes to thumbnail, medium, large
5. All files saved in date-based folder
6. URLs and dimensions stored in database as JSON

### Database Structure

**media table:**
```sql
id, filename, original_name, mime_type, size, url, sizes (JSON), uploaded_by, created_at
```

**sizes JSON format:**
```json
{
  "thumbnail": {
    "url": "/uploads/2025/01/image-123-thumbnail.jpg",
    "width": 150,
    "height": 150
  },
  "medium": {
    "url": "/uploads/2025/01/image-123-medium.jpg",
    "width": 300,
    "height": 225
  },
  "large": {
    "url": "/uploads/2025/01/image-123-large.jpg",
    "width": 1024,
    "height": 768
  },
  "full": {
    "url": "/uploads/2025/01/image-123.jpg",
    "width": 3000,
    "height": 2000
  }
}
```

### API Response

When uploading an image:
```json
{
  "media": {
    "id": 1,
    "filename": "image-123.jpg",
    "original_name": "vacation.jpg",
    "mime_type": "image/jpeg",
    "size": 1234567,
    "url": "/uploads/2025/01/image-123.jpg",
    "sizes": "{\"thumbnail\":{...},\"medium\":{...},...}",
    "uploaded_by": 1,
    "created_at": "2025-01-15T10:30:00.000Z"
  }
}
```

## Usage Examples

### In Templates

```javascript
// Get media item with sizes
const media = await getMedia(id);
const sizes = JSON.parse(media.sizes);

// Use thumbnail for grid
<img src={sizes.thumbnail.url} alt="..." />

// Use medium for content
<img src={sizes.medium.url} alt="..." />

// Use full for lightbox
<a href={sizes.full.url}>
  <img src={sizes.large.url} alt="..." />
</a>
```

### In Admin Forms

The MediaSelector component automatically:
1. Shows thumbnails in grid
2. Presents size options when image clicked
3. Returns the selected size URL
4. Stores the chosen size in your post/page/category

## File Deletion

When deleting a media item:
- ✅ All sizes are removed from filesystem
- ✅ Database record deleted
- ✅ Orphaned images cleaned up

## Benefits

### Performance
- ✅ **Faster page loads** - Use appropriate size for context
- ✅ **Bandwidth savings** - Don't load full-size for thumbnails
- ✅ **Optimized delivery** - Sharp creates efficient files

### Organization
- ✅ **Date-based folders** - Easy to locate files by date
- ✅ **Clean filenames** - No special characters, timestamped
- ✅ **Scalable structure** - Works for thousands of files

### User Experience
- ✅ **Visual size selection** - See preview before choosing
- ✅ **Dimension display** - Know exact pixel sizes
- ✅ **Flexible options** - Choose best size for use case
- ✅ **Automatic processing** - No manual resizing needed

## Configuration

### Changing Image Sizes

Edit `app/api/media/route.ts`:

```typescript
const IMAGE_SIZES = {
  thumbnail: { width: 150, height: 150 },
  medium: { width: 300, height: 300 },
  large: { width: 1024, height: 1024 },
  full: null, // Original size
  
  // Add custom sizes:
  // hero: { width: 1920, height: 1080 },
  // square: { width: 500, height: 500 },
};
```

### Folder Structure

Change date format by modifying:
```typescript
const year = now.getFullYear().toString();
const month = (now.getMonth() + 1).toString().padStart(2, '0');
const folderPath = `${year}/${month}`;

// For different structure:
// const folderPath = `${year}`;  // Just year
// const folderPath = `${year}-${month}`;  // Year-month
```

## Backwards Compatibility

- ✅ Old uploads without sizes still work
- ✅ Non-image files stored without resizing
- ✅ Graceful handling of missing sizes

## Best Practices

### When to Use Each Size

**Thumbnail (150×150px)**
- Category icons
- User avatars
- Small previews in lists
- Grid thumbnails

**Medium (300×300px)**
- In-content images
- Blog post inline images
- Gallery previews
- Card images

**Large (1024×1024px)**
- Featured images
- Hero images
- Main content images
- Detailed views

**Full (Original)**
- Downloads
- Lightbox full-size view
- Print-quality needs
- When quality matters most

### File Size Recommendations

For best performance:
- Upload high-quality originals (the system will resize)
- Originals should be reasonable size (< 5MB ideal)
- System handles optimization automatically

## Troubleshooting

### Images not resizing

Check:
1. Sharp installed: `npm list sharp`
2. Write permissions on `public/uploads/`
3. Check server logs for Sharp errors

### Missing sizes

If old images don't have sizes:
- They still work (show original)
- Re-upload to generate sizes
- Or run a migration script to process existing

### Folder permissions

Ensure the upload folder is writable:
```bash
chmod -R 755 public/uploads
```

## Future Enhancements

Possible improvements:
- [ ] WebP format conversion
- [ ] Lazy loading integration  
- [ ] Image compression settings
- [ ] Batch regenerate sizes for old images
- [ ] Custom crop tool
- [ ] Image metadata (EXIF) display
- [ ] Alt text management

