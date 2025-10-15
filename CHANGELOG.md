# Changelog

All notable changes to Next CMS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2025-10-15

### Added
- **Pending Review Status and Publishing Workflow**
  - New `pending` status for posts awaiting review
  - `can_publish` permission controls who can publish posts directly
  - Users without `can_publish` see "Submit for Review" button instead of "Publish"
  - Submitted posts appear with blue "Pending Review" badge in lists
  - Admins and Editors can publish by default; can be customized per role
  - Authors can submit for review, requiring approval from publisher
- **Granular Delete Permissions**
  - `can_delete` permission controls deletion of own posts
  - `can_delete_others` permission controls deletion of others' posts
  - Delete button visibility based on ownership and permissions
  - API enforces permission checks for all delete operations
  - Default permissions:
    - Admin: Can delete own and others' posts
    - Editor: Can delete own and others' posts
    - Author: Can delete own posts only
- **Granular Post Visibility Control**
  - New `view_others_posts` permission controls visibility of others' posts in lists
  - Independent from `manage_others_posts` (edit/delete) permission
  - Allows fine-grained access control: users can edit without viewing full lists
  - Default permissions by role:
    - Admin: Can view and manage all posts
    - Editor: Can manage others' posts but only sees own posts in lists (customizable)
    - Author: Can only view and manage their own posts
  - Editors with `manage_others_posts` can edit via direct URL but won't see others' posts in sidebar
  - API enforces permission at query level for optimal performance
- "Content Types" submenu in admin sidebar
  - Hover to reveal Post Types and Taxonomies options
  - Auto-expands when on any Content Types page
  - Clean, organized navigation structure
  - New "Content Types" menu item (position 27)
- "Taxonomies" submenu in admin sidebar (position 22)
  - Dynamically populated with all taxonomies where `show_in_menu` is true
  - Categories and Tags appear here by default
  - Hover to reveal submenu with all active taxonomies
  - Auto-expands when viewing any taxonomy term management page
  - Positioned just below Media for easy access to content organization
- **Taxonomy dashboard cards**
  - New `show_in_dashboard` option for taxonomies
  - Taxonomies can now appear in the Dashboard Content Summary
  - Shows term count for each taxonomy
  - Filtered by user's `manage_taxonomies` permission
  - Uses appropriate icons (🏷️ for hierarchical, 🔖 for flat)
  - Clickable cards link to taxonomy term management page
- "Users" submenu in admin sidebar
  - "All Users" for user management
  - "Roles" for roles and permissions management
  - Auto-expands when on any Users page
- **Custom Roles & Permissions System**
  - Create custom user roles with granular permission sets
  - Dedicated "Roles" management page under Users
  - **Per-post-type permissions**: Each post type has its own access permission (e.g., `manage_posts_post`, `manage_posts_page`)
  - Core permissions organized by category (General, Administration)
  - Post type permissions dynamically generated based on registered post types
  - Users can be granted access to specific post types only
  - `manage_others_posts` applies across all post types the user has access to
  - Eight core permissions: view_dashboard, manage_others_posts, manage_media, manage_taxonomies, manage_users, manage_roles, manage_post_types, manage_settings
  - System roles (Admin, Editor, Author) are pre-configured and protected from deletion
  - Custom roles can be created, edited, and deleted
  - **Clone role feature**: Quickly create new roles based on existing ones
  - Cloned roles are independent and don't sync with the original
  - Clone button available for all roles (system and custom)
  - Auto-generates name with "_copy" suffix and "(Copy)" in display name
  - Roles with assigned users cannot be deleted until users are reassigned
  - Permission checkboxes organized by category with clear descriptions
  - Side-by-side layout: roles list on left, edit form on right
  - Permission badges color-coded: green for core permissions, blue for post types
- **Database Schema**
  - New `roles` table with permissions stored as JSON
  - Users table now references `role_id` instead of ENUM
  - Default roles automatically created with appropriate permissions
  - Foreign key relationship between users and roles
- **Permission-based sidebar filtering**
  - Menu items filtered based on user's role permissions
  - Post types only appear if user has the specific post type permission
  - Example: User with only `manage_posts_page` will only see Pages in sidebar
  - Seamless UX - unauthorized items simply don't appear
  - Subitems also respect permissions for granular access control
  - Works with custom roles and system roles alike
- **Page-level permission protection**
  - Created `usePermission` hook for consistent permission checking across pages
  - All admin pages now validate user permissions before rendering
  - Automatic redirect to dashboard if user lacks required permission
  - Prevents URL-based permission bypass attempts
  - Protected pages:
    - Users management (requires `manage_users`)
    - Roles management (requires `manage_roles`)
    - Media library (requires `manage_media`)
    - Settings pages (requires `manage_settings`)
    - Content Types management (requires `manage_post_types`)
    - Taxonomy term management (requires `manage_taxonomies`)
    - Post type lists and editors (requires `manage_posts_[posttype]` for specific type)
  - Shows loading spinner during permission check
  - Seamless redirect without error messages for better UX
- **API-level permission enforcement**
  - `manage_others_posts` permission now properly enforced in API routes
  - POST `/api/posts` - Users can create posts for post types they have access to
  - PUT `/api/posts/[id]` - Users can only edit their own posts unless they have `manage_others_posts`
    - Returns 403 if attempting to publish without `can_publish` permission
  - DELETE `/api/posts/[id]` - Checks `can_delete` for own posts, `can_delete_others` for others' posts
    - Returns 403 with specific error message for each permission failure
  - GET `/api/posts` - Users without `view_others_posts` only see their own posts in lists
  - Ownership checked by comparing post's `author_id` with session user ID
- **Editor-level permission enforcement**
  - Post editor checks ownership when loading posts for editing
  - Users without `manage_others_posts` cannot access edit pages for others' posts
  - Automatic redirect to post type list if unauthorized
  - Shows error toast explaining the restriction
- **UI-level permission enforcement**
  - Edit links disabled (grayed out) for posts user can't edit
  - Hover tooltip explains lack of permission
  - Title is non-clickable for posts user can't edit
  - Delete button hidden in post lists for posts user can't delete
  - Clean visual indication of permission restrictions

### Changed
- **Post editor button labels**
  - "Publish Post" button now displays "Update Post" when editing already-published posts
  - More intuitive action labels based on post state
  - Draft posts still show "Publish Post" to indicate status change
- Post Types and Taxonomies moved from Settings to Content Types
  - Now accessed via sidebar submenu
  - Settings simplified to General and Media only
  - Clearer separation between site settings and content structure
  - Each page (Post Types, Taxonomies) has its own header
  - No tabbed navigation - rely on sidebar for navigation
- Taxonomies settings page redesigned with side-by-side layout
  - Existing taxonomies list on left with "+ Add New" button
  - Create/Edit form on right (shows when creating or editing)
  - Matches Post Types editor layout for consistency
  - Compact card-based list with inline badges for type and built-in status
  - Improved form layout with better spacing and descriptions
- Settings navigation redesigned with sidebar submenu
  - Settings menu item now has General and Media subitems
  - Hover to reveal submenu options
  - Auto-expands when on any Settings page
  - Each settings page has its own dedicated header
  - Removed tabbed navigation from Settings layout
  - Consistent navigation pattern with Content Types
- Taxonomy menu items moved to dedicated submenu
  - Individual taxonomies (Categories, Tags, etc.) no longer appear as separate top-level menu items
  - Now grouped under "Taxonomies" submenu for better organization
  - Maintains same functionality with cleaner navigation
  - Respects `show_in_menu` setting for each taxonomy
- **User authentication system updated for custom roles**
  - Session now includes role permissions in addition to role name
  - Auth system fetches user's role and permissions from database on login
  - JWT token stores permissions for efficient authorization checks
  - All permission checks use the permissions object from session
- **Users API updated for role_id**
  - User queries now JOIN with roles table to include role information
  - API responses include both `role_id` and `role_display_name`
  - Users page updated to display and manage role assignments
  - Role dropdown now dynamically populated from roles table
- **API Routes for Roles Management**
  - `GET /api/roles` - List all roles with permissions
  - `POST /api/roles` - Create new custom role
  - `GET /api/roles/[id]` - Get specific role details
  - `PUT /api/roles/[id]` - Update role (permissions for system roles, all fields for custom)
  - `DELETE /api/roles/[id]` - Delete custom role (protected if users assigned)
  - All routes check `manage_roles` permission

### Fixed
- Removed all legacy category API routes and admin pages
  - Deleted `app/api/categories` (replaced by terms API)
  - Deleted `app/api/posts/[id]/categories` (replaced by terms relationship API)
  - Deleted `app/admin/categories` (replaced by taxonomy term management)
  - Deleted empty `app/api/pages` folder
- Updated media usage checks to use new taxonomy system
  - Now checks `terms` table instead of old `categories` table
  - Removed checks for old `pages` table (now part of posts)
  - Media deletion response now shows posts and terms usage
- Dashboard content summary now respects user permissions
  - Post types only appear if user has the specific `manage_posts_[posttype]` permission
  - Taxonomies only appear if user has `manage_taxonomies` permission AND taxonomy has `show_in_dashboard` enabled
  - Media card only shows if user has `manage_media` permission
  - Users card only shows if user has `manage_users` permission
  - Removed deprecated Categories card from dashboard
- Taxonomy settings page updated
  - Added "Show in Dashboard Content Summary" checkbox
  - Allows controlling which taxonomies appear on the dashboard
  - Works alongside existing "Show in admin menu" option

## [1.2.1] - 2025-10-15

### Added
- Two-button publish system in post editor
  - "Save as Draft" button - saves with draft status
  - "Publish" button - automatically publishes post
  - Status display shows current state (Published/Draft)
- Editable slug field in post editor with URL preview
  - Shows post type prefix based on post type's slug setting
  - Auto-generates from title by default
  - Can be manually customized for SEO
  - Real-time validation (lowercase, hyphens only)
  - Preview button (🌐) opens published post in new window
  - Works with all post types (posts, pages, custom)
- Hierarchical URL support for pages and custom hierarchical types
  - Child pages/posts include parent slugs in URL path
  - Example: Parent "Services" + Child "Web Design" → `/services/web-design`
  - Works with date-based URLs too: `/2025/10/parent/child`
  - Frontend validates full hierarchical path matches
- Post type slug and URL structure in Content Types → Post Types
  - Define URL prefix for each post type
  - Example: slug "portfolio" → items at `/portfolio/item-slug`
  - Leave empty for root level (like pages at `/slug`)
  - Built-in post types (Posts, Pages) have protected slugs
  - URL Structure options (WordPress-style permalinks):
    - **Default**: `/slug/post-title` or `/post-title` (root)
    - **Year**: `/slug/2025/post-title`
    - **Year/Month**: `/slug/2025/10/post-title`
    - **Year/Month/Day**: `/slug/2025/10/15/post-title`
- Post editor now integrates with new taxonomy system
  - Dynamically displays all taxonomies assigned to post type
  - Supports multiple taxonomies simultaneously
  - Scrollable term selection for each taxonomy
  - Inline term creation within post editor
  - Auto-selects newly created terms
- Enhanced admin notifications
  - Prominent top-center toast notifications
  - Success messages (green) and error messages (red)
  - Messages persist across page reloads using sessionStorage
  - Contextual messages based on action (published vs. saved as draft)
  - Different durations for success (3-4s) and errors (5s)
- Loading overlay during save operations
  - Full-screen semi-transparent overlay prevents interaction
  - Large spinner with contextual text (Creating/Saving/Updating/Deleting)
  - Applied to post editor and taxonomy term management
  - Automatic cleanup when operation completes

### Changed
- Post editor workflow improvements
  - After creating a post, redirects to edit page (shows success message)
  - After updating a post, uses AJAX to refresh data (no page reload)
  - Allows continuous editing without leaving the editor
  - All form data updates instantly via TanStack Query invalidation
- Frontend dynamic routes for all post types and URL structures
  - **Default structure routes:**
    - `/blog/[slug]` - Blog posts with default structure
    - `/[slug]` - Pages and custom types with empty slug (root level)
    - `/[postTypeSlug]/[slug]` - Custom post types with slug prefix
  - **Date-based structure routes (all post types):**
    - `/blog/[year]/[slug]` or `/[postTypeSlug]/[year]/[slug]`
    - `/blog/[year]/[month]/[slug]` or `/[postTypeSlug]/[year]/[month]/[slug]`
    - `/blog/[year]/[month]/[day]/[slug]` or `/[postTypeSlug]/[year]/[month]/[day]/[slug]`
  - Validates URL structure and published date match
  - Displays author and date metadata
  - Examples:
    - Posts (default): `/blog/my-article`
    - Posts (year/month/day): `/blog/2025/10/15/my-article`
    - Portfolio (default): `/portfolio/my-project`
    - Portfolio (year): `/portfolio/2025/my-project`
    - Pages (always root): `/about`
- Removed old category system from post editor
  - No longer uses CategorySelector component
  - Replaced with dynamic taxonomy support
- Removed "categories" from post type supports field
  - Taxonomies now assigned separately in Content Types → Post Types
- Toast notifications moved to top-center with enhanced styling
  - Larger, more prominent design
  - Better color contrast for success/error states
- Taxonomy term management redesigned with side-by-side layout
  - Add/Edit form on left (sticky position)
  - Terms list on right (2/3 width)
  - All updates via AJAX (no page reloads)
  - Click "Edit" to populate form, "Cancel" to clear
  - Form shows "Add New" or "Update" based on state

### Fixed
- All form labels now properly associated with inputs (accessibility)
- PostTypeForm props marked as readonly
- Admin notifications now visible after page reloads
- Fixed extra "0" displaying in taxonomy term form for non-hierarchical taxonomies
- Taxonomy terms table now has dedicated Image column with icon placeholder for terms without images
- Description column width limited to prevent pushing Created date off screen
- All created/updated timestamps now display date AND time in 12-hour format (e.g., "Oct 15, 2025, 3:45 PM")

## [1.2.0] - 2025-10-15

### Added
- **Custom Taxonomies System** (WordPress-style)
  - Create custom taxonomy types (hierarchical or flat)
  - Built-in taxonomies: Categories (hierarchical), Tags (flat)
  - Assign taxonomies to specific post types
  - Complete term management with images and hierarchy
  - Dynamic sidebar integration for taxonomies
  - Content Types → Taxonomies page for taxonomy type management
  - Individual taxonomy term management pages (`/admin/taxonomy/[slug]`)
  - Term relationships with usage counts
  - Support for parent/child term relationships (hierarchical)
  - Media selector for taxonomy term images
- **Database Schema**
  - New `taxonomies` table for taxonomy definitions
  - New `terms` table for taxonomy terms (replaces categories)
  - New `term_relationships` table for post-term associations
  - New `post_type_taxonomies` table for post type-taxonomy assignments
- **API Routes**
  - `/api/taxonomies` - CRUD for taxonomy types
  - `/api/taxonomies/[id]` - Individual taxonomy operations
  - `/api/terms` - CRUD for terms with taxonomy filtering
  - `/api/terms/[id]` - Individual term operations
  - `/api/posts/[id]/terms` - Manage post-term relationships
  - `/api/post-types/[id]/taxonomies` - Assign taxonomies to post types
- **WYSIWYG Content Styling**
  - Comprehensive `.content-body` CSS class for public pages
  - Proper heading styles (h1-h6) with appropriate sizes
  - Styled paragraphs, lists, blockquotes, code blocks, tables
  - Link hover effects and inline formatting
  - Responsive images with rounded corners

### Changed
- Categories system moved to taxonomy framework
- Sidebar now dynamically loads taxonomies based on `show_in_menu` setting
- Removed hardcoded "Categories" menu item (now loaded from taxonomies)
- Post types can now select which taxonomies they support
- Taxonomy menu items get automatic icons (🏷️ hierarchical, 🔖 flat)

### Fixed
- Public pages now properly display formatted content from WYSIWYG editor

## [1.1.2] - 2025-10-15

### Added
- **Content Body Styling** for public pages
  - Comprehensive CSS for all WYSIWYG-generated HTML elements
  - Proper heading sizes (h1-h6) with appropriate font weights and spacing
  - Styled paragraphs, lists (ul/ol), blockquotes, code blocks
  - Table styling with borders and headers
  - Link hover effects and inline formatting (bold, italic)
  - Responsive images with rounded corners
  - All content now displays beautifully on public site

## [1.1.1] - 2025-10-15

### Added
- "View" action in post type lists for published items (opens in new window)
- Clickable titles in post type lists that link to edit screen
- Smart public URL routing (posts → /blog/slug, pages/custom → /slug)
- Shared PostTypeForm component for all post type edit/new interfaces

### Changed
- Actions column moved to first position in post type tables for easier access
- Featured Image box moved to top of sidebar for better visual hierarchy
- **Code Refactoring**: Unified all post edit/new pages to use shared PostTypeForm component
  - Reduced code from ~1,160 lines to ~418 lines (740 lines eliminated)
  - All post types (posts, pages, custom) now use same interface
  - Single source of truth for post editing logic
- **Removed `/admin/posts` routes** - Posts now accessed via `/admin/post-type/post`
  - Consistent routing for all post types
  - Sidebar automatically links to correct routes

### Fixed
- Built-in post types (Posts and Pages) are now protected from deletion in both UI and API
- Delete button hidden for built-in post types in Content Types → Post Types
- Visual "Built-in" badge added to Posts and Pages in post types list
- API returns error when attempting to delete built-in post types
- Fixed extra "0" appearing in non-hierarchical post type lists
- Fixed multiple React boolean rendering issues (MySQL BOOLEAN as tinyint)

## [1.1.0] - 2025-10-15

### Added
- **Custom Post Types** (WordPress-style)
  - Create custom content types (portfolios, products, events, testimonials, etc.)
  - Content Types → Post Types management interface
  - Configure post type labels, icons, and menu positions
  - Toggle features per post type (title, content, excerpt, featured image, categories)
  - Option to show/hide post types in dashboard content summary
  - **Hierarchical support** for parent/child relationships (like WordPress Pages)
  - Parent selector and menu order for hierarchical post types
  - Dynamic admin sidebar menu items based on registered post types
  - Separate admin pages for each custom post type
  - Post type-specific create and edit interfaces
  - API endpoints for post type CRUD operations
  - Database migration script for existing installations
  - Cannot delete built-in post types ("post" and "page") or types with existing content
  - Slug validation (lowercase, alphanumeric, underscores only)
  - UTF8MB4 charset support for emoji icons

### Changed
- **Unified Content System**
  - Pages are now a custom post type (`post_type = 'page'`) instead of separate table
  - All content (posts, pages, custom types) managed through unified posts table
  - Removed hardcoded "Pages" menu item - now handled as custom post type
  - Migrated existing pages to posts table with post_type = 'page'
  - Pages post type is hierarchical by default
  - Removed legacy `/admin/pages` and `/api/pages` routes

### Breaking Changes
- **Pages Table Deprecated**: Pages are now in the posts table with `post_type = 'page'`
- **API Changes**: Use `/api/posts?post_type=page` instead of `/api/pages`
- **Migration Required**: Run `scripts/migrate-pages-to-posts.js` for existing installations
- **Pages Table**: Can be dropped after confirming migration success: `DROP TABLE pages;`

## [1.0.2] - 2025-10-15

### Added
- **Media Metadata Management**
  - Added `title` and `alt_text` fields to media table for better organization and accessibility
  - Edit button on each media item to update title and alt text
  - Modal editor with image preview and detailed metadata
  - Display of title and alt text in media library grid
  - Alt text support for improved SEO and screen reader accessibility
  - Database migration script to add new columns to existing installations

- **Image Size Regeneration**
  - New API endpoint `/api/media/regenerate` to regenerate image sizes
  - "Regenerate All Images" button in Media Library to apply current size settings to all images
  - "Regenerate Sizes" button in individual image editor modal
  - "Regenerate All Images" button in Media Settings page
  - Progress feedback with loading states and success/error reporting
  - Automatically applies new crop styles and dimensions to existing images
  - Generates new timestamps for cache busting (ensures browsers fetch updated images)
  - Automatically removes old size variant files to save disk space
  - Windows file locking workaround with automatic cleanup of temporary `.old` files

- **Upload Progress Tracking**
  - Individual progress bars for each file during multi-file uploads
  - Real-time percentage updates as files upload
  - Visual status indicators (uploading, completed ✓, error ✗)
  - Color-coded progress bars (blue for uploading, green for success, red for errors)
  - Automatic cleanup of progress display after completion
  - Detailed success/error reporting with file counts

### Changed
- **Dashboard Improvements**
  - Combined Posts, Pages, and Media cards into unified "Content Summary" card
  - All content type labels now link to their respective admin pages
  - Added Categories and Users to the content summary grid
  - Added "Quick Stats" card showing published/draft post counts and user role
  - Improved dashboard layout and visual hierarchy
  - Added loading spinners and skeleton loaders for better UX during data fetching

## [1.0.1] - 2025-10-15

### Added
- **Settings System** with database-driven configuration
  - General settings (site name, tagline, description)
  - Media settings (customizable image sizes)
  - Settings API endpoints
  - Admin UI with sub-menu tabs
  - Dynamic site branding on frontend
- **Custom Image Sizes** - Add unlimited image size presets via settings
  - Configurable crop styles: Cover, Fit Inside, Contain, Fill
  - Per-size crop style configuration
  - Visual explanations in UI
  - Sharp-powered intelligent resizing
- **Media Usage Tracking** - Shows where images are used before deletion
  - API endpoint to check usage: `/api/media/:id/usage`
  - Warning dialog with detailed usage list
  - Automatic reference cleanup on deletion
  - Success message shows cleared locations
- Settings documentation (SETTINGS.md)
- Image crop styles documentation (IMAGE_CROP_STYLES.md)
- Media deletion safety documentation (MEDIA_SAFETY.md)
- Database architecture documentation (DATABASE_ARCHITECTURE.md)

### Changed
- Site name/tagline now pulled from database settings
- Image sizes now configurable instead of hardcoded
- Homepage, navbar, and footer use dynamic settings
- Media deletion now checks and reports usage
- Image resizing now supports multiple crop/fit styles per size
- Default thumbnail uses "cover" crop for square images
- Default medium/large use "inside" fit for flexible sizing

### Improved
- Foreign key constraints automatically clear image references
- Cache invalidation when images with references deleted
- Better user feedback on media deletion

## [1.0.0] - 2025-10-15

### Initial Release

Complete CMS system similar to WordPress with modern tech stack.

### Added

#### Core Features
- **Posts Management** - Full CRUD operations for blog posts
- **Pages Management** - Static page creation and management
- **Media Library** - File upload and organization system
- **Categories** - Post categorization with images
- **User Management** - Multi-user support with role-based access

#### Authentication & Users
- NextAuth.js integration for secure authentication
- User roles: Admin, Editor, Author
- Bcrypt password hashing
- Session management
- User fields: username, first_name, last_name, email
- Admin-only user management interface

#### Content Features
- Rich text editor (react-simple-wysiwyg)
- Draft/Published/Trash status system
- Featured images for posts, pages, and categories
- Post excerpts
- Automatic slug generation
- Author attribution
- Timestamps (created, updated, published)

#### Media Management
- **WordPress-style image processing** with Sharp
- Automatic image resizing on upload:
  - Thumbnail (150×150px)
  - Medium (300×300px)
  - Large (1024×1024px)
  - Full (original size)
- Date-based folder organization (YYYY/MM/)
- Multiple file upload support
- Image preview grid
- File metadata storage
- One-click URL copying
- Media deletion with cascade cleanup

#### Category System
- Create, edit, delete categories
- Category images with media selector
- Inline category creation from post editor
- Many-to-many post-category relationships
- Category descriptions and slugs

#### Database Architecture
- **Proper relational design** using foreign keys
- Media referenced by ID (not URL) for data integrity
- Cascade delete and SET NULL behaviors
- Optimized with indexes
- JSON storage for image size data
- Connection pooling optimized for shared hosting

#### Admin Interface
- Beautiful dashboard with statistics
- Sidebar navigation
- Modal media selector with grid view
- Inline forms (categories, media)
- Toast notifications
- Loading states
- Confirmation dialogs
- Responsive design (mobile, tablet, desktop)

#### Public Frontend
- Modern homepage with hero section
- Blog listing page
- Individual post pages (slug-based URLs)
- Dynamic page routing
- Responsive design
- SEO-friendly HTML structure
- Smart image sizing (templates choose appropriate size)

#### Developer Experience
- TypeScript for type safety
- Tailwind CSS for styling
- ESLint configuration
- Hot reload in development
- Comprehensive documentation
- Migration scripts for database updates

### Technical Stack

**Frontend:**
- Next.js 14 (App Router)
- React 18
- Tailwind CSS 3.4
- TypeScript 5.3

**Backend:**
- Next.js API Routes
- MySQL with mysql2
- NextAuth.js 4.24
- Sharp (image processing)

**State & Forms:**
- TanStack Query (React Query)
- React Hook Form
- React Hot Toast

### Database Schema

**Tables Created:**
1. `users` - User accounts (username, first_name, last_name, email, password, role)
2. `posts` - Blog posts with featured_image_id
3. `pages` - Static pages with featured_image_id
4. `media` - Uploaded files with sizes (JSON)
5. `categories` - Post categories with image_id
6. `post_categories` - Many-to-many relationships

**Foreign Keys:**
- All author_id → users.id (CASCADE DELETE)
- All media references → media.id (SET NULL on delete)
- Category/page hierarchies (SET NULL on delete)

### Security Features
- Bcrypt password hashing (10 rounds)
- SQL injection prevention (parameterized queries)
- XSS protection
- CSRF protection (NextAuth)
- Protected API routes
- Role-based access control
- Session-based authentication

### Performance Optimizations
- Server-side rendering
- Automatic image resizing
- Optimized database queries with indexes
- Connection pooling for shared hosting
- React Query caching
- Code splitting by route

### Configuration Files
- Environment-based configuration (.env)
- TypeScript configuration
- Tailwind configuration
- ESLint rules
- Next.js configuration

### Documentation
- README.md - Main documentation
- SETUP.md - Quick setup guide
- FEATURES.md - Feature list
- TROUBLESHOOTING.md - Common issues
- PROJECT_SUMMARY.md - Project overview
- STRUCTURE.md - File structure
- IMAGE_SYSTEM.md - Image processing docs
- DATABASE_ARCHITECTURE.md - Database design docs

### Known Issues
- Shared hosting with max_user_connections < 2 requires connection optimization
- React-quill replaced with react-simple-wysiwyg for better compatibility

### Notes
- Default admin credentials: admin@example.com / admin123
- Optimized for shared hosting environments
- Production-ready with proper error handling

---

## Version History

### Future Roadmap (Planned Features)

**v1.1.0** (Planned)
- [ ] Comments system
- [ ] SEO metadata fields
- [ ] Bulk actions
- [ ] Advanced search

**v1.2.0** (Planned)
- [ ] Email notifications
- [ ] User profile pages
- [ ] Content revisions
- [ ] Scheduled publishing

**v1.3.0** (Planned)
- [ ] Multi-language support
- [ ] Custom post types
- [ ] Analytics dashboard
- [ ] Export/import functionality

---

## Upgrade Guide

### From Fresh Install

1. Run database schema: `node setup-new-db.js`
2. Install dependencies: `npm install`
3. Configure `.env` file
4. Start: `npm run dev`

### Database Migrations Applied

**Migration 1: Users Table**
- Added: username, first_name, last_name
- Removed: name
- Status: ✅ Complete

**Migration 2: Categories**
- Added: image_id (foreign key to media)
- Removed: image (VARCHAR)
- Status: ✅ Complete

**Migration 3: Media References**
- Added: featured_image_id to posts
- Added: featured_image_id to pages
- Added: sizes (JSON) to media
- Removed: featured_image (VARCHAR) from posts
- Removed: featured_image (VARCHAR) from pages
- Status: ✅ Complete

---

**For detailed changes in each version, see the sections above.**

