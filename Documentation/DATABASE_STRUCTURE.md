# Database Structure

Next CMS uses a multi-site architecture with global tables shared across all sites and site-specific tables for isolated content.

## Global Tables

These tables are shared across the entire CMS installation:

### `users`
Stores all user accounts across all sites.
- `id` - Primary key
- `username` - Unique username
- `first_name`, `last_name` - User's name
- `email` - Unique email address
- `password` - Bcrypt hashed password
- `role_id` - Reference to roles table
- `created_at`, `updated_at` - Timestamps

### `roles`
Defines permission sets for users.
- `id` - Primary key (0 = Super Admin, 1+ = Regular roles)
- `name` - Internal role name (e.g., 'admin', 'editor')
- `display_name` - Human-readable name
- `description` - Role description
- `permissions` - JSON object with permission flags
- `is_system` - Whether this is a built-in role (cannot be deleted)
- `site_id` - Site ID for site-specific roles (NULL = global/system role)
- `created_at`, `updated_at` - Timestamps
- **Note:** System roles (site_id = NULL) can be customized per site using `site_role_overrides`

### `site_role_overrides`
Stores site-specific permission customizations for system roles.
- `id` - Primary key
- `site_id` - Reference to sites table
- `role_id` - Reference to roles table (system roles only)
- `permissions` - JSON object with site-specific permission overrides
- `created_at`, `updated_at` - Timestamps
- **Unique constraint:** (`site_id`, `role_id`)
- **Purpose:** Allows sites to customize system roles (Admin, Editor, Author, Guest) without affecting other sites

### `sites`
Stores site configurations.
- `id` - Primary key
- `name` - Internal site name (used for table prefix)
- `display_name` - Human-readable site name
- `domain` - Optional domain for the site
- `description` - Site description
- `is_active` - Whether the site is active
- `created_at`, `updated_at` - Timestamps

### `site_users`
Maps users to sites with specific roles.
- `id` - Primary key
- `site_id` - Reference to sites table
- `user_id` - Reference to users table
- `role_id` - Role for this user on this site
- `created_at` - Timestamp
- **Unique constraint:** (`site_id`, `user_id`)

### `user_meta`
Stores user preferences and metadata.
- `id` - Primary key
- `user_id` - Reference to users table
- `meta_key` - Metadata key
- `meta_value` - Metadata value (TEXT)
- `created_at`, `updated_at` - Timestamps
- **Unique constraint:** (`user_id`, `meta_key`)

### `activity_log`
Global audit trail of all system activities.
- `id` - Primary key
- `user_id` - Reference to users table
- `action` - Action performed (e.g., 'post_created')
- `entity_type` - Type of entity (e.g., 'post', 'user')
- `entity_id` - ID of the entity
- `entity_name` - Name of the entity
- `details` - Additional details (TEXT)
- `changes_before`, `changes_after` - JSON snapshots
- `ip_address` - User's IP address
- `user_agent` - User's browser/client
- `site_id` - Associated site (NULL for global actions)
- `created_at` - Timestamp

### `global_settings`
System-wide settings (Super Admin only).
- `id` - Primary key
- `setting_key` - Unique setting key
- `setting_value` - Setting value (TEXT)
- `setting_type` - Type of setting ('string', 'boolean', 'json')
- `description` - Setting description
- `created_at`, `updated_at` - Timestamps

## Site-Specific Tables

Each site gets its own set of tables with the prefix `site_{id}_`. For example, Site 1 has:

### `site_1_posts`
Stores all content for the site.
- `id` - Primary key
- `post_type_id` - Reference to post types
- `title` - Post title
- `slug` - URL-friendly slug
- `content` - Post content (LONGTEXT)
- `excerpt` - Short excerpt
- `author_id` - Reference to users table (global)
- `status` - Post status ('draft', 'published', 'scheduled')
- `featured_image_id` - Reference to media
- `parent_id` - For hierarchical content
- `menu_order` - For custom ordering
- `scheduled_publish_at` - For scheduled publishing
- `published_at` - Publication timestamp
- `created_at`, `updated_at` - Timestamps

### `site_1_post_meta`
Custom fields for posts.
- `id` - Primary key
- `post_id` - Reference to posts
- `meta_key` - Field key
- `meta_value` - Field value (LONGTEXT)
- `created_at`, `updated_at` - Timestamps

### `site_1_post_revisions`
Version history for posts.
- `id` - Primary key
- `post_id` - Reference to posts
- `title`, `content`, `excerpt` - Snapshot of content
- `author_id` - Who made the revision
- `created_at` - When the revision was created

### `site_1_media`
Uploaded files and images.
- `id` - Primary key
- `folder_id` - Reference to media folders
- `filename` - Original filename
- `filepath` - Path on disk
- `url` - Public URL
- `mime_type` - File MIME type
- `file_size` - Size in bytes
- `width`, `height` - Image dimensions
- `alt_text` - Alternative text for accessibility
- `caption` - Image caption
- `author_id` - Who uploaded it
- `is_trashed` - Soft delete flag
- `created_at`, `updated_at` - Timestamps

### `site_1_media_folders`
Folder structure for media organization.
- `id` - Primary key
- `name` - Folder name
- `parent_id` - Reference to parent folder
- `created_at`, `updated_at` - Timestamps

### `site_1_post_types`
Defines content types (posts, pages, etc.).
- `id` - Primary key
- `name` - Internal name
- `slug` - URL slug
- `label`, `singular_label` - Display names
- `description` - Type description
- `icon` - Emoji icon
- `url_structure` - URL pattern ('default', 'hierarchical')
- `supports` - JSON object (title, content, excerpt, etc.)
- `show_in_dashboard` - Visibility flag
- `hierarchical` - Whether content can have parents
- `menu_position` - Sort order in menu
- `created_at`, `updated_at` - Timestamps

### `site_1_taxonomies`
Defines classification systems (categories, tags).
- `id` - Primary key
- `name` - Internal name
- `label`, `singular_label` - Display names
- `description` - Taxonomy description
- `hierarchical` - Whether terms can have parents
- `show_in_menu` - Visibility flag
- `menu_position` - Sort order
- `created_at`, `updated_at` - Timestamps

### `site_1_terms`
Individual taxonomy terms.
- `id` - Primary key
- `taxonomy_id` - Reference to taxonomies
- `name` - Term name
- `slug` - URL-friendly slug
- `description` - Term description
- `parent_id` - For hierarchical taxonomies
- `created_at`, `updated_at` - Timestamps

### `site_1_post_terms`
Maps posts to taxonomy terms.
- `id` - Primary key
- `post_id` - Reference to posts
- `term_id` - Reference to terms
- **Unique constraint:** (`post_id`, `term_id`)

### `site_1_post_type_taxonomies`
Maps taxonomies to post types.
- `id` - Primary key
- `post_type_id` - Reference to post types
- `taxonomy_id` - Reference to taxonomies
- **Unique constraint:** (`post_type_id`, `taxonomy_id`)

### `site_1_menus`
Navigation menu definitions.
- `id` - Primary key
- `name` - Internal name
- `label` - Display name
- `location` - Menu location reference
- `created_at`, `updated_at` - Timestamps

### `site_1_menu_items`
Individual menu items.
- `id` - Primary key
- `menu_id` - Reference to menus
- `parent_id` - For nested menus
- `label` - Display text
- `type` - Item type ('post', 'page', 'taxonomy', 'custom')
- `object_id` - Reference to linked content
- `url` - For custom links
- `css_classes` - Custom CSS classes
- `target` - Link target ('_self', '_blank')
- `sort_order` - Display order
- `created_at`, `updated_at` - Timestamps

### `site_1_menu_locations`
Available menu locations.
- `id` - Primary key
- `name` - Location name (e.g., 'header', 'footer')
- `description` - Location description
- `is_builtin` - Whether this is a system location
- `created_at`, `updated_at` - Timestamps

### `site_1_settings`
Site-specific configuration.
- `id` - Primary key
- `setting_key` - Unique setting key
- `setting_value` - Setting value (TEXT)
- `setting_type` - Type ('string', 'number', 'boolean', 'json')
- `created_at`, `updated_at` - Timestamps

## Creating New Sites

When a new site is created:

1. An entry is added to the `sites` table
2. All site-specific tables are created with the prefix `site_{id}_`
3. Default post types (Post, Page) are created
4. Default taxonomies (Category, Tag) are created
5. Default menu locations are created
6. Default settings are populated

The template for new site tables is in `database/site-tables-template.sql`.

## Database Schema Files

- **`schema.sql`** - Complete schema for fresh installations (includes Site 1)
- **`site-tables-template.sql`** - Template for creating additional sites

## Notes

- All tables use `utf8mb4` character set for full Unicode support
- Timestamps use MySQL's `TIMESTAMP` type with automatic updates
- Foreign keys ensure referential integrity
- Indexes optimize common queries
- Activity log uses `site_id` for filtering but remains a global table

