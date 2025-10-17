# Content Types Guide

Complete guide to custom post types and taxonomies in Next CMS.

## Table of Contents

1. [Custom Post Types](#custom-post-types)
2. [Taxonomies System](#taxonomies-system)
3. [Combining Post Types and Taxonomies](#combining-post-types-and-taxonomies)

---

## Custom Post Types

### Overview

Custom Post Types allow you to create different content types beyond the default "Posts", similar to WordPress. This feature enables you to organize different kinds of content (portfolios, products, events, testimonials, etc.) with their own management interfaces and capabilities.

### What Are Custom Post Types?

Think of custom post types as **content blueprints**. Each post type can have:
- **Custom name and labels** (Portfolio, Product, Event, etc.)
- **Unique icon** for easy identification
- **Specific features** (title, content, excerpt, featured image)
- **Custom URL structure** (default, year-based, hierarchical)
- **Assigned taxonomies** (categories, tags, custom)
- **Menu position** in the admin sidebar

### Built-in Post Types

Next CMS comes with two built-in post types:

**1. Posts**
- Traditional blog posts
- URL: `/blog/post-slug`
- Non-hierarchical
- Supports all features
- Cannot be deleted

**2. Pages**
- Static pages (About, Contact, etc.)
- URL: `/page-slug` (root level)
- Hierarchical (parent/child relationships)
- No date-based URLs
- Cannot be deleted

### Common Use Cases

| Post Type | Use For | URL Example |
|-----------|---------|-------------|
| Portfolio | Projects, case studies | `/portfolio/web-redesign` |
| Products | E-commerce items | `/products/blue-widget` |
| Events | Conferences, webinars | `/events/2025/annual-conference` |
| Testimonials | Customer reviews | `/testimonials/john-doe` |
| Team | Staff profiles | `/team/jane-smith` |
| Documentation | Help articles | `/docs/getting-started` |

---

## Creating Custom Post Types

### Step-by-Step

1. Navigate to **Content Types → Post Types** in admin
2. Click **+ Add New Post Type**
3. Fill out the form (see fields below)
4. Click **Create Post Type**
5. New post type appears in sidebar

### Configuration Fields

#### Basic Information

**Name** (required)
- Internal identifier (lowercase, underscores only)
- Example: `portfolio`, `product`, `event`
- Cannot be changed after creation
- Must be unique

**Slug**
- URL prefix for this post type
- Example: `portfolio` → items at `/portfolio/item-slug`
- Leave empty for root level (like pages at `/slug`)
- Use lowercase, hyphens only

**Label** (required)
- Plural display name
- Example: "Portfolio Items", "Products", "Events"
- Shown in admin menu and page titles

**Singular Label** (required)
- Singular display name
- Example: "Portfolio Item", "Product", "Event"
- Used in buttons and single item contexts

**Description**
- Optional note about this post type's purpose
- Only visible in admin

**Icon**
- Emoji icon for admin menu
- Example: 📁, 🎨, 📦, 🎫, 👤
- Makes navigation easier

#### Features (Supports)

Control which editing features are available:

- ☑️ **Title** - Main heading field
- ☑️ **Content** - Rich text editor
- ☑️ **Excerpt** - Summary/preview text
- ☑️ **Featured Image** - Main image for the item

Disable unused features to simplify the editor.

#### URL Structure

Choose how URLs are formatted:

**Default** `/slug/post-title` or `/post-title` (root)
- Simple, clean URLs
- Best for: Pages, portfolios, documentation

**Year** `/slug/2025/post-title`
- Includes publication year
- Best for: Annual events, news

**Year/Month** `/slug/2025/10/post-title`
- Includes year and month
- Best for: Blogs, newsletters

**Year/Month/Day** `/slug/2025/10/15/post-title`
- Full date in URL
- Best for: Daily content, press releases

#### Hierarchy

**Hierarchical**
- Enable parent/child relationships
- Like WordPress Pages
- URLs nest: `/parent/child/grandchild`
- Best for: Documentation, site structure

**Non-Hierarchical**
- All items at same level
- Like WordPress Posts
- Flat structure
- Best for: Blog posts, products, events

#### Visibility

**Show in Dashboard**
- Display count card on admin dashboard
- Useful for main content types
- Disable for utility/background types

**Menu Position**
- Controls order in admin sidebar
- Lower numbers appear higher
- Default: 10

---

## Managing Content

### Creating Content

1. Click post type in sidebar (e.g., "Portfolio")
2. Click **+ Add New** button
3. Fill out content fields
4. Select taxonomies (if assigned)
5. Set featured image
6. Choose parent (if hierarchical)
7. Click **Save Draft** or **Publish**

### Editing Content

1. Click post type in sidebar
2. Find item in list
3. Click **Edit** or click title
4. Make changes
5. Click **Update Post**

### Viewing Content

Published items show a **View** link to see the public page.

### Post Status

- **Draft** - Not visible publicly
- **Published** - Live on site
- **Pending** - Awaiting review
- **Scheduled** - Set to publish later
- **Trash** - Deleted items

---

## Deleting Post Types

### Important Notes

- **Cannot delete** built-in types (Posts, Pages)
- **Cannot delete** types with existing content
- Must delete or reassign all content first
- Post type deletion is permanent

### How to Delete

1. Go to **Content Types → Post Types**
2. Click **Delete** on the post type
3. Confirm deletion

---

## Taxonomies System

### Overview

Next CMS includes a complete custom taxonomies system, similar to WordPress. Taxonomies allow you to create custom ways to organize your content beyond traditional categories.

### What Are Taxonomies?

Taxonomies are **classification systems** for organizing content. Think of them as:
- **Categories** - Group related content
- **Tags** - Label content with keywords
- **Custom** - Any organizational system you need

### Built-in Taxonomies

**1. Categories**
- Hierarchical (parent/child relationships)
- For primary content grouping
- Example: Technology → Web Development → JavaScript

**2. Tags**
- Non-hierarchical (flat list)
- For flexible labeling
- Example: tutorial, beginner, advanced

### Common Use Cases

| Taxonomy | Post Type | Purpose |
|----------|-----------|---------|
| Portfolio Categories | Portfolio | Web Design, Branding, Photography |
| Product Categories | Products | Electronics, Clothing, Home |
| Event Types | Events | Conference, Webinar, Workshop |
| Locations | Multiple | North America, Europe, Asia |
| Difficulty | Documentation | Beginner, Intermediate, Advanced |

---

## Creating Custom Taxonomies

### Step-by-Step

1. Navigate to **Content Types → Taxonomies**
2. Click **+ Add New**
3. Fill out the form
4. Assign to post types
5. Click **Create Taxonomy**

### Configuration Fields

**Name** (required)
- Internal identifier (lowercase, underscores)
- Example: `portfolio_category`, `product_type`
- Cannot be changed after creation

**Label** (required)
- Plural display name
- Example: "Portfolio Categories", "Product Types"

**Singular Label** (required)
- Singular display name
- Example: "Portfolio Category", "Product Type"

**Description**
- Optional purpose note
- Only visible in admin

**Hierarchical**
- ☑️ Enabled: Like categories (parent/child)
- ☐ Disabled: Like tags (flat list)

**Show in Admin Menu**
- ☑️ Appears in sidebar for quick access
- ☐ Hidden from sidebar

**Show in Dashboard**
- ☑️ Display count card on dashboard
- ☐ Hidden from dashboard

**Menu Position**
- Controls sidebar order
- Only if "Show in Admin Menu" enabled

---

## Managing Taxonomy Terms

### Creating Terms

**Method 1: From Taxonomy Page**
1. Go to **Taxonomies → [Taxonomy Name]** in sidebar
2. Fill out form on left
3. Add name, slug, description
4. Select parent (if hierarchical)
5. Add image (optional)
6. Click **Add New**

**Method 2: From Post Editor**
1. While editing a post
2. Find taxonomy box in sidebar
3. Type new term name
4. Click **+ Create [Term]**
5. Term created and auto-selected

### Term Fields

**Name** (required)
- Display name
- Example: "Web Design", "JavaScript", "Featured"

**Slug** (required)
- URL-friendly version
- Auto-generated from name
- Example: `web-design`, `javascript`

**Description**
- Optional details about this term
- May display on term archive pages

**Parent** (hierarchical only)
- Create nested categories
- Example: Web Development → JavaScript

**Image**
- Optional term image
- Useful for visual category pages
- Click **Select Image** to choose from media library

### Editing Terms

1. Go to taxonomy page
2. Click **Edit** on a term
3. Form populates with current data
4. Make changes
5. Click **Update**

### Deleting Terms

1. Click **Delete** on a term
2. Confirm deletion
3. Term removed from all posts
4. Posts not deleted, just untagged

---

## Assigning Taxonomies to Post Types

### In Post Type Settings

1. Go to **Content Types → Post Types**
2. Click **Edit** on a post type
3. Scroll to **Taxonomies** section
4. Check taxonomies to assign
5. Click **Update Post Type**

### Multiple Assignments

One taxonomy can be assigned to multiple post types:
- Categories → Posts + Portfolio + Products
- Tags → Posts + Events
- Locations → Events + Team + Products

---

## Combining Post Types and Taxonomies

### Example: Portfolio System

**Post Type: Portfolio**
```
Name: portfolio
Slug: portfolio
Label: Portfolio Items
Icon: 🎨
Hierarchical: No
Features: Title, Content, Excerpt, Featured Image
```

**Taxonomy: Portfolio Categories**
```
Name: portfolio_category
Label: Portfolio Categories
Hierarchical: Yes
Terms: Web Design, Branding, Photography, Print
Assigned to: Portfolio
```

**Taxonomy: Project Tags**
```
Name: project_tag
Label: Project Tags
Hierarchical: No
Terms: responsive, e-commerce, wordpress, custom
Assigned to: Portfolio
```

### Example: Documentation System

**Post Type: Documentation**
```
Name: docs
Slug: docs
Label: Documentation
Icon: 📚
Hierarchical: Yes (for nested docs)
Features: Title, Content
```

**Taxonomy: Doc Categories**
```
Name: doc_category
Label: Doc Categories
Hierarchical: Yes
Terms: Getting Started, User Guide, API Reference
Assigned to: Documentation
```

**Taxonomy: Difficulty**
```
Name: difficulty
Label: Difficulty Levels
Hierarchical: No
Terms: Beginner, Intermediate, Advanced
Assigned to: Documentation
```

---

## Using Taxonomies in Posts

### Selecting Terms

1. Open post editor
2. Find taxonomy boxes in right sidebar
3. Check terms to assign
4. Multiple selection allowed

### Creating Terms Inline

1. Type new term name in taxonomy box
2. Click **+ Create [Term Name]**
3. Term created and selected automatically
4. Available for all posts going forward

### Hierarchical Taxonomies

For hierarchical taxonomies (like categories):
- Parent terms act as containers
- Child terms appear indented below
- Selecting child auto-includes parent context
- Can select multiple from same branch

### Non-Hierarchical Taxonomies

For flat taxonomies (like tags):
- All terms at same level
- No parent/child relationships
- Free-form tagging
- Can select unlimited terms

---

## Public Display

### Taxonomy Archive Pages

Each taxonomy gets an archive page:

**URL Format:** `/{taxonomy}/{term-slug}`

**Example URLs:**
- `/category/web-development`
- `/portfolio-category/branding`
- `/tag/javascript`

**Page Shows:**
- Term name and description
- Term image (if set)
- All posts tagged with this term
- Post excerpts and featured images
- Hierarchical breadcrumbs for categories

### Taxonomy Listings

**URL Format:** `/{taxonomy}`

**Example URLs:**
- `/category` - All categories
- `/tag` - All tags
- `/portfolio-category` - All portfolio categories

**Page Shows:**
- All terms in taxonomy
- Term descriptions
- Post counts per term
- Visual hierarchy (for hierarchical)

---

## Best Practices

### Post Types

1. **Plan your structure** before creating post types
2. **Use clear names** that describe the content
3. **Enable only needed features** to simplify editing
4. **Choose appropriate URL structure** for SEO
5. **Use hierarchical** only when you need nesting
6. **Set logical menu positions** for easy navigation

### Taxonomies

1. **Don't over-taxonomize** - Start simple, add as needed
2. **Use categories** for primary grouping (hierarchical)
3. **Use tags** for flexible labeling (non-hierarchical)
4. **Assign taxonomies** to appropriate post types only
5. **Plan hierarchy** before creating nested categories
6. **Add images** to important category terms
7. **Write descriptions** for better SEO and UX

### Content Organization

1. **One primary category** per post
2. **Multiple tags** for better discoverability
3. **Consistent naming** across similar content
4. **Review and clean** unused terms regularly
5. **Use parent categories** to group related subcategories

---

## Permissions

### Managing Post Types

Requires `manage_post_types` permission:
- Create custom post types
- Edit post type settings
- Delete custom post types
- Assign taxonomies to post types

### Managing Taxonomies

Requires `manage_taxonomies` permission:
- Create custom taxonomies
- Create/edit/delete terms
- Assign terms to posts
- Edit taxonomy settings

### Creating Content

Requires specific post type permission:
- `manage_posts_post` - Edit posts
- `manage_posts_page` - Edit pages
- `manage_posts_[name]` - Edit custom post type

Admins and Editors have these permissions by default.

---

## Technical Notes

### Database Structure

**Post Types:**
- Stored in `post_types` table
- Each post type has unique configuration
- Supports field stored as JSON
- Built-in types have `is_system = 1`

**Taxonomies:**
- Stored in `taxonomies` table
- Terms in `terms` table
- Relationships in `term_relationships` table
- Post type assignments in `post_type_taxonomies` table

### URL Routing

- Post types with slugs: `/{slug}/{post-slug}`
- Root level post types: `/{post-slug}`
- Date-based URLs include year/month/day as needed
- Hierarchical posts nest: `/parent/child/grandchild`

### Limitations

- Post type names must be unique
- Taxonomy names must be unique
- Cannot delete types/taxonomies with content
- Built-in types cannot be deleted or fully modified
- Slugs cannot be changed after creation

