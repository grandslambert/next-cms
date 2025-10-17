# Media Management Guide

Complete guide to managing media files, images, and uploads in Next CMS.

## Table of Contents

1. [Image System Overview](#image-system-overview)
2. [Uploading Media](#uploading-media)
3. [Image Sizes & Crop Styles](#image-sizes--crop-styles)
4. [Media Metadata](#media-metadata)
5. [Image Regeneration](#image-regeneration)
6. [Media Deletion Safety](#media-deletion-safety)
7. [Folder Organization](#folder-organization)

---

## Image System Overview

Next CMS features a WordPress-style image management system with automatic resizing and intelligent processing.

### Key Features

- **Automatic image resizing** - Multiple sizes generated on upload
- **Smart folder organization** - Date-based and site-specific structure
- **Metadata support** - Titles and alt text for accessibility
- **Crop style options** - Multiple resize behaviors per image size
- **Usage tracking** - See where images are used before deletion
- **Regeneration** - Apply new size settings to existing images

### Folder Structure

Media files are organized by site and date:

```
/public/uploads/
  └── site_1/
      └── 2025/
          └── 10/
              ├── image.jpg (original)
              ├── image-thumbnail.jpg (150×150)
              ├── image-medium.jpg (300×300)
              └── image-large.jpg (1024×1024)
```

---

## Uploading Media

### How to Upload

1. Navigate to **Media** in the admin sidebar
2. Click the **Upload Files** button or drag files to the upload area
3. Select one or multiple files
4. Watch real-time progress bars for each file
5. Uploaded files appear in the current folder

### Upload Features

- **Multiple file upload** - Select and upload many files at once
- **Progress tracking** - Individual progress bars per file
- **Automatic resizing** - All configured sizes generated automatically
- **Folder context** - Files upload to currently selected folder
- **Visual feedback** - Success/error indicators for each upload

### Supported Formats

- JPEG/JPG
- PNG
- GIF
- WebP

---

## Image Sizes & Crop Styles

### Default Image Sizes

Next CMS generates multiple sizes for each uploaded image:

| Size | Default Dimensions | Crop Style |
|------|-------------------|------------|
| Thumbnail | 150×150px | Cover |
| Medium | 300×300px | Inside |
| Large | 1024×1024px | Inside |
| Full | Original dimensions | N/A |

### Configuring Image Sizes

1. Go to **Settings → Media**
2. Modify existing sizes or add custom sizes
3. Set dimensions (width and height)
4. Choose crop style for each size
5. Click **Save Settings**

### Custom Image Sizes

Add unlimited custom sizes for your theme:

1. In **Settings → Media**, scroll to **Add Custom Size**
2. Enter size name (e.g., "hero", "card", "sidebar")
3. Set width and height in pixels
4. Select crop style
5. Click **Add Size**

Custom sizes appear alongside default sizes in the media selector.

### Available Crop Styles

#### 1. **Cover** (Best for: thumbnails, avatars, cards)
- Crops image to exactly fill dimensions
- Maintains aspect ratio
- Centers the crop
- No empty space
- **Use when:** You need exact dimensions and don't mind cropping

**Example:** 400×300 source → 200×200 cover
- Crops center portion to fill square

#### 2. **Inside** (Best for: galleries, content images)
- Fits entire image within dimensions
- Maintains aspect ratio
- No cropping
- May have empty space on one axis
- **Use when:** You want to show the entire image

**Example:** 400×300 source → 200×200 inside
- Result: 200×150 (fits width, shorter on height)

#### 3. **Contain** (Best for: logos, products with backgrounds)
- Fits image within dimensions
- Adds padding/letterboxing if needed
- No cropping
- Always exact output dimensions
- **Use when:** You need exact dimensions with no cropping

**Example:** 400×300 source → 200×200 contain
- Result: 200×200 with top/bottom padding

#### 4. **Fill** (Best for: backgrounds, full-width images)
- Stretches image to fill dimensions
- Does not maintain aspect ratio
- No cropping
- May distort image
- **Use when:** Distortion is acceptable

**Example:** 400×300 source → 200×200 fill
- Result: 200×200 stretched square

### Choosing the Right Crop Style

```
Need exact dimensions?
├─ YES: Use Cover or Contain
│   ├─ Okay to crop? → Cover
│   └─ Show full image? → Contain
│
└─ NO: Use Inside
    └─ Flexible dimensions, no cropping
```

---

## Media Metadata

### Title Field

The title provides a descriptive name for your media files.

**Purpose:**
- Helps organize media library
- Used in image searches
- Displayed in media grid
- Better than filename for identification

**How to add:**
1. Click **Edit** on any media item
2. Enter title in the **Title** field
3. Click **Save Changes**

### Alt Text

Alternative text describes images for accessibility and SEO.

**Purpose:**
- Screen readers use it for visually impaired users
- Displays when images fail to load
- Improves SEO rankings
- Required for accessibility compliance

**Best practices:**
- Be descriptive but concise
- Describe what's in the image
- Don't start with "Image of..." (implied)
- Skip for decorative images

**Examples:**
- ❌ Bad: "image123.jpg"
- ❌ Bad: "Image of a dog"
- ✅ Good: "Golden retriever playing fetch in park"

**How to add:**
1. Click **Edit** on any media item
2. Enter description in the **Alt Text** field
3. Click **Save Changes**

### Editing Media Details

The media editor modal shows:
- Image preview
- Title field
- Alt text field
- File information (name, size, dimensions, upload date)
- **Regenerate Sizes** button
- Usage information (if image is used anywhere)

---

## Image Regeneration

### Overview

When you change image size settings, those changes only apply to newly uploaded images. The regeneration feature applies updated settings to all existing images.

### When to Regenerate

Regenerate image sizes when you:
- **Change dimensions** for existing sizes
- **Change crop styles** for existing sizes
- **Add new custom sizes** you want for old images
- **Fix corrupted** image variants
- **Apply new settings** to entire media library

### How to Regenerate

#### Regenerate Single Image

1. Click **Edit** on a media item
2. Click **Regenerate Sizes** button
3. Wait for confirmation message
4. All size variants updated

#### Regenerate All Images

**Option 1: From Media Library**
1. Go to **Media** in admin
2. Click **Regenerate All Images** button (top right)
3. Confirm the action
4. Wait for completion message

**Option 2: From Settings**
1. Go to **Settings → Media**
2. Scroll to bottom
3. Click **Regenerate All Images**
4. Confirm and wait for completion

### What Happens During Regeneration

1. **Reads current settings** from database
2. **Deletes old size files** (except original)
3. **Generates new sizes** using updated settings
4. **Applies new crop styles** and dimensions
5. **Updates timestamps** for cache busting
6. **Cleans up temporary files** automatically

### Technical Details

- Original images are never modified
- Old size variants are deleted before regeneration
- New files have updated timestamps (browser cache refresh)
- Temporary `.old` files auto-cleaned (Windows compatibility)
- Process handles locked files gracefully

### Performance Notes

- Large libraries may take several minutes
- Process happens in background
- Page shows progress/completion message
- Safe to regenerate multiple times
- Only affects image files (not videos/documents)

---

## Media Deletion Safety

### Overview

Next CMS prevents accidental data loss by checking where images are used before deletion.

### How It Works

When you try to delete a media file:

1. **System checks usage** across all content
2. **Shows warning dialog** if image is used
3. **Lists all locations** where image appears
4. **Requires confirmation** to proceed
5. **Clears references** automatically on deletion

### What's Checked

The system searches for image usage in:
- **Post featured images**
- **Post content** (embedded images)
- **Page featured images**
- **Taxonomy term images** (category images, etc.)
- **Custom post types**

### Warning Dialog

If an image is used, you'll see:

```
⚠️ This image is currently in use:

Posts:
- "My Blog Post" (Featured Image)
- "Another Post" (Content)

Categories:
- "Technology" (Term Image)

Are you sure you want to delete it?
Removing this image will clear it from these locations.
```

### After Deletion

When you proceed with deletion:
- Image files deleted from server
- Database references automatically set to NULL
- No broken image links remain
- Success message shows cleared locations

### Best Practices

1. **Review usage** before deleting
2. **Replace images** in posts first if needed
3. **Check content** after deletion
4. **Use media library search** to find similar alternatives

### Database Safety

The system uses **foreign key constraints** with **SET NULL** behavior:
- `featured_image_id` fields automatically cleared
- No orphaned references remain
- Data integrity maintained
- No broken relationships

---

## Folder Organization

### Creating Folders

1. Go to **Media**
2. Click **New Folder** button
3. Enter folder name
4. Click **Create**

### Folder Features

- **Hierarchical structure** - Create subfolders
- **Breadcrumb navigation** - See current path
- **File counts** - See number of items per folder
- **Drag and drop** - Move files into folders
- **Visual distinction** - Folders appear before files

### Moving Files

**Method 1: Drag and Drop**
1. Click and hold a media item
2. Drag over a folder
3. Release to drop
4. File moves to folder

**Method 2: Bulk Move**
1. Select multiple files (checkboxes)
2. Choose **Bulk Actions → Move to Folder**
3. Select destination folder
4. Click **Move**

### Folder Management

- **Rename** - Click folder actions, edit name
- **Delete** - Only empty folders can be deleted
- **Navigate** - Click folder to view contents
- **Upload** - Files upload to current folder

---

## Tips & Best Practices

### Image Optimization

1. **Use appropriate formats**
   - JPEG for photos
   - PNG for graphics with transparency
   - WebP for modern browsers (best compression)

2. **Optimize before upload**
   - Don't upload 10MB images
   - Resize to reasonable dimensions first
   - Use image optimization tools

3. **Choose right crop style**
   - Thumbnails: Cover (exact squares)
   - Content: Inside (preserve aspect ratio)
   - Logos: Contain (no cropping)

### Organization

1. **Use folders** - Organize by project, date, or type
2. **Add metadata** - Always fill title and alt text
3. **Delete unused** - Regularly clean up old media
4. **Consistent naming** - Use clear, descriptive filenames

### Accessibility

1. **Always add alt text** for content images
2. **Skip alt text** for decorative images
3. **Be descriptive** in your descriptions
4. **Test with screen readers** if possible

### Performance

1. **Regenerate sparingly** - Only when needed
2. **Use appropriate sizes** - Don't use "Full" for thumbnails
3. **Clean old files** - Remove unused media regularly
4. **Monitor disk space** - Large libraries use significant storage

