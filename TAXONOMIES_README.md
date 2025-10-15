# Custom Taxonomies System

## Overview

Next CMS now includes a complete custom taxonomies system, similar to WordPress. This allows you to create custom ways to organize your content beyond the traditional categories.

## Features

### 1. **Built-in Taxonomies**
- **Categories** (Hierarchical): Traditional categories with parent/child relationships
- **Tags** (Flat): Non-hierarchical labels for content

### 2. **Custom Taxonomies**
Create your own taxonomies such as:
- Locations (Hierarchical: Country → State → City)
- Products (Flat: Simple product labels)
- Events (Hierarchical: Event Type → Sub-Type)
- Any other custom organization system

## Database Structure

### Tables
1. **`taxonomies`** - Defines taxonomy types (e.g., "category", "tag", "location")
   - `name`: Unique identifier (slug)
   - `label`: Display name (plural)
   - `singular_label`: Singular display name
   - `hierarchical`: TRUE for parent/child, FALSE for flat
   - `show_in_menu`: Display in admin sidebar
   - `menu_position`: Order in menu

2. **`terms`** - Individual taxonomy items
   - `taxonomy_id`: Which taxonomy this term belongs to
   - `name`: Term name
   - `slug`: URL-friendly identifier
   - `description`: Optional description
   - `image_id`: Optional image
   - `parent_id`: For hierarchical taxonomies
   - `count`: Number of posts using this term

3. **`term_relationships`** - Links posts to terms (many-to-many)
   - `post_id`: The post
   - `term_id`: The term

4. **`post_type_taxonomies`** - Which taxonomies apply to which post types
   - `post_type_id`: The post type
   - `taxonomy_id`: The taxonomy

## Admin Usage

### Creating a Custom Taxonomy

1. Go to **Settings → Taxonomies**
2. Click **+ Add Taxonomy**
3. Fill in:
   - **Name**: Lowercase, alphanumeric (e.g., `location`)
   - **Label**: Plural display name (e.g., `Locations`)
   - **Singular Label**: Singular name (e.g., `Location`)
   - **Description**: Optional explanation
   - **Hierarchical**: Check for parent/child relationships
   - **Show in Menu**: Check to display in sidebar
   - **Menu Position**: Order in admin menu
4. Click **Create Taxonomy**

### Assigning Taxonomies to Post Types

1. Go to **Settings → Post Types**
2. Click **Edit** on a post type
3. Scroll to **Taxonomies** section
4. Check which taxonomies should be available
5. Click **Update Post Type**

### Managing Taxonomy Terms

1. Click on the taxonomy in the sidebar (e.g., **Categories**, **Tags**)
2. Click **+ Add [Taxonomy Name]**
3. Fill in:
   - **Name**: Term name
   - **Description**: Optional
   - **Parent**: (Hierarchical only) Select parent term
   - **Image**: Optional image
4. Click **Create**

### Using Taxonomies in Posts

When editing a post:
1. Available taxonomies appear in the sidebar
2. Select applicable terms
3. For hierarchical taxonomies, you can create nested relationships
4. Save the post

## API Endpoints

### Taxonomies
- `GET /api/taxonomies` - List all taxonomies
- `POST /api/taxonomies` - Create taxonomy
- `GET /api/taxonomies/[id]` - Get taxonomy
- `PUT /api/taxonomies/[id]` - Update taxonomy
- `DELETE /api/taxonomies/[id]` - Delete taxonomy

### Terms
- `GET /api/terms?taxonomy=[name]` - List terms for a taxonomy
- `POST /api/terms` - Create term
- `GET /api/terms/[id]` - Get term
- `PUT /api/terms/[id]` - Update term
- `DELETE /api/terms/[id]` - Delete term

### Post-Term Relationships
- `GET /api/posts/[id]/terms?taxonomy_id=[id]` - Get terms for a post
- `PUT /api/posts/[id]/terms` - Set terms for a post

### Post Type-Taxonomy Relationships
- `GET /api/post-types/[id]/taxonomies` - Get taxonomies for a post type
- `PUT /api/post-types/[id]/taxonomies` - Set taxonomies for a post type

## Technical Notes

### Hierarchical vs. Flat

**Hierarchical (like Categories):**
- Support parent/child relationships
- Use `parent_id` field
- Display with indentation in lists
- Good for: Categories, Locations, Menus

**Flat (like Tags):**
- No parent/child relationships
- Simple, independent labels
- Display as flat list
- Good for: Tags, Keywords, Colors

### Icons

Taxonomies in the sidebar automatically get icons:
- **Hierarchical**: 🏷️ (label icon)
- **Flat**: 🔖 (bookmark icon)

You can customize this in `components/admin/Sidebar.tsx`

### Built-in Protection

The built-in "category" and "tag" taxonomies:
- Cannot be deleted
- Show a "Built-in" badge
- Are assigned to the "post" post type by default

## Examples

### Example: Creating a "Location" Taxonomy

```typescript
// 1. Create taxonomy
POST /api/taxonomies
{
  "name": "location",
  "label": "Locations",
  "singular_label": "Location",
  "description": "Geographic locations",
  "hierarchical": true,
  "show_in_menu": true,
  "menu_position": 17
}

// 2. Create terms
POST /api/terms
{
  "taxonomy_id": 3,
  "name": "USA",
  "parent_id": null
}

POST /api/terms
{
  "taxonomy_id": 3,
  "name": "California",
  "parent_id": 1  // USA's ID
}

// 3. Assign to post type
PUT /api/post-types/1/taxonomies
{
  "taxonomy_ids": [1, 2, 3]  // category, tag, location
}

// 4. Assign terms to post
PUT /api/posts/5/terms
{
  "taxonomy_id": 3,
  "term_ids": [2]  // California
}
```

## Troubleshooting

### Taxonomies not showing in sidebar
- Check `show_in_menu` is TRUE
- Check `menu_position` for ordering
- Refresh the page

### Can't delete taxonomy
- Built-in taxonomies (category, tag) cannot be deleted
- Taxonomies with terms must have all terms deleted first

### Terms not showing for post type
- Verify taxonomy is assigned to post type in Settings → Post Types
- Check that taxonomy exists and is active

## Future Enhancements

Potential additions:
- Taxonomy archives on frontend
- Term search and filtering
- Bulk term assignment
- Term import/export
- Meta fields for terms
- Term ordering/sorting options

