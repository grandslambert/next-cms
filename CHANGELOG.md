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

See [changelog/v1.18.1.md](changelog/v1.18.1.md) for details.

## [1.18.0] - 2025-10-16

See [changelog/v1.18.0.md](changelog/v1.18.0.md) for details.

## [1.17.1] - 2025-10-16

See [changelog/v1.17.1.md](changelog/v1.17.1.md) for details.

## [1.17.0] - 2025-10-16

See [changelog/v1.17.0.md](changelog/v1.17.0.md) for details.

## [1.16.0] - 2025-10-16

See [changelog/v1.16.0.md](changelog/v1.16.0.md) for details.

## [1.15.0] - 2025-10-16

See [changelog/v1.15.0.md](changelog/v1.15.0.md) for details.

## [1.14.2] - 2025-10-16

See [changelog/v1.14.2.md](changelog/v1.14.2.md) for details.

## [1.14.1] - 2025-10-16

See [changelog/v1.14.1.md](changelog/v1.14.1.md) for details.

## [1.14.0] - 2025-10-16

See [changelog/v1.14.0.md](changelog/v1.14.0.md) for details.

## [1.13.0] - 2025-10-12

See [changelog/v1.13.0.md](changelog/v1.13.0.md) for details.

## [1.12.0] - 2025-10-07

See [changelog/v1.12.0.md](changelog/v1.12.0.md) for details.

## [1.11.0] - 2025-10-02

See [changelog/v1.11.0.md](changelog/v1.11.0.md) for details.

## [1.10.0] - 2025-09-27

See [changelog/v1.10.0.md](changelog/v1.10.0.md) for details.

## [1.9.0] - 2025-09-22

See [changelog/v1.9.0.md](changelog/v1.9.0.md) for details.

## [1.8.0] - 2025-09-16

See [changelog/v1.8.0.md](changelog/v1.8.0.md) for details.

## [1.7.0] - 2025-09-11

See [changelog/v1.7.0.md](changelog/v1.7.0.md) for details.

## [1.6.0] - 2025-09-05

See [changelog/v1.6.0.md](changelog/v1.6.0.md) for details.

## [1.5.0] - 2025-08-31

See [changelog/v1.5.0.md](changelog/v1.5.0.md) for details.

## [1.4.0] - 2025-08-25

See [changelog/v1.4.0.md](changelog/v1.4.0.md) for details.

## [1.3.0] - 2025-08-19

See [changelog/v1.3.0.md](changelog/v1.3.0.md) for details.

## [1.2.0] - 2025-08-14

See [changelog/v1.2.0.md](changelog/v1.2.0.md) for details.

## [1.1.0] - 2025-08-08

See [changelog/v1.1.0.md](changelog/v1.1.0.md) for details.

## [1.0.0] - 2025-08-03

See [changelog/v1.0.0.md](changelog/v1.0.0.md) for full details of the initial release.

