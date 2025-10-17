# Media Site-Based Folder Structure

## Overview

The media manager now organizes uploaded files by site to keep each site's media completely separated. This prevents file conflicts and makes it easier to manage media on a per-site basis.

## New Folder Structure

### Before (Single Site)
```
public/
└── uploads/
    └── 2025/
        └── 01/
            ├── image1-123456.jpg
            ├── image2-123457.png
            └── document-123458.pdf
```

### After (Multi-Site)
```
public/
└── uploads/
    ├── site_1/
    │   └── 2025/
    │       └── 01/
    │           ├── image1-123456.jpg
    │           └── image2-123457.png
    └── site_2/
        └── 2025/
            └── 01/
                ├── logo-123458.png
                └── banner-123459.jpg
```

## Path Format

**Full path structure:**
```
/uploads/site_{SITE_ID}/{YEAR}/{MONTH}/{filename}-{timestamp}.{ext}
```

**Examples:**
- Site 1 image: `/uploads/site_1/2025/01/hero-image-1705123456789.jpg`
- Site 2 logo: `/uploads/site_2/2025/01/company-logo-1705123456790.png`
- Site 1 PDF: `/uploads/site_1/2025/02/whitepaper-1707123456791.pdf`

## Benefits

### 1. **Complete Separation**
- Each site's media files are isolated
- No risk of file name conflicts between sites
- Clear organization by site

### 2. **Easy Management**
- Backup media for a specific site only
- Delete all media for a site easily
- Migrate a site's media independently

### 3. **Security**
- Media access can be controlled per-site (future enhancement)
- Easier to implement site-specific storage quotas
- Clear audit trail of which files belong to which site

### 4. **Performance**
- Faster file operations within site folders
- Easier to implement CDN per-site
- Better organization for large installations

## Implementation Details

### Upload Process

When a file is uploaded:

1. **Get Site Context**
   ```typescript
   const siteId = (session.user as any).currentSiteId || 1;
   ```

2. **Create Site Folder**
   ```typescript
   const folderPath = `site_${siteId}/${year}/${month}`;
   const uploadDir = path.join(process.cwd(), 'public', 'uploads', `site_${siteId}`, year, month);
   await mkdir(uploadDir, { recursive: true });
   ```

3. **Save File**
   - File is saved to site-specific folder
   - Database stores full URL: `/uploads/site_1/2025/01/file.jpg`

### File Operations

All file operations read the URL from the database, so they automatically work with the new structure:

#### **Delete**
```typescript
// Reads URL from database
const filepath = path.join(process.cwd(), 'public', media.url);
await unlink(filepath);
```

#### **Regenerate**
```typescript
// Extracts folder path from URL
const urlParts = media.url.split('/');
const folderPath = urlParts.slice(0, -1).join('/').replace('/uploads/', '');
const uploadDir = path.join(process.cwd(), 'public', 'uploads', folderPath);
```

#### **View/Download**
```typescript
// URL is stored with site prefix
<img src={media.url} /> 
// Renders: /uploads/site_1/2025/01/image.jpg
```

## Database Schema

No changes needed! The `media` table already stores the full URL:

```sql
-- Media table (site-prefixed: site_1_media, site_2_media)
CREATE TABLE site_1_media (
  id INT PRIMARY KEY,
  url VARCHAR(500),  -- Stores: /uploads/site_1/2025/01/file.jpg
  filename VARCHAR(255),
  original_name VARCHAR(255),
  -- ... other fields
);
```

## Migration from Old Structure

### For Existing Installations

If you're upgrading from a single-site installation:

#### Option 1: Move Existing Files (Recommended)

```bash
# Create site_1 folder
mkdir -p public/uploads/site_1

# Move all existing uploads to site_1
mv public/uploads/2025 public/uploads/site_1/
mv public/uploads/2024 public/uploads/site_1/
# etc.
```

#### Option 2: Update Database URLs

```sql
-- Update all media URLs to include site_1 prefix
UPDATE site_1_media 
SET url = CONCAT('/uploads/site_1', SUBSTRING(url, 9))
WHERE url LIKE '/uploads/%' AND url NOT LIKE '/uploads/site_%';
```

**Then move the files as in Option 1.**

#### Option 3: Leave Old Files, New Files Use New Structure

- Old files remain at `/uploads/YYYY/MM/`
- New uploads go to `/uploads/site_1/YYYY/MM/`
- Both work fine (URLs are absolute)
- Migrate gradually over time

### For New Installations

No migration needed! Just ensure the uploads folder exists:

```bash
mkdir -p public/uploads
```

Site folders are created automatically on first upload.

## Testing

### Verify Site Separation

1. **Login to Site 1**
   - Upload an image
   - Check file location: `public/uploads/site_1/YYYY/MM/`

2. **Switch to Site 2**
   - Upload an image
   - Check file location: `public/uploads/site_2/YYYY/MM/`

3. **Verify Database**
   ```sql
   -- Site 1 media
   SELECT url FROM site_1_media ORDER BY id DESC LIMIT 5;
   -- Should show: /uploads/site_1/...

   -- Site 2 media
   SELECT url FROM site_2_media ORDER BY id DESC LIMIT 5;
   -- Should show: /uploads/site_2/...
   ```

### Test File Operations

1. **Delete**: Delete a file from site 1, verify it's removed from `site_1` folder
2. **Regenerate**: Regenerate image sizes, verify sizes are in correct site folder
3. **Permanent Delete**: Permanently delete from trash, verify all sizes removed

## Backup Strategy

### Per-Site Backup

```bash
# Backup site 1 media only
tar -czf site1-media-backup.tar.gz public/uploads/site_1/

# Backup site 2 media only
tar -czf site2-media-backup.tar.gz public/uploads/site_2/
```

### Restore Site Media

```bash
# Restore site 1 media
tar -xzf site1-media-backup.tar.gz -C /
```

### Full Backup

```bash
# Backup all sites
tar -czf all-sites-media-backup.tar.gz public/uploads/
```

## Storage Quotas (Future Enhancement)

With this structure, implementing per-site storage quotas is straightforward:

```typescript
// Calculate site storage usage
async function getSiteStorageUsage(siteId: number): Promise<number> {
  const folderPath = path.join(process.cwd(), 'public', 'uploads', `site_${siteId}`);
  // Calculate total size of all files in folder
  return totalBytes;
}

// Check before upload
const usage = await getSiteStorageUsage(siteId);
const quota = await getSiteQuota(siteId); // From settings
if (usage + fileSize > quota) {
  throw new Error('Storage quota exceeded');
}
```

## CDN Integration (Future Enhancement)

Each site can have its own CDN configuration:

```typescript
// Site-specific CDN URLs
const cdnUrls = {
  1: 'https://cdn1.example.com',
  2: 'https://cdn2.example.com',
};

// Serve media from site-specific CDN
const mediaUrl = `${cdnUrls[siteId]}/uploads/site_${siteId}/${year}/${month}/${filename}`;
```

## Files Modified

1. **`app/api/media/route.ts`**
   - Updated upload path to include `site_${siteId}`
   - Folder structure: `site_X/YYYY/MM/`

2. **`CHANGELOG.md`**
   - Documented the change

3. **`MEDIA_SITE_STRUCTURE.md`** (this file)
   - Complete documentation

## Related Files (No Changes Needed)

These files already work with the new structure because they read URLs from the database:

- `app/api/media/[id]/route.ts` - Update/delete media
- `app/api/media/[id]/permanent-delete/route.ts` - Permanent deletion
- `app/api/media/regenerate/route.ts` - Regenerate image sizes
- `app/api/media/[id]/restore/route.ts` - Restore from trash
- All frontend media components - Use URLs from database

## Summary

✅ **Implemented**: Site-based folder structure for media uploads  
✅ **Automatic**: All file operations work without changes  
✅ **Backward Compatible**: Old URLs still work (if not migrated)  
✅ **Future Ready**: Easy to add quotas, CDN, per-site backups  
✅ **Secure**: Complete isolation between sites  

New uploads will automatically be organized by site, keeping each site's media completely separate!

