# Changelog

All notable changes to Next CMS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.1.1] - 2025-10-17

### Added
- **Modal ESC Key Support** - All modals can now be dismissed with the ESC key
  - ActivityLogDetailsModal
  - SiteUsersModal
  - EditMediaModal
  - FolderModal
  - MoveMediaModal
  - BulkMoveModal
  - AutosaveDiffModal (ESC defaults to keeping current content)
- **Custom Fields as Post Type Option** - Custom fields now controlled by post type supports
  - Added `custom_fields` to post type supports options
  - Available in Post Type editor UI as a checkbox
  - Posts have custom fields enabled by default
  - Pages don't have custom fields by default
  - Custom fields now available when creating new posts (not just when editing)
  - Admins can enable/disable custom fields per post type
- **Automatic Session Refresh** - Permissions update immediately without logout/login
  - When editing a role, users with that role get instant permission updates
  - Session automatically refreshes permissions from database
  - Correctly loads permissions from `site_users` table (site-specific roles)
  - Sidebar re-renders to show/hide menu items based on new permissions
  - Includes support for site role overrides
  - Toast notification confirms when your permissions are updated
  - Works for all permission changes including new post types access
  - No need to log out and back in to see permission changes

### Fixed
- **Post Types JSON** - Fixed invalid JSON syntax in pages post type supports field
  - Removed extra closing brace `}}` that was causing save errors
  - Fixed in both `schema.sql` and `site-tables-template.sql`
- **Post Types API** - Fixed post types not saving (multi-site compatibility)
  - Updated `/api/post-types/[id]` to use site-prefixed tables
  - GET, PUT, and DELETE methods now properly query `site_{id}_post_types`
  - Added proper permission checks (manage_post_types or super admin)
  - Fixed taxonomy relationships to use site-prefixed tables
  - Activity logging now includes siteId
- **Post Types Form** - Fixed TypeScript errors in post types editor
  - Fixed type mismatches for boolean/null values in supports field
  - Fixed disabled field type coercion
- **User Meta** - Fixed user meta to be site-aware
  - User preferences (column visibility, items per page) now stored per-site
  - Added `site_id` column to `user_meta` table
  - Updated unique constraint to `(user_id, site_id, meta_key)`
  - Users can have different preferences for each site
- **Permission Refresh** - Fixed session refresh to use site-specific roles
  - Now correctly queries `site_users` table for user's role on current site
  - Previously used global `users.role_id` instead of site-specific role
  - Fixes issue where permissions didn't update when editing roles on multi-site installations
  - Properly loads site role overrides after they're created
- **Site Role Overrides Loading** - Fixed site role overrides not loading in multiple scenarios
  - **Login**: Now loads site role overrides when user first logs in
  - **Site Switching**: Now loads site role overrides when switching between sites
  - **Permission Refresh**: Now loads site role overrides when role is edited
  - Previously only loaded base role permissions, ignoring site-specific customizations
  - Fixes custom post types not appearing in sidebar/dashboard despite being added to role permissions
  - All three auth flows (login, site switch, permission refresh) now consistently load overrides
- **Page Attributes Box** - Fixed author field not showing when creating new posts
  - Author field now visible when creating posts (previously only shown when editing)
  - Administrators can now set the author when creating a post
  - Prevents empty Page Attributes box for non-hierarchical post types
- **Autosave** - Fixed autosave not working after multi-site user_meta changes
  - Updated autosave API to include `site_id` in all user_meta queries
  - Autosaves now properly scoped per site
  - Fixed POST, GET, and DELETE methods
- **Autosave Triggers** - Fixed autosave not triggering for all field changes
  - Autosave now triggers when featured image is selected or removed
  - Autosave now triggers when taxonomies (categories/tags) are added or removed
  - Previously only triggered on text field changes (title, content, excerpt)
- **Autosave Featured Image & Taxonomies** - Fixed featured image and taxonomies not being saved/restored
  - Added `featured_image_id` and `featured_image_url` to autosave data
  - Added `selected_terms` (taxonomies) to autosave data
  - Fixed React state timing issue by passing values directly to triggerAutosave
  - Featured image and taxonomies now properly saved when autosaving
  - Featured image and taxonomies now properly restored when loading autosave
  - Updated both frontend (PostTypeForm) and backend (autosave API)
- **Autosave Diff Modal** - Added featured image and taxonomy comparison to autosave modal
  - Modal now shows side-by-side comparison when featured image changes
  - Modal now shows side-by-side comparison when taxonomies (categories/tags) change
  - Featured image displays as actual image thumbnails for easy visual comparison
  - Taxonomies display as color-coded badges showing selected terms per taxonomy
  - Previously only showed text fields (title, content, excerpt)

## [2.1.0] - 2025-10-17

### Added
- **Guest Role** - New system role for read-only public access
  - Added "Guest" role (ID: 4) with no permissions
  - Guests cannot access admin area (no dashboard permission)
  - Middleware blocks guests from all /admin routes
  - Dashboard redirects guests to homepage
  - Useful for public users who don't need admin access
  - Protected system role (cannot be edited/deleted)
- **Site-Specific Roles** - Administrators can now create custom roles scoped to their site
  - New `site_id` column in roles table (NULL = global/system role)
  - Site admins can create roles that only apply to their site
  - Super admins can create global roles available across all sites
  - Roles list shows badge with site name for site-specific roles (e.g., "Site 1")
  - System roles show "System" badge, global custom roles show "Global" badge
  - Site admins only see system roles + their site's custom roles
  - Super admins see all roles across all sites
  - Site-specific roles are automatically scoped when created by site admins
  - Site-specific roles can only be deleted by site admins who created them
  - Super Administrator role hidden from non-super admins for security
  - Prevents role name conflicts between sites (unique constraint per site)
- **Site Role Overrides** - Site admins can customize system roles without affecting other sites
  - New `site_role_overrides` table stores site-specific permission modifications
  - Site admins can edit system roles (Admin, Editor, Author, Guest) - changes only affect their site
  - Super admins editing system roles updates the global default (affects sites without overrides)
  - Customized roles show "Customized" badge (yellow) for site admins
  - Overrides automatically loaded for site admins when viewing roles
  - Each site can have different permissions for the same role
  - Example: Site 1 "Editor" can publish, Site 2 "Editor" cannot - completely independent

### Fixed
- **Role Permissions** - Added missing `can_reassign` permission to default roles
  - Administrator has `can_reassign: true` (can change post authors)
  - Editor has `can_reassign: false` (cannot change post authors)
  - Author has `can_reassign: false` (cannot change post authors)
  - Only Administrators can reassign authors by default

## [2.0.1] - 2025-10-17

### Added
- **Global Settings Page** - New dedicated page for system-wide settings (Super Admin only)
  - New page at `/admin/settings/global` for managing global settings
  - "Hide Default Credentials" setting moved to Global Settings
  - Future-ready for additional system-wide configuration options
  - Super admin sidebar now has "Settings" link directly to Global Settings page
  - New API endpoint: `/api/settings/global` for managing global settings
  - Includes informative help text about global vs site-specific settings

### Added
- **Super Admin Activity Log Access** - Super admins can now view and filter activity logs
  - Added Activity Log to super admin sidebar menu
  - Site filter dropdown allows filtering by specific site, all sites, or global activities only
  - Super admins can monitor activities across all sites from one interface
  - Non-super admins see only their current site's activities (no global activities)

### Changed
- **Authentication Settings Simplified** - Now only contains site-specific password requirements
  - Removed "Hide Default Credentials" from Authentication settings (moved to Global Settings)
  - Authentication settings page now focused solely on password requirements
  - Password requirements remain site-specific (configurable per site)
  - New `global_settings` database table for system-wide configuration
  - Non-super admins can manage password requirements for their site
  - Updated schema includes `global_settings` table with default values

### Changed
- **Super Admin Switch Back Behavior** - Switching back to super admin redirects to Sites list
  - When switching back to a super admin account, always redirect to `/admin/sites`
  - Ensures super admins land on their primary management page
  - Site admins remain on current page when switching back

### Fixed
- **Activity Log Multi-Site Support** - Fixed activity log to work correctly with multi-site architecture
  - Activity log is a global table (not site-specific) with `site_id` column for filtering
  - Site admins now see only activities for their current site
  - Super admins see all activities across all sites
  - Added "Site" column in activity log for super admins
  - Site name displayed for each activity (or "Global" for system-wide actions)
  - Fixed incorrect table reference (was looking for non-existent `site_1_activity_log`)
  - Removed activity_log from site-tables-template.sql (was incorrectly creating per-site tables)
- **Activity Logger Fixed** - Activity logger now correctly uses global activity_log table
  - Changed from site-specific tables (`site_X_activity_log`) to global `activity_log` table
  - Now properly inserts `site_id` as a column value (can be null for global activities)
  - Super admin activities are now correctly logged
  - Site-specific activities are properly associated with their sites
  - System-wide activities (like global settings changes) have `site_id = NULL`
- **Sidebar Version Display** - Updated version number in sidebar to 2.0.0
- **Super Admin Role Selection** - Fixed role dropdown when editing super admin users
  - Super admin role (ID: 0) now correctly selected when editing own account
  - Fixed JavaScript falsy value issue where `0 || 3` was defaulting to author role
  - Proper null/undefined check ensures correct role selection for all users
- **User Switching Validation** - Prevent switching to users without active site assignments
  - Backend validates user has at least one active site before allowing switch
  - Frontend disables switch button for users without active sites (super admin view)
  - Clear error message: "Cannot switch to user with no active site assignments"
  - Improves system security and prevents confusing error states

## [2.0.0] - 2025-10-17

### 🚨 BREAKING CHANGES
- **Complete Database Restructure** - Fresh installations now multi-site by default
- **New Schema Required** - Existing installations need migration (see MULTI_SITE.md)
- **Site-Prefixed Tables** - All site-specific tables now use `site_{id}_` prefix
- **New Default Users** - Super admin and site admin accounts replace old admin

### Changed
- **Database Schema Multi-Site by Default** - Complete restructure of database schema
  - Schema now creates multi-site structure from the start (no migration needed)
  - Default Site 1 (`site_1_*` tables) created automatically
  - Super Administrator account created by default (username: `superadmin`, password: `SuperAdmin123!`)
  - Site Administrator account for Site 1 created by default (username: `siteadmin`, password: `SiteAdmin123!`)
  - Site admin automatically assigned to Site 1
  - Global tables: `users`, `roles`, `sites`, `site_users`, `user_meta`, `activity_log`
  - Site-specific tables: `site_1_posts`, `site_1_media`, `site_1_settings`, etc.
  - Removed all migration scripts (no longer needed)
  - Removed old seed.sql (data now in schema.sql)
  - Updated `database/schema.sql` to be the single source of truth
  - Fixed site_users assignment query for better MySQL compatibility
  - Updated login screen to show new default accounts (superadmin and siteadmin)
  - Login now accepts both username and email (e.g., "superadmin" or "superadmin@example.com")
  - Fixed site creation to read template directly instead of calling deleted script
  - Added enhanced error logging for site table creation debugging
- **Site Creation UX Improvements** - Streamlined add site form
  - Display Name field moved to top position
  - Name field auto-generated from Display Name
  - Name field disabled on edit (used for table prefix)
  - Smart slug generation: removes special characters, converts to lowercase
  - Helper text explains purpose and generation logic

### Added
- **User Switching Feature** - Super admins and admins can now switch to other users for testing
  - Switch to any user account directly from the user list
  - "🔄 Switch" action button added to each user row for quick switching
  - Original session is preserved - can always switch back
  - Visual indicators show when viewing as another user (yellow warning badge)
  - "🔙 Switch Back" button shown in sidebar when in testing mode
  - All actions are logged with the original user ID for accountability
  - Security: Regular admins cannot switch to super admin accounts
  - New API endpoints: `POST/DELETE /api/auth/switch-user`
  - Session data includes `originalUserId` and `isSwitched` flags
  - New component: `SwitchBackButton.tsx` for sidebar switch back action
  - Documented in `USER_SWITCHING.md`

### Changed
- **Super Admin Interface Simplified** - Super admins now have a focused, streamlined interface
  - Super admins only see "Sites" and "Users" in the sidebar menu
  - Dashboard automatically redirects super admins to Sites management
  - Site switcher hidden for super admins (they manage all sites, not assigned to specific sites)
  - Super admins focus on system administration (sites and users) rather than content
  - Regular admins continue to see full content management interface
- **User Management Site-Aware** - User list and creation now respects site context
  - Site admins only see users assigned to their current site
  - Creating a new user as site admin automatically assigns them to current site
  - Super admins continue to see all users globally with site assignment badges
  - Super admin user list shows which sites each user is assigned to
  - Site assignments displayed as colored badges with site names
  - "Not assigned" indicator for users without site assignments
  - User list filtered by `site_users` table for site admins

### Fixed
- **Dashboard Super Admin Permissions** - Fixed dashboard to properly recognize super admin permissions
  - Fixed: `app/admin/page.tsx` - Dashboard now explicitly checks `isSuperAdmin` flag and redirects to Sites
  - Fixed: `components/admin/Sidebar.tsx` - Super admins see simplified menu
  - Super admin now properly bypasses all permission checks
  - Content admins (non-super) continue to see full dashboard
- **Multi-Site Public Routes** - Updated all public-facing routes and helpers for multi-site support
  - Fixed: `app/(public)/[...slug]/page.tsx` - Dynamic routing now site-aware
  - Fixed: `app/(public)/page.tsx` - Home page now uses site-prefixed tables
  - Fixed: `app/(public)/blog/page.tsx` - Blog archive now site-aware
  - Fixed: `app/(public)/blog/[...slug]/page.tsx` - Blog posts now site-aware
  - Fixed: `lib/post-utils.ts` - All helper functions now accept `siteId` parameter
  - Fixed: `lib/post-url-builder.ts` - URL building now site-aware
  - Fixed: `lib/menu-helpers.ts` - Menu helpers now use site-prefixed tables
  - All public routes default to site 1 (ready for domain-based routing)
  - Resolves console errors on login screen and public pages
- **Multi-Site Menu Helper** - Fixed menu helper function to use site-prefixed tables (resolves "Table 'menus' doesn't exist" errors)
  - Fixed: `lib/menu-helpers.ts` - All table references now site-prefixed
  - Fixed: `buildHierarchicalSlugPath` helper function now site-aware
  - Updated: `components/public/Menu.tsx` - Now accepts optional `siteId` parameter
  - Menu queries now use site-specific `menus`, `menu_items`, `posts`, `taxonomies`, and `terms` tables
  - Public menus default to site 1, but can be customized per component instance
- **Multi-Site Post Routes** - Fixed remaining post routes that weren't using site-prefixed tables (resolves "Table 'posts' doesn't exist" errors)
  - Fixed: `app/api/posts/[id]/revisions/route.ts` - Now uses site-prefixed tables
  - Fixed: `app/api/posts/[id]/restore/route.ts` - Post restore now works per site
  - Fixed: `app/api/posts/[id]/permanent-delete/route.ts` - Permanent delete now site-aware with cascade
  - Fixed: `app/api/posts/trash/empty/route.ts` - Empty trash now site-aware with proper cascade delete
  - Fixed: `app/api/post-types/[id]/route.ts` - Post type deletion check now site-aware
  - Added super admin checks to all routes
  - Fixed parseInt comparisons for consistency
  - Added proper cascading deletes for post meta, revisions, and term relationships
  - All post operations now fully multi-site compatible
  - Documented in `MULTI_SITE_TABLE_FIX.md`
- **Multi-Site Support** - Complete framework for managing multiple sites from one CMS installation
  - New `sites` table to store site definitions
  - New `site_users` table to map users to sites with specific roles
  - Sites management UI at `/admin/sites` (Super Admin only)
  - API endpoints for CRUD operations on sites (`/api/sites`)
  - Each site gets its own database tables with prefix `site_{id}_`
  - Site-specific tables: posts, media, menus, taxonomies, settings, etc.
  - Global resources: users, roles shared across all sites
  - Automatic table creation when adding new sites
  - Migration script for existing installations (`scripts/migrate-to-multi-site.js`)
  - Site setup script (`scripts/create-site-tables.js`)
  - Database helper utilities for site-prefixed table names (`getSiteTable`, `getSitePrefix`, `getSiteTableSafe`)
  - Comprehensive documentation in `MULTI_SITE.md`
  - Site tables template (`database/site-tables-template.sql`)
  - Multi-site schema (`database/multi-site-schema.sql`)
  - Default site (ID: 1) created automatically
  - Sites menu item in admin sidebar (Super Admin only)
  - Protection: Default site cannot be deleted
  - Safety: Deleted sites' tables are preserved (must drop manually)
  - **Core API Routes Updated for Multi-Site**:
    - Posts API - All routes use site-prefixed tables (`/api/posts/*`)
    - Post Types API - All routes use site-prefixed tables (`/api/post-types/*`)
    - Media API - All routes use site-prefixed tables (`/api/media/*`)
    - Taxonomies API - All routes use site-prefixed tables (`/api/taxonomies/*`)
    - Terms API - All routes use site-prefixed tables (`/api/terms/*`)
    - Menus API - All routes use site-prefixed tables (`/api/menus/*`)
    - Settings API - All routes use site-prefixed tables (`/api/settings/*`)
    - Activity Log API - Uses site-prefixed tables (`/api/activity-log`)
  - User session now includes `currentSiteId` for context
  - Activity logger updated to log to site-specific tables
  - All database queries dynamically use site context from session
  - **Site Switcher UI** - Easy site switching for users with multi-site access
    - Dropdown selector in admin header bar
    - Shows all sites user has access to (Super Admin sees all active sites)
    - Displays current site and domain
    - Smooth switching with session update and page reload
    - Only shows when user has access to multiple sites
    - Shows user's role per site for non-super admins
    - API endpoint for switching sites (`/api/auth/switch-site`)
    - API endpoint for fetching available sites (`/api/sites/available`)
  - **Site User Management** - Assign users to sites with specific roles
    - "Users" button on each site in Sites management page
    - Modal interface for managing site users
    - Add users to sites with role selection
    - Change user roles for specific sites
    - Remove users from sites
    - Shows count of assigned users per site
    - View all users assigned to a site
    - Filter available users (excludes already assigned)
    - API endpoints for site user CRUD operations (`/api/sites/[id]/users/*`)
    - Activity logging for all site user changes
- **Super Admin Role** - Built-in super administrator role with unrestricted access
  - New `super_admin` role (ID: 0) that bypasses all permission checks
  - Super admins automatically have access to all features without explicit permissions
  - System role that cannot be deleted, edited, or cloned through the UI
  - Protected at API level - cannot be modified via backend endpoints
  - "Protected Role" indicator shown in roles list instead of Edit/Clone buttons
  - Migration script (`scripts/add-super-admin-role.js`) for existing installations
  - Frontend hook (`usePermission`) automatically grants super admins all permissions
  - Backend authentication automatically creates permission proxy for super admins
  - Updated TypeScript types to include `isSuperAdmin` flag
  - Comprehensive documentation in `SUPER_ADMIN.md`
  - Assign super admin via SQL: `UPDATE users SET role_id = 0 WHERE username = 'admin';`

### Fixed
- **User Management** - Fixed validation error when assigning super admin role (ID: 0) to users
  - Changed `role_id` validation from `!role_id` to `role_id === undefined || role_id === null`
  - Now correctly accepts `0` as a valid role ID
- **Sidebar Navigation** - Fixed super admin sidebar to show all menu items
  - Super admins now bypass permission checks in sidebar
  - All admin menus (Users, Settings, Tools, etc.) now visible to super admins
  - Custom post types and taxonomies also visible to super admins
  - Previously was incorrectly checking permissions even for super admins
- **User Management API** - Fixed super admin access to user creation, editing, and deletion
  - Added explicit super admin checks to all user API endpoints
  - Super admins can now create, edit, and delete users without permission errors
  - Endpoints now check `isSuperAdmin || hasPermission` instead of just permission
  - Fixed: `/api/users` (POST), `/api/users/[id]` (PUT, DELETE)
- **Multi-Site Settings Table** - Fixed "Table 'nextcms.settings' doesn't exist" error
  - Updated all API routes to use site-prefixed `settings` table (`site_1_settings`)
  - Fixed: `/api/users/route.ts`, `/api/users/[id]/route.ts` (password validation)
  - Fixed: `/api/settings/authentication/route.ts` (auth settings, password requirements)
  - Fixed: `/api/media/regenerate/route.ts` (image size settings)
  - Fixed: `/api/posts/[id]/revisions/[revisionId]/restore/route.ts` (revision settings)
  - All settings queries now respect current site context via `getSiteTable()` helper
- **Multi-Site Login** - Fixed default site assignment on login
  - Regular users now default to their first assigned site from `site_users` table
  - Super admins still default to site 1
  - Users will automatically land on the correct site after login
  - Previously all users defaulted to site 1 regardless of their assignments
- **Site Switcher UI** - Site switcher now always visible
  - Shows even if user has access to only one site
  - Provides visual confirmation of current site context
  - Makes site assignment clear at all times
- **Admin Layout** - Reorganized sidebar for better UX
  - Site switcher moved to sidebar (top, above Dashboard)
  - User info moved to sidebar (bottom, above Help)
  - Removed redundant header bar for cleaner interface
  - Dark theme styling for sidebar components
  - More compact and focused workspace
- **Media Manager** - Site-based folder structure
  - Media files now organized by site: `/uploads/site_1/YYYY/MM/`
  - Each site's media files are completely separated
  - Prevents file conflicts between sites
  - Easier to manage and backup per-site media
  - Existing file operations (delete, regenerate) work automatically
- **Post Meta API** - Fixed multi-site support for custom fields
  - Updated post meta route to use site-prefixed tables
  - Custom fields now save correctly for each site
  - Added super admin permission check
  - Fixed: `app/api/posts/[id]/meta/route.ts`
- **Multi-Site Routes Audit** - Completed full audit and update of all API routes
  - ✅ Updated 8 additional routes for multi-site support
  - ✅ Post types taxonomies, menu items, menu locations
  - ✅ Public menus (with site_id parameter), media usage, post terms
  - ✅ All routes now use `getSiteTable()` helper
  - ✅ All routes respect currentSiteId from session
  - ✅ Super admin checks added throughout
  - ~45 total routes verified for multi-site compatibility
- **Database Schema** - Documented multi-site default approach
  - New installations should use site-prefixed tables from start
  - Created migration guide for existing installations
  - Documented in `SCHEMA_UPDATE_NOTES.md`
  - Application code fully compatible with site-prefixed tables

## [1.18.1] - 2025-10-16

### Fixed
- **Post Editor** - Title field now only auto-focuses when creating new posts, not when editing existing posts
- **Media Library** - Folder display and filtering improvements
  - Folders now show count of both files and subfolders (e.g., "3 files, 2 folders")
  - Fixed main media library page to only show root-level images (not images inside folders)
  - Fixed media selector modal to only show images in the current folder
  - Images in folders no longer appear on the main page or in wrong folders
- **Activity Log** - Media updates now properly show before/after values
  - Activity log now displays what changed when editing media (title and alt text)
  - Fixed bug where media trash action referenced undefined variable
- **Routing** - Complete routing system overhaul for proper URL handling
  - **MAJOR FIX**: Restructured public routes to fix Next.js route matching priority issues
  - Removed separate `[taxonomy]` dynamic routes that were intercepting all single-segment URLs
  - Consolidated taxonomy archives, taxonomy terms, pages, and posts into unified catch-all route
  - **Architecture decision**: All non-blog public routing now handled in `[...slug]` catch-all route
  - Custom taxonomy archive pages (e.g., `/portfolio`) now work correctly
  - Taxonomy term pages (e.g., `/portfolio/web-design`) now work correctly
  - Regular pages (e.g., `/about-us`) now work correctly
  - Custom post types with slugs (e.g., `/events/annual-conference`) work correctly
  - Posts and hierarchical pages continue to work as before
  - Route checking order: taxonomy → taxonomy term → post/page → 404
  - Only `/blog` routes maintain separate handler to avoid conflicts

## [1.18.0] - 2025-10-16

### Added
- **Authentication Settings** - New admin page for security configuration
  - Settings → Authentication page for login and password controls
  - Option to hide default user credentials on login page (security enhancement)
  - Configurable password requirements (min length, uppercase, lowercase, numbers, special characters)
  - Password validation enforced on user creation and password changes
  - Password requirements displayed in user forms with real-time validation feedback
  - Settings stored in database and apply to all password operations
  - Default requirements: 8 characters minimum, uppercase, lowercase, and numbers required
- **Help Center Updates**:
  - Authentication settings documentation in Settings and Users help pages
  - Username validation rules documented
  - Consistent link styling across all help pages (blue underlined headings with hover arrows)

### Changed
- **Admin UI Consistency** - Unified sticky header implementation across all admin pages
  - Consistent header styling with `text-2xl` titles and `text-sm` descriptions
  - All action buttons moved to sticky headers for better accessibility (except Tools and Taxonomy Terms pages)
  - Proper scrollable content areas with `overflow-y-auto` on all pages
  - Consistent spacing and padding throughout admin interface (`px-8 py-4` headers, `px-8 py-6` content)
- **Settings Pages** - Fixed headers with save buttons
  - General Settings, Media Settings, Authentication Settings pages
  - Save button always visible in header
  - Media Settings uses side-by-side layout: Image Sizes (left) and Add Custom Size (right)
  - Regenerate All button moved to header alongside Save Settings
- **Users Page** - Enhanced UI and workflow
  - Actions column moved to left side of table
  - Create/Update/Cancel buttons in sticky header
  - Header buttons swap contextually: "+ New User" vs "Cancel/Create User"
  - User list hidden when form is open for focused editing
  - Password field with show/hide toggle (👁️ icon)
  - Generate random password button (🎲 icon) that follows Authentication requirements
  - Real-time password validation with visual feedback (✅ green for met, ❌ red for unmet)
  - Username validation: Only alphanumeric and underscores allowed (auto-sanitizes input, spaces → underscores)
  - Autofill disabled on username and password fields
- **Roles Page** - Sticky header with contextual buttons
  - Create/Update/Cancel buttons in header
  - Header buttons swap: "+ Add New" vs "Cancel/Create Role"
- **Menus Page** - Sticky header with menu actions
  - Delete/Cancel/Update Menu buttons in header
  - Proper scrollable content area
- **Post Types & Taxonomies Pages** - Consistent sticky headers
  - Create/Update/Cancel buttons in header
  - Header buttons swap contextually based on state
- **Content Management Pages** - Improved navigation
  - Post List: Empty Trash/Columns/Add New buttons in sticky header
  - Post Editor: Fixed header styling with Save/Publish buttons
  - Taxonomy Terms: Sticky header with buttons remaining in form
- **Tools Pages** - Fixed headers for better scrolling
  - Import/Export and Activity Log pages with sticky headers
  - Buttons remain in original positions within content sections

## [1.17.1] - 2025-10-16

### Fixed
- Export functionality now uses simplified queries for better MySQL compatibility
- Meta data (posts, menu items) fetched separately and attached in JavaScript for better reliability
- Import now properly handles array-based meta data format
- Taxonomy export now works correctly (exports taxonomies, terms, and term relationships)
- User export now works correctly with proper column names (username, first_name, last_name)
- Post types, taxonomies, and media import now use correct column names matching current schema
- Media export now includes media_folders, and import processes folders before media files
- Import validates foreign key references (folder_id, uploaded_by) and handles missing references gracefully
- Menu items import now includes post_type column matching database schema
- Menu items import now properly remaps parent_id references to handle hierarchical menu structures
- Posts import now validates foreign keys (featured_image_id, author_id, parent_id) and remaps hierarchical post relationships
- Posts import includes scheduled_publish_at column
- Fixed incorrect table name references (term_relationships vs post_terms)
- **Database schema.sql table ordering** - Fixed foreign key constraint errors by reordering tables (media_folders and media now created before posts and terms)

## [1.17.0] - 2025-10-16

### Added
- **Import/Export System**:
  - Comprehensive data backup and migration tool accessible from Tools menu
  - Export site data to downloadable JSON files with selective data types
  - Import data from previous exports to restore or migrate content
  - 7 data categories: Posts & Pages, Media Library, Taxonomies, Navigation Menus, Post Types, Settings, Users & Roles
  - Select All/Select None quick actions for export options
  - User data export excludes passwords for security
  - Import prevents duplicates by checking existing content
  - Detailed import summary showing counts of imported items
  - Warning notifications about media files (metadata only, files require manual transfer)
  - Built-in safeguards with confirmation dialogs
  - Activity logging for all import/export operations

## [1.16.0] - 2025-10-16

### Added
- **Help Center**:
  - Comprehensive help documentation accessible from admin sidebar
  - 9 detailed sections covering all CMS features
  - Dashboard, Posts & Custom Post Types, Media Library, Taxonomies
  - Users & Roles, Appearance (Menus), Settings, Activity Log, Tips & Best Practices
  - Direct links from help pages to relevant admin pages for easy navigation
  - Modular component architecture with separate files for each help section
  - Clean two-column layout with sidebar navigation
  - Color-coded information boxes for easy scanning
  - Help link (❓) positioned above Logout button in sidebar

- **Menu Editor Enhancements**:
  - Individual taxonomy term selection (similar to individual post selection)
  - Choose either taxonomy archive page or specific terms (e.g., "Technology", "Sports")
  - Search functionality for filtering terms
  - New 'term' menu item type with proper URL generation (/{taxonomy}/{term-slug})
  - Terms display with taxonomy label for context
  - Public menu rendering supports term links

- **Taxonomy Public Pages**:
  - Taxonomy archive pages (/{taxonomy}) display all terms with post counts
  - Hierarchical taxonomy support with visual indentation and nested display
  - Parent/child term relationships shown with visual indicators (↳)
  - Individual term pages (/{taxonomy}/{term}) show posts tagged with that term
  - Full breadcrumb navigation showing complete term hierarchy path
  - Featured images, excerpts, and post metadata displayed
  - Centralized URL builder respects post type URL structure settings

### Fixed
- Post URLs on all public pages now correctly follow post type URL structure settings (default, year, year_month, year_month_day)
- Home page, blog page, and taxonomy pages now generate proper post links

## [1.15.0] - 2025-10-16

### Added
- **Navigation Menu System**:
  - Create and manage multiple menus with location-based positioning
  - Three menu item types: Post Types (archives/individual posts), Taxonomy archives, Custom links
  - WordPress-style drag-and-drop reordering with visual drop zones
  - Drag left/right to control hierarchy (parent/child relationships)
  - Inline editing with arrow icons (▼/▲) for expand/collapse
  - Advanced meta fields: Title Attribute, CSS Classes, Link Relationship (XFN), Description
  - Batch saving with loading overlay (menu + items + meta + deletions in one operation)
  - Sticky header with always-visible action buttons (disabled when no changes)
  - Auto-remembers last selected menu per user
  - Activity logging for all menu operations with before/after tracking
  - New Appearance sidebar menu (🎨) with Menus and Menu Locations submenus
  
- **Menu Locations**:
  - Settings page to create and manage custom menu locations
  - Built-in locations (header, footer, sidebar) protected from deletion
  - Radio button selector in menu form with descriptions
  
- **Public Template Integration**:
  - Menus automatically render in header (main nav) and footer locations
  - Hierarchical URL building for nested pages (e.g., /parent/child/grandchild)
  - Server-side rendering with full meta data support (tooltips, CSS classes, rel attributes)
  - Dropdown submenus on hover
  
- **Database**: New tables - menus, menu_items, menu_item_meta, menu_locations
- **Permissions**: New manage_menus permission for role-based access
- **Components**: Modular architecture (NavigationHeader, MenuList, MenuForm, MenuItemsList, AddMenuItemForm)
  
### Fixed
- Menu order persistence when dragging and saving
- Menu switching now properly clears previous menu items
- Last selected menu loads from user preferences with loading spinner
- Boolean display issue in menu locations (0 rendering as text)

## [1.14.2] - 2025-10-16

### Fixed
- **Activity Log**:
  - Term updates now properly track before/after changes
  - Settings updates now properly track before/after changes for each modified setting
  - Media size regeneration now properly logs before/after size changes
  - Taxonomy updates now properly track before/after changes
  - Post type updates now properly track before/after changes including assigned taxonomies
  - Removed duplicate logging when updating post type taxonomies (now only one log entry per save)
  - Consolidated post type and taxonomy updates into single comprehensive log entry
- **Post Type Form**: Now filters out legacy "categories" field from supports before saving
- **Sidebar Navigation**: Fixed submenu items incorrectly showing as active (changed from startsWith to exact match)

### Changed
- **Activity Log Details**:
  - Boolean values now display as "True"/"False" instead of "1"/"0"
- **Post Editor Header**:
  - Moved save and publish buttons to sticky header bar
  - Header now stays fixed at top of screen while scrolling
  - All action buttons (Save Draft, Publish, Schedule, Add New) now in header for easy access
  - Simplified sidebar Status box to show current status and schedule input only
  - Reduced header font size (2xl) for better proportions with buttons
- **Sidebar**:
  - Moved "View Site" icon to header next to "Next CMS" title
  - Removed "View Site" from menu items for cleaner navigation
  - Fixed flyout menu disappearing too quickly with 300ms hover delay
- **Dashboard Recent Content**:
  - Renamed from "Recent Posts" to "Recent Content"
  - Now includes all post types (not just "post") - Pages, Portfolios, etc.
  - Post titles are now clickable links to the editor
  - Posts are sorted by creation date (most recent first)
  - Post type and status displayed as bold, uppercase badges (e.g., "PAGE", "PUBLISHED")
  - Post type badge in light gray, status badges with unique colors (Published: green, Pending: blue, Draft: yellow, Scheduled: purple)
  - Added hover effect on list items with subtle background change for better UX
  - Badges displayed together above the title for better organization
  - Increased from 5 to 8 recent items displayed
  - Filtered by user permissions to only show post types the user can manage
- **Dashboard Content Summary Grid**: Now displays in 5 columns on extra-large screens (xl breakpoint) for better use of space
- **Posts API**: Now supports `post_type=all` parameter to fetch posts across all post types

## [1.14.1] - 2025-10-16

### Fixed
- **Dashboard Recent Media**: Now shows 12 most recent images from all folders, not just root folder
- Changed grid from 3 to 4 columns to display more media items

## [1.14.0] - 2025-10-16

### Added
- **Activity Log & Audit Trail**: Comprehensive tracking of all user actions
  - Tracks ALL admin operations: posts, users, roles, media, taxonomies, terms, post types, settings
  - **Before/after change tracking** - Stores complete state before and after updates
  - **Details modal** - View full change history with side-by-side comparison (before in red, after in green)
  - Stores user ID, action type, entity details, IP address, and user agent
  - Admin page with filtering by user, action type, and entity type
  - Search functionality across entity names and details
  - Pagination support for large log sets
  - Color-coded action badges for visual clarity
  - Accessible via **Tools → Activity Log** (new Tools menu in sidebar)
  - Requires manage_users permission
  - Automatically logs all critical system operations

### Fixed
- **Autosave System**: Fixed state synchronization issues preventing accurate content capture
  - Autosave now receives fresh values directly from onChange handlers, bypassing React state delays
  - All content fields (title, content, excerpt, SEO fields) now use override parameters
  - Ensures HTML formatting changes (H2, bold, etc.) are immediately captured
  - Eliminates race conditions between state updates and autosave timer

### Changed
- **Autosave Diff Modal**: HTML-aware diff with preserved formatting
  - Implements recursive DOM tree walking to highlight text nodes
  - Preserves all HTML structure (headings, bold, italic, lists) while highlighting changes
  - Single unified view showing formatted content with word-level highlighting
  - Changed/added words highlighted in yellow within their formatted context
  - Matches professional CMS diff tools (WordPress, Drupal)
  - Title and excerpt also use word-level highlighting
- **Sidebar Navigation**: Improved submenu UX with dual behavior
  - Submenus fly out to the right on hover for quick access
  - Expand below parent when active to show current location
  - Arrow indicators: ▶ for flyout (hover), ▼ for expanded (active)
  - Cleaner, more compact navigation when browsing
- **Activity Log Change Tracking**: Enhanced to capture complete content changes
  - Post updates now track title, content, excerpt, status, featured image, parent, menu order
  - All before/after queries execute before updates to capture accurate state
  - More comprehensive change details for better auditing
- **Diff Highlighting**: Word-level change highlighting in both autosave and activity log modals
  - Changed/added words highlighted in yellow for easy identification
  - Applied to title, excerpt, and all text fields in activity log
  - Matches professional CMS diff behavior
- **Rich Text Editor Styling**: Added proper heading and formatting styles
  - H1-H6 headings now display with appropriate sizes and weights
  - Lists, blockquotes, bold, and italic properly styled
  - Consistent styling in editor and preview

## [1.13.0] - 2025-10-12

### Added
- **SEO Metadata Editor**: Per-post SEO fields (title, description, keywords)
  - Stored in post_meta table using keys: `_seo_title`, `_seo_description`, `_seo_keywords`
  - Character count indicators for optimal length (60 for title, 160 for description)
  - Falls back to post title/excerpt if not set
  - Included in autosave functionality and visual diff modal
  - Separate from user-editable custom fields
- **Custom Fields UX**: Auto-focus on field name input when adding a new custom field

## [1.12.0] - 2025-10-07

### Added
- **Post Autosave with Visual Diff**
  - Automatic draft saving every 3 seconds after user makes changes
  - Autosave indicator showing "Saving...", "Draft saved", and last saved time
  - Saves title, content, excerpt, custom fields, and page attributes (parent, menu order, author)
  - Stored per user and per post in user_meta table, separate for new vs existing posts
  - **Visual diff modal on page load** comparing current vs autosaved content side-by-side
  - Shows only changed fields with current (gray) vs autosaved (green) highlighting
  - Displays human-readable names for parent and author (not just IDs)
  - Modal requires user decision - "Keep Current" or "Restore Autosave" to continue editing
  - Loading overlay while checking for autosaved drafts on page load
  - Only prompts for autosaves within last 24 hours
  - Clears autosave after successful post publish or update
  - API endpoints for save, load, and clear autosave data
  - Non-blocking - failures don't interrupt user workflow
- **Custom Fields UX**: Auto-focus on field name input when adding a new custom field

## [1.11.0] - 2025-10-02

### Added
- **Media Library Folders**
  - Create, rename, and delete folders to organize media files
  - Hierarchical folder structure with parent/child relationships
  - Breadcrumb navigation showing current folder path
  - Visual distinction for folders (blue gradient background with folder icon)
  - Move media files between folders with simple modal interface
  - **Drag and drop to move media into folders**
  - Visual feedback during drag operations (opacity change, folder icon animation)
  - Drop zone highlighting on hover (folder border and scale animation)
  - Folder icon changes from closed 📁 to open 📂 when dragging over
  - File count badge on each folder showing number of media files
  - Compact card layout (3/4/6/8 columns on different screen sizes)
  - Folder navigation integrated into featured image selector modal
  - Breadcrumb navigation in media selector for easy navigation
  - Upload to current folder directly from media selector
  - Smaller card sizes for better density and more visible items
  - Upload files directly into current folder
  - Folder-specific filtering for media queries
  - Hover actions on folders (rename, delete)
  - Empty state handling for folders and media
  - Automatic folder cleanup prevents deletion with content
  - Database schema updates: `media_folders` table with `parent_id` and `folder_id` column in `media` table
  - Complete API routes for folder management (CRUD operations)
  - Move media API endpoint with validation
  - Folder display before media files in grid layout
  - Cannot delete folders containing files or subfolders (safety check)
- **Media Library Trash System**
  - Soft delete for media files (moved to trash instead of permanent deletion)
  - Trash view with toggle button to switch between Media and Trash
  - Restore individual media files from trash
  - Permanently delete individual files from trash with confirmation
  - Empty entire trash with bulk permanent deletion
  - Trash count badge showing number of items
  - File deletion from filesystem only on permanent delete
  - `deleted_at` timestamp column in media table for soft deletes
- **Media Bulk Actions**
  - Select individual media files with checkboxes (works in both media and trash views)
  - Select All checkbox with item count
  - Bulk move to trash action (from media view)
  - **Bulk move to folder with dedicated modal**
  - **Bulk restore from trash**
  - **Bulk permanent delete from trash with confirmation**
  - BulkMoveModal component shows all available folders
  - Current folder disabled in bulk move modal
  - File count displayed for each folder option
  - Selected items highlighted with primary ring
  - Bulk action dropdown with Apply button (context-aware options)
  - Selection counter showing number of selected items
  - Clear selection when switching between Media and Trash views
  - Disabled drag and drop in trash view for safety
  - Loading overlay during bulk operations with progress message
  - LoadingOverlay component for better user feedback

### Changed
- **Code Refactoring: Media Library Page**
  - Broke down 868-line Media Library page into smaller, focused components
  - Created `MediaUploadProgress` component for upload progress tracking
  - Created `MediaGrid` component for folders and files display
  - Created `EditMediaModal` component for media details editing
  - Created `FolderModal` component (reusable for create/rename operations)
  - Created `MoveMediaModal` component for moving single media items
  - Created `BulkMoveModal` component for bulk move operations
  - Created `LoadingOverlay` component for operation feedback
  - Created `TrashView` component for complete trash management (self-contained)
  - Main page reduced from 868 to 628 lines (28% reduction)
  - TrashView is fully independent with its own state and mutations
  - Improved code maintainability and reusability
  - All components in `components/admin/media/` directory
  - Cleaner prop-based communication between components
  - 8 reusable media library components for better code organization

### Fixed
- Hidden breadcrumb navigation in trash view (trash shows all items across folders)
- Added clear "Trash" heading when viewing trash instead of confusing breadcrumb

## [1.10.0] - 2025-09-27

### Added
- **Configurable Session Timeout**
  - Admin-configurable session duration in Settings
  - User-friendly interface with number input and unit selector (minutes, hours, days)
  - Automatic unit conversion and display
  - Default: 24 hours
  - Flexible range: any duration from minutes to days
  - Session timeout stored in database settings table
  - NextAuth integration with SESSION_TIMEOUT environment variable
  - Sync script to update .env from database setting
  - Comprehensive documentation in SESSION_MANAGEMENT.md
  - Automatic session refresh on page interaction
  - Prevents frequent unexpected logouts
  - Server restart required after changing setting
- **Post Revision System**
  - Automatic revision creation when posts are updated
  - Configurable maximum revisions per post (Admin → Settings)
  - View all revisions with timestamp and author info
  - One-click restoration of previous versions
  - Automatic cleanup of old revisions based on max setting
  - Current changes saved as revision before restoring
  - Revisions panel in post editor sidebar
  - Set to 0 to disable revisions entirely
  - Default: 10 revisions per post
- **Custom Fields (Post Meta)**
  - WordPress-style custom fields for posts
  - Add unlimited key-value pairs to any post
  - Custom fields UI in main content area (below excerpt)
  - Add, edit, and remove custom fields dynamically
  - Custom fields included in revision history
  - Restoring a revision also restores custom fields
  - Unique constraint prevents duplicate keys per post
  - API endpoints for managing post meta
  - Custom fields automatically saved with post updates
  - Field names auto-converted to lowercase with underscores
- **Scheduled Publishing**
  - Set future date/time for automatic post publication
  - Datetime picker in Publish box
  - New "scheduled" status with purple badge
  - "Scheduled" tab shows all scheduled posts
  - Posts automatically published when scheduled time arrives
  - Cron job endpoint `/api/posts/process-scheduled` for automation
  - Scheduled date displayed in post list
  - Requires `can_publish` permission
  - Schedule button dynamically appears when date is set
  - Validation ensures scheduled dates are in the future
  - Full documentation in SCHEDULED_PUBLISHING.md
- **Customizable Post List Columns**
  - User-specific column visibility preferences
  - Toggle visibility of Featured Image, Author, Status, and Date columns
  - Dynamic taxonomy columns for assigned taxonomies (built-in and custom)
  - Featured image thumbnail (48x48) with placeholder icon for posts without images
  - Column settings dropdown with checkboxes
  - Preferences saved in user_meta table
  - Per-post-type column configurations
  - Real-time column show/hide
  - Terms displayed inline with comma separation
  - Empty state shows "—" for posts without terms
  - Click-outside closes column settings
  - Column preferences persist across sessions
- **Post Search and Column Filters**
  - Search bar integrated in bulk actions row (top right)
  - Searches both title and content fields  
  - Search icon with clear button (X)
  - Debounced search (500ms delay after typing stops)
  - Filter row below table headers for each column
  - Filter by title (text input)
  - Filter by author (text input)
  - Filter by status (dropdown: all, published, draft, pending, scheduled, trash)
  - Filter by taxonomy terms (text input per taxonomy)
  - Filter by date (date picker for exact date match)
  - Filters work in combination with search and status tabs
  - Real-time client-side filtering for instant results
  - Respects user permissions (only filters visible posts)
  - API-level search using SQL LIKE queries with debouncing
  - Column filters use client-side matching for performance
- **Items Per Page Selector**
  - Dropdown to select 10, 25, 50, or 100 items per page
  - Located in bulk actions row (far right)
  - User preference saved in user_meta table
  - Per-post-type configuration (different limit for Posts vs Pages)
  - Default: 25 items per page
  - Preference persists across sessions
  - Instant updates when changed
- **Post List Pagination**
  - Smart pagination controls below post list table
  - First, Previous, Next, Last navigation buttons
  - Numbered page buttons with current page highlighted
  - Shows up to 5 page numbers with ellipsis for large lists
  - Displays "Showing X to Y of Z results" counter
  - Automatically resets to page 1 when changing status filter, search, or items per page
  - Pagination only shown when total posts exceed items per page
  - Smooth page navigation with disabled states for boundary pages
  - Uses API offset parameter for efficient server-side pagination

### Changed
- **Code Refactoring: PostTypeForm Component**
  - Broke down 1052-line PostTypeForm into smaller, focused components
  - Created `PublishBox` component for publish controls and scheduling
  - Created `FeaturedImageBox` component for image selection
  - Created `PageAttributesBox` component for hierarchy and author controls
  - Created `CustomFieldsBox` component for custom field management
  - Created `TaxonomyBox` component for term selection and creation
  - Created `RevisionsBox` component for revision history
  - Reduced main file from 1052 to 732 lines (30% reduction)
  - Improved maintainability and code organization
  - Each component now has clear, single responsibility

## [1.9.0] - 2025-09-22

### Added
- **Trash System for Posts**
  - Posts are now moved to trash instead of being permanently deleted
  - New "Trash" tab in post list view to see trashed items
  - Restore functionality to recover posts from trash
  - Permanent delete option for items in trash
  - "Empty Trash" button to delete all trashed items at once
  - Trash items excluded from default post queries and dashboard counts
  - Red badge indicator for trashed items
  - Status filter tabs: All, Published, Draft, Pending, and Trash
  - Same permission system applies to trash operations (can_delete, can_delete_others)
- **Bulk Actions for Posts**
  - Select multiple posts using checkboxes
  - "Select All" checkbox in table header
  - Bulk actions dropdown with context-aware options
  - Bulk move to trash (available in non-trash views)
  - Bulk restore (available in trash view)
  - Bulk permanent delete (available in trash view)
  - Visual feedback showing number of selected items
  - Confirmation dialogs for all bulk operations
  - Selected items automatically cleared when changing status filters
- **Smart Status Tabs with Counts**
  - Post counts displayed next to each status tab (e.g., "Published (5)")
  - Tabs with zero posts are automatically hidden
  - Auto-switch to first available tab when current filter has no posts
  - Counts update in real-time after post operations
  - Efficient parallel API requests for fetching counts
- **Author Reassignment**
  - New `can_reassign` permission to control author changes
  - Author selector added to Page Attributes section in post editor
  - Change post author to any user in the system
  - Permission enforced at both UI and API levels
  - Only available when editing existing posts
  - Default permissions: Admin and Editor can reassign, Author cannot
- **UI Improvements**
  - "Add New" button now appears on post edit pages for quick content creation

### Changed
- Updated documentation to reflect current feature set and architecture
- "Delete" button now labeled as "Trash" to clarify action
- Delete API endpoint now soft-deletes posts by setting status to 'trash'

### Added (API)
- `POST /api/posts/:id/restore` - Restore post from trash
- `DELETE /api/posts/:id/permanent-delete` - Permanently delete post from database
- `DELETE /api/posts/trash/empty` - Empty all items from trash

## [1.8.0] - 2025-09-16

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

## [1.7.0] - 2025-09-11

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

## [1.6.0] - 2025-09-05

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

## [1.5.0] - 2025-08-31

### Added
- **Content Body Styling** for public pages
  - Comprehensive CSS for all WYSIWYG-generated HTML elements
  - Proper heading sizes (h1-h6) with appropriate font weights and spacing
  - Styled paragraphs, lists (ul/ol), blockquotes, code blocks
  - Table styling with borders and headers
  - Link hover effects and inline formatting (bold, italic)
  - Responsive images with rounded corners
  - All content now displays beautifully on public site

## [1.4.0] - 2025-08-25

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

## [1.3.0] - 2025-08-19

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

## [1.2.0] - 2025-08-14

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

## [1.1.0] - 2025-08-08

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

## [1.0.0] - 2025-08-03

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

