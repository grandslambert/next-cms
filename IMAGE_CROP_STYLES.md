# Image Crop Styles

## Overview

The CMS supports multiple crop/fit styles for image resizing, giving you precise control over how images are resized.

## Available Crop Styles

### 1. **Fit Inside** (Default for Medium & Large)
- **Behavior**: Resize to fit within dimensions, maintain aspect ratio
- **Cropping**: None - entire image visible
- **Dimensions**: May be smaller than specified if aspect ratio doesn't match
- **Best For**: Content images, blog posts, general use
- **Sharp Option**: `fit: 'inside'`

**Example:**
```
Original: 3000×2000px
Size: 300×300px, Fit Inside
Result: 300×200px (maintains 3:2 ratio)
```

### 2. **Cover** (Default for Thumbnails)
- **Behavior**: Fill the entire area, crop excess
- **Cropping**: Yes - crops to exact dimensions
- **Dimensions**: Exactly as specified
- **Best For**: Thumbnails, grid layouts, avatars, category icons
- **Sharp Option**: `fit: 'cover'`

**Example:**
```
Original: 3000×2000px
Size: 150×150px, Cover
Result: 150×150px (crops sides to make square)
```

### 3. **Contain**
- **Behavior**: Fit entire image within dimensions
- **Cropping**: None
- **Dimensions**: Exactly as specified (may add letterboxing/pillarboxing)
- **Best For**: Product images, logos where full image must be visible
- **Sharp Option**: `fit: 'contain'`

**Example:**
```
Original: 3000×2000px
Size: 300×300px, Contain
Result: 300×300px with black bars top/bottom
```

### 4. **Fill** (Stretch)
- **Behavior**: Stretch to exact dimensions
- **Cropping**: None
- **Dimensions**: Exactly as specified
- **Best For**: Rarely used (distorts image)
- **Sharp Option**: `fit: 'fill'`

**Example:**
```
Original: 3000×2000px
Size: 300×300px, Fill
Result: 300×300px (image stretched/squished)
```

## Visual Comparison

**Original Image: 400×200px (2:1 ratio)**

Target: 200×200px

| Style | Result | Description |
|-------|--------|-------------|
| **Inside** | 200×100px | Fits inside, maintains ratio |
| **Cover** | 200×200px | Crops 100px from sides |
| **Contain** | 200×200px | Adds 50px bars top/bottom |
| **Fill** | 200×200px | Squishes vertically |

## Configuration

### In Admin UI

**Settings → Media:**

Each image size has a dropdown:
```
Thumbnail: 150×150px [Cover ▼]
  ├─ Fit Inside (no crop)
  ├─ Cover (crop to fill) ✓
  ├─ Contain (fit, add padding)
  └─ Fill (stretch)
```

### Database Storage

```json
{
  "thumbnail": {
    "width": 150,
    "height": 150,
    "crop": "cover"
  },
  "medium": {
    "width": 300,
    "height": 300,
    "crop": "inside"
  },
  "hero": {
    "width": 1920,
    "height": 1080,
    "crop": "cover"
  }
}
```

### Sharp Implementation

```typescript
const cropStyle = dimensions.crop || 'inside';

await sharp(buffer)
  .resize(width, height, {
    fit: cropStyle,  // 'inside' | 'cover' | 'contain' | 'fill'
    withoutEnlargement: cropStyle === 'inside',
    position: 'centre',  // Center the crop
  })
  .toBuffer();
```

## Use Cases

### Thumbnails & Grid Items
**Recommended: Cover**
- Ensures all thumbnails are same size
- Creates uniform grid
- Looks professional
- Example: Category icons, post grids

### Featured Images
**Recommended: Inside**
- Shows full image
- No important content cropped
- Maintains original composition
- Example: Blog post headers, hero images

### Logos & Icons
**Recommended: Contain**
- Entire logo visible
- No distortion
- Centered with padding
- Example: Partner logos, brand images

### Banners & Headers
**Recommended: Cover**
- Fills header area perfectly
- Crops edges if needed
- No empty space
- Example: Hero banners, page headers

## Examples

### Square Thumbnails from Landscape Photos

**Settings:**
```json
{
  "thumbnail": {
    "width": 150,
    "height": 150,
    "crop": "cover"
  }
}
```

**Result:**
```
Photo.jpg (3000×2000px)
  ↓
Photo-thumbnail.jpg (150×150px, center cropped)
```

### Responsive Hero Images

**Settings:**
```json
{
  "hero_desktop": {
    "width": 1920,
    "height": 600,
    "crop": "cover"
  },
  "hero_mobile": {
    "width": 768,
    "height": 400,
    "crop": "cover"
  }
}
```

**Usage:**
```tsx
<picture>
  <source media="(min-width: 768px)" srcSet={heroDesktop} />
  <img src={heroMobile} alt="Hero" />
</picture>
```

### Product Images (No Crop)

**Settings:**
```json
{
  "product": {
    "width": 500,
    "height": 500,
    "crop": "contain"
  }
}
```

**Result:**
- Full product visible
- White/transparent padding if needed
- No important details lost

## Technical Details

### Sharp Fit Options

From Sharp documentation:

- **inside**: Resize to fit within dimensions, maintain aspect ratio
- **cover**: Crop to cover both dimensions
- **contain**: Embed within dimensions (letterbox if needed)
- **fill**: Ignore aspect ratio, stretch to dimensions
- **outside**: Resize to cover, maintain aspect ratio (larger than dimensions)

### Position Options

For cropping (cover mode), you can specify position:
- `centre` (default) - Center crop
- `top`, `bottom`, `left`, `right`
- `entropy` - Intelligent crop focusing on detail
- `attention` - Focus on regions with facial features

Currently using: `centre`

### Performance

All crop styles have similar performance - Sharp is very fast.

## WordPress Comparison

| WordPress | Next CMS | Sharp |
|-----------|----------|-------|
| Hard Crop | Cover | cover |
| Soft Crop | Fit Inside | inside |
| - | Contain | contain |
| - | Fill | fill |

Next CMS offers more flexibility than WordPress!

## Best Practices

### General Guidelines

1. **Thumbnails**: Use `cover` for uniform grids
2. **Content Images**: Use `inside` to preserve composition
3. **Logos**: Use `contain` to ensure full visibility
4. **Backgrounds**: Use `cover` to fill space
5. **Avoid `fill`**: Only use if you want distortion

### Dimension Guidelines

**For cover (cropping):**
- Use common aspect ratios (16:9, 4:3, 1:1)
- Center important content in original images
- Allow ~10% safe margin on edges

**For inside (no crop):**
- Dimensions are maximums
- Actual size depends on original aspect ratio
- Use when exact dimensions not critical

### Example Configurations

**Blog/Magazine Style:**
```json
{
  "thumbnail": {"width": 300, "height": 200, "crop": "cover"},  // 3:2
  "featured": {"width": 1200, "height": 600, "crop": "cover"},   // 2:1
  "content": {"width": 800, "height": 800, "crop": "inside"}
}
```

**E-commerce Style:**
```json
{
  "thumbnail": {"width": 150, "height": 150, "crop": "contain"},
  "product": {"width": 800, "height": 800, "crop": "contain"},
  "zoom": {"width": 2000, "height": 2000, "crop": "inside"}
}
```

**Portfolio Style:**
```json
{
  "thumbnail": {"width": 400, "height": 300, "crop": "cover"},
  "gallery": {"width": 1200, "height": 900, "crop": "inside"},
  "full": {"width": 3000, "height": 3000, "crop": "inside"}
}
```

## Updating Existing Sizes

Via Settings → Media:
1. Find the size you want to change
2. Change the "Crop" dropdown
3. Click "Save Media Settings"
4. New uploads will use the new crop style
5. Old images remain unchanged

## Testing Crop Styles

1. **Upload a landscape photo** (e.g., 3000×2000px)
2. **Check different sizes:**
   - Thumbnail (cover) - Should be perfectly square, cropped
   - Medium (inside) - Should fit within 300×300, not square
   - Large (inside) - Should fit within 1024×1024

3. **Upload a portrait photo** (e.g., 2000×3000px)
4. **Compare results** - See how crop styles handle different orientations

## Common Scenarios

### Scenario 1: Square Thumbnails from Any Photo
```json
{"thumbnail": {"width": 150, "height": 150, "crop": "cover"}}
```
Result: Always 150×150px, center-cropped

### Scenario 2: Flexible Content Images
```json
{"content": {"width": 800, "height": 600, "crop": "inside"}}
```
Result: Fits within bounds, maintains aspect ratio

### Scenario 3: Exact Hero Banner
```json
{"hero": {"width": 1920, "height": 400, "crop": "cover"}}
```
Result: Exactly 1920×400px, crops top/bottom or sides

## Migration Notes

- Old uploads without crop settings default to `'inside'`
- Updating crop style doesn't regenerate existing images
- To regenerate: Delete and re-upload (or run migration script)

---

**With crop styles, you have WordPress-level control over image processing!** ✂️🖼️

