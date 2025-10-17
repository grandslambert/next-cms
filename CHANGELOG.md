# Changelog

All notable changes to Next CMS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2025-10-17

### Added
- **Multiple Export Formats** - Enhanced import/export system with 5 different export formats
  - **JSON Export**: Standard format for backing up and migrating between Next CMS sites
  - **XML Export (WordPress WXR)**: WordPress-compatible export format for migrating content to/from WordPress
    - Includes posts, pages, authors, taxonomies, terms, and metadata
    - Full WordPress WXR 1.2 specification compliance
    - Perfect for cross-platform content migration
  - **CSV Export**: Multiple CSV files in a ZIP archive for data analysis
    - Separate CSVs for posts, media, taxonomies, and users
    - Includes README.txt with export details
    - Ideal for Excel/Google Sheets analysis
    - Note: CSV format is for analysis only, cannot be imported back
  - **SQL Dump Export**: Complete database dump in SQL format
    - Can be executed directly on MySQL
    - Includes INSERT statements for all data
    - Useful for direct database operations and advanced migrations
  - **Full ZIP Archive Export**: Most comprehensive backup solution
    - Contains export.json with complete data export
    - Includes actual media files in uploads/ directory
    - Includes README.txt with restoration instructions
    - Largest file size but most complete backup option
- **Enhanced Export UI** - Visual format selector with clear descriptions
  - 5 format options with use case explanations
  - Grid-based format selection interface
  - Comprehensive format guide section explaining each format
  - Maintains existing data type selection (posts, media, taxonomies, etc.)
  - Format-specific help text and warnings
- **Enhanced Import UI** - Support for multiple import formats
  - Now accepts both JSON and ZIP files
  - Automatically extracts export.json from ZIP archives
  - Updated file picker interface
  - Enhanced import notes explaining ZIP support
  - Seamless handling of both formats
- **Export Utilities Library** - New lib/export-utils.ts with format generation functions
  - generateWordPressXML() - Creates WordPress WXR XML
  - generatePostsCSV() - Creates posts CSV export
  - generateMediaCSV() - Creates media CSV export
  - generateTaxonomiesCSV() - Creates taxonomies CSV export
  - generateUsersCSV() - Creates users CSV export
  - generateSQLDump() - Creates SQL dump export
  - Proper escaping and formatting for each format type
- **Smart Media Folder Deletion** - Enhanced recursive folder deletion with content management
  - **Recursive Deletion**: Automatically handles nested folder structures
    - Deletes parent folder and all subfolders in one operation
    - Recursively processes entire folder tree
    - Shows count of subfolders that will be deleted
  - **Content Management Dialog**: When folder contains media files, presents options:
    - Option 1: Move all files to another folder (including root/media library)
      - Consolidates all media from nested folders into target location
      - Can select ANY folder in the site (not just siblings)
    - Option 2: Permanently delete all files from database and server
      - Removes physical files from filesystem
      - Cleans up all file variants (thumbnails, sizes, etc.)
  - **Intelligent Folder Selection**:
    - New `/api/media/folders/all` endpoint provides complete folder tree
    - Folders displayed with hierarchical indentation (e.g., "â€”â€” Subfolder")
    - Automatically excludes folder being deleted and its descendants from selection
    - Applies to delete dialog, move media modal, and bulk move operations
  - **Visual Feedback**: Loading overlay displays during folder operations
  - **Clear Information**: Shows counts for files and subfolders before deletion
  - **Safe Defaults**: Move option selected by default to prevent accidental data loss
  - **Smart Confirmation**: Empty folders delete immediately with simple confirmation

### Changed
- **Import/Export System** - Significantly enhanced backup and migration capabilities
  - Export API now supports format parameter (json, xml, csv, sql, zip)
  - Import API now handles ZIP files with automatic extraction
  - Added archiver package for ZIP creation
  - Added jszip package for ZIP extraction
  - Updated export endpoint to return different content types based on format
  - Media files can now be included in Full ZIP exports
  - **Activity Logging**: All import/export operations are now logged in the activity log
    - Export logs include format, data types exported, and item counts
    - Import logs include file type, summary, and detailed statistics
    - Both operations include IP address and user agent for audit trail

### Fixed
- **Export File Extensions** - Downloads now use correct file extensions based on format
  - Frontend now reads filename from Content-Disposition header
  - Previously all exports were incorrectly named with .json extension
  - Each format now downloads with its proper extension (.xml, .zip, .sql, .json)
- **Multi-Site API Routes** - Comprehensive fix to ensure all routes are site-aware
  - **Menu Locations**: GET and POST routes now use site-prefixed tables
  - **Scheduled Posts Processor**: Now processes scheduled posts across all active sites
  - **Media Bulk Operations**: Trash, restore, move, and permanent delete now site-aware
  - **Media Trash Management**: Empty trash and permanent delete now site-aware
  - **Media Move**: Move media between folders now site-aware
  - All operations now correctly query and update site-specific tables using `getSiteTable()`
  - Activity logging now includes `siteId` for proper audit trails
  - Each site now has complete data isolation
- **Navigation/Menus Page** - Fixed infinite loading and menu update failures
  - Page now properly handles empty menu state
  - `menuPreferenceLoaded` is now set even when no menus exist
  - Users can now access the page to create their first menu
  - **Menu Item Metadata**: Fixed meta save endpoint to be site-aware (`/api/menu-items/[id]/meta`)
  - **Menu Item Reorder**: Fixed reorder endpoint to be site-aware (`/api/menu-items/reorder`)
  - Both endpoints now use `getSiteTable()` for proper multi-site support
  - Menu updates now save correctly without errors
  
**Complete Multi-Site Audit Results:**
After comprehensive review of ALL 58 API routes, confirmed that all site-specific operations are properly isolated:
- âœ… All 58 API routes audited
- âœ… All routes querying site-specific tables use `getSiteTable()`
- âœ… Complete data isolation between sites achieved
- âœ… Only 2 routes needed fixes (menu item meta and reorder - now corrected)
- âœ… All posts, media, taxonomies, terms, settings, menus, and post types routes properly site-aware
- **Post Type Deletion**: Fixed incorrect field name in deletion check
  - Was checking `post_type_id` (doesn't exist) 
  - Now correctly checks `post_type` (VARCHAR field with post type name)
  - Post types can now be deleted when no posts are using them

### Technical Details
- New dependencies: archiver, @types/archiver, jszip
- Export route uses Node.js fs and path modules for file operations
- ZIP archives use streaming with archiver for memory efficiency
- Import route automatically detects file type by extension
- All export formats properly escape special characters
- SQL dumps use prepared statement compatible format
- Frontend extracts filename from Content-Disposition header for correct file extensions

## [2.1.1] - 2025-10-17

See [changelog/v2.1.1.md](changelog/v2.1.1.md) for details.

## [2.1.0] - 2025-10-17

See [changelog/v2.1.0.md](changelog/v2.1.0.md) for details.

## [2.0.1] - 2025-10-17

See [changelog/v2.0.1.md](changelog/v2.0.1.md) for details.

## [2.0.0] - 2025-10-17

See [changelog/v2.0.0.md](changelog/v2.0.0.md) for details.

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

