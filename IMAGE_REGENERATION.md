# Image Size Regeneration

## Overview

When you change image size settings in **Settings → Media**, those changes only apply to newly uploaded images. The Image Regeneration feature allows you to apply updated size settings to all existing images in your media library.

## When to Use

Regenerate image sizes when you:
- **Change image dimensions** (width/height) for existing sizes
- **Update crop styles** (cover, inside, contain, fill)
- **Add new custom sizes** and want them for existing images
- **Remove sizes** and want to clean up old files
- **Fix corrupted** or missing image variants

## How to Regenerate Images

### Method 1: Regenerate All Images (Media Library)

1. Go to **Media Library** (`/admin/media`)
2. Click the **🔄 Regenerate All** button in the top right
3. Confirm the action
4. Wait for the process to complete
5. You'll see a success message with the count of regenerated images

**Best for:** Applying changes across your entire library

### Method 2: Regenerate All Images (Media Settings)

1. Go to **Settings → Media** (`/admin/settings/media`)
2. Update your image size settings
3. Click **Save Media Settings**
4. Click the **🔄 Regenerate All Images** button in the blue note box
5. Confirm the action
6. Wait for completion

**Best for:** Immediately applying new settings after changing them

### Method 3: Regenerate Single Image

1. Go to **Media Library** (`/admin/media`)
2. Click the **✏️ Edit** button on any image
3. In the modal, click **🔄 Regenerate Sizes** (bottom left)
4. Confirm the action
5. The modal will close automatically when done

**Best for:** Testing new settings on one image or fixing a specific image

## What Happens During Regeneration

The system:

1. **Loads the original image** from your media library
2. **Deletes old size variant files** (thumbnail, medium, large, custom sizes)
3. **Reads current size settings** from the database
4. **Generates new timestamp** for cache busting (ensures browsers fetch fresh images)
5. **Creates new size variants** for each configured size:
   - thumbnail
   - medium
   - large
   - any custom sizes you've created
6. **Applies crop styles** (cover, inside, contain, fill)
7. **Renames original file** with new timestamp
8. **Deletes old original file** after new one is created
9. **Updates the database** with new URLs and filenames
10. **Frees up disk space** by removing old files

## Performance Considerations

### Processing Time

- **Single image:** ~1-2 seconds
- **10 images:** ~10-20 seconds
- **100 images:** ~1-3 minutes
- **1000+ images:** ~10-30 minutes

*Times vary based on:*
- Image file sizes
- Number of size variants
- Server processing power
- Crop style complexity

### Best Practices

✅ **DO:**
- Save your settings before regenerating
- Regenerate during low-traffic periods for large libraries
- Test on a single image first
- Keep the browser tab open during regeneration
- Ensure adequate server disk space

❌ **DON'T:**
- Close the browser during regeneration
- Run multiple regenerations simultaneously
- Regenerate unnecessarily (it uses server resources)
- Regenerate if no settings have changed

## API Endpoint

### Regenerate Image Sizes

```
POST /api/media/regenerate
```

**Request Body:**
```json
{
  "mediaId": 123  // Or null to regenerate all images
}
```

**Response:**
```json
{
  "message": "Regenerated 45 image(s)",
  "success": 45,
  "failed": 0,
  "errors": [],
  "total": 45
}
```

**Error Response:**
```json
{
  "success": 40,
  "failed": 5,
  "errors": [
    "sunset.jpg: File not found",
    "portrait.png: Invalid image format"
  ],
  "total": 45
}
```

## Current Image Sizes

Your configured sizes will be used for regeneration:

```javascript
{
  "thumbnail": { width: 150, height: 150, crop: "cover" },
  "medium": { width: 300, height: 300, crop: "inside" },
  "large": { width: 1024, height: 1024, crop: "inside" },
  "hero": { width: 1920, height: 600, crop: "cover" }  // Example custom size
}
```

## Crop Styles Explained

When regenerating, each size uses its configured crop style:

- **cover**: Fills exact dimensions, crops excess (recommended for thumbnails)
- **inside**: Fits within dimensions, maintains aspect ratio (recommended for content images)
- **contain**: Fits entire image, adds letterboxing if needed
- **fill**: Stretches to exact dimensions (may distort)

## File Structure

### Before Regeneration:
```
/public/uploads/
  2025/
    10/
      sunset-1234567890.jpg           ← Full size (original)
      sunset-1234567890-thumbnail.jpg  ← 150x150
      sunset-1234567890-medium.jpg     ← 300x300
      sunset-1234567890-large.jpg      ← 1024x1024
```

### After Regeneration:
```
/public/uploads/
  2025/
    10/
      sunset-1760549999999.jpg           ← Full size (NEW timestamp)
      sunset-1760549999999-thumbnail.jpg  ← 150x150 (NEW)
      sunset-1760549999999-medium.jpg     ← 300x300 (NEW)
      sunset-1760549999999-large.jpg      ← 1024x1024 (NEW)
      sunset-1760549999999-hero.jpg       ← 1920x600 (NEW custom size)
```

**Note:** Old files with timestamp `1234567890` are automatically deleted.

## Windows File Locking

On Windows systems, file locking can prevent immediate deletion of old files. The system handles this automatically:

1. Old files are renamed to `.old` extension
2. The system attempts to delete them
3. If deletion fails (file still locked), they're left as `.old`
4. On the next regeneration, all `.old` files are automatically cleaned up

**You might see temporary `.old` files in your uploads folder** - this is normal and they'll be removed automatically.

## Troubleshooting

### "Failed to regenerate images"

**Possible causes:**
- Original image files were deleted
- Insufficient disk space
- File permission issues
- Server timeout (for very large libraries)

**Solutions:**
1. Check server disk space
2. Verify file permissions on `/public/uploads/`
3. Regenerate in smaller batches (single images or categories)
4. Check server error logs

### Images look distorted

**Cause:** Wrong crop style for the image type

**Solution:**
1. Go to **Settings → Media**
2. Change the crop style for that size
3. Regenerate the affected images

### Missing size variants

**Cause:** Original file was deleted or moved

**Solution:**
1. Re-upload the original image
2. The system will auto-generate all sizes
3. Or manually regenerate after re-uploading

### "No images found"

**Cause:** No images in the media library or all are non-image files (PDFs, videos)

**Solution:** Only image files can be regenerated. Videos and PDFs are stored as-is.

## Security

- ✅ **Admin-only access:** Only users with admin role can regenerate
- ✅ **Authenticated requests:** Requires valid session
- ✅ **Original preservation:** Original files are never modified
- ✅ **Error handling:** Failed regenerations don't affect other images

## Future Enhancements

Potential improvements for future versions:

- [ ] Background job processing for large libraries
- [ ] Progress bar showing percentage complete
- [ ] Selective regeneration by upload date
- [ ] Selective regeneration by size variant
- [ ] Batch regeneration with queue system
- [ ] Email notification when complete
- [ ] Preview before regenerating
- [ ] Undo regeneration feature

## Version History

**v1.0.2** - Initial release of image regeneration
- Single image regeneration
- Bulk regeneration for all images
- Multiple UI entry points
- Progress feedback
- Error reporting

