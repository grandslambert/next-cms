# Changelog

All notable changes to Next CMS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.0] - 2025-10-21

### Added
- **Posts System**:
  - Full multi-database architecture migration for all posts endpoints
  - Autosave GET endpoint to retrieve saved drafts
  - Autosave DELETE endpoint to clear saved drafts
  - Featured image URL support in posts list and single post endpoints
  - Proper handling of ObjectId validation using `mongoose.Types.ObjectId.isValid()`

- **Terms**:
  - Image support for taxonomy terms via `meta.image_id` field
  - Image URL retrieval in terms list and single term endpoints
  - Batch meta updates in POST and PUT handlers

- **Posts Editor**:
  - Autosave timestamp (`saved_at`) in autosave responses
  - Proper display of last saved time
  - Support for both nested and flat autosave data formats

### Changed
- **Posts API**:
  - Migrated `/api/posts/[id]` to multi-database architecture
  - Migrated `/api/posts/[id]/terms` to multi-database architecture
  - Migrated `/api/posts/[id]/permanent-delete` to multi-database architecture
  - Migrated `/api/posts/[id]/restore` to multi-database architecture
  - Migrated `/api/posts/[id]/revisions` to multi-database architecture
  - Migrated `/api/posts/autosave` to multi-database architecture
  - Migrated `/api/posts/process-scheduled` to multi-database architecture
  - Migrated `/api/posts/trash/empty` to multi-database architecture
  - Updated `/api/posts/[id]/meta` to make custom fields optional
  - Featured images now use `filepath` field instead of non-existent `url` field

- **Terms API**:
  - `/api/posts/[id]/terms` now accepts both `taxonomy` (name) and `taxonomy_id` (ObjectId) parameters
  - Terms endpoints now fetch and return image URLs from Media collection
  - POST and PUT handlers now accept and save `meta` and `image_id` fields

- **Type Safety**:
  - Added `as any[]` type assertions to `.lean()` queries throughout codebase
  - Changed `selectedTerms` state type from `{[taxonomyId: number]: number[]}` to `{[taxonomyId: string]: number[]}`
  - Fixed Set iteration issues by using `Array.from()` instead of spread operator

- **Import Fixes**:
  - Updated all `next-auth` imports to `next-auth/next` for consistency
  - Added missing `mongoose` imports where needed

### Fixed
- **Posts**:
  - Featured images now load correctly in both posts list and post editor
  - Taxonomy terms now filter correctly by taxonomy in post columns
  - Post meta no longer requires `meta_key` when custom fields are not provided
  - Autosave modal now displays when returning to a post with saved draft
  - "Last saved" time now displays correctly instead of "Invalid Date"

- **Terms**:
  - Taxonomy term images now save and display correctly
  - Terms list now shows proper taxonomy-specific terms in columns

- **Type Errors**:
  - Fixed `'r._id' is of type 'unknown'` errors in users route
  - Fixed `Type 'Set<any>' can only be iterated through` errors
  - Fixed `Element implicitly has an 'any' type` errors in PostTypeForm

### Technical
- All posts-related endpoints now use `SiteModels.Post(siteId)` and `GlobalModels.User()`
- Removed all `connectDB()` calls from migrated endpoints
- Removed `site_id` filters from queries (implicit in site-specific database)
- Updated `logActivity` calls to use `siteId` parameter
- Proper handling of MongoDB ObjectId vs Number for site identifiers

## [3.0.4] - 2025-10-21

See [changelog/v3.0.4.md](changelog/v3.0.4.md) for details.

## [3.0.3] - 2025-01-21

See [changelog/v3.0.3.md](changelog/v3.0.3.md) for details.

## [3.0.2] - 2025-01-21

See [changelog/v3.0.2.md](changelog/v3.0.2.md) for details.

## [3.0.1] - 2025-01-21

See [changelog/v3.0.1.md](changelog/v3.0.1.md) for details.

## [3.0.0] - 2025-01-21

See [changelog/v3.0.0.md](changelog/v3.0.0.md) for details.

---

## [2.3.4] - 2025-01-20

See [changelog/v3.0.1.md](changelog/v3.0.1.md) for details.

---

## [3.0.0] - 2025-10-20

See [changelog/v3.0.0.md](changelog/v3.0.0.md) for details.

---

## [2.3.4] - 2025-10-20

See [changelog/v2.3.4.md](changelog/v2.3.4.md) for details.

## [2.3.3] - 2025-10-17

See [changelog/v2.3.3.md](changelog/v2.3.3.md) for details.

## [2.3.2] - 2025-10-17

See [changelog/v2.3.2.md](changelog/v2.3.2.md) for details.

## [2.3.1] - 2025-10-17

See [changelog/v2.3.1.md](changelog/v2.3.1.md) for details.

## [2.3.0] - 2025-10-17

See [changelog/v2.3.0.md](changelog/v2.3.0.md) for details.

## [2.2.0] - 2025-10-17

See [changelog/v2.2.0.md](changelog/v2.2.0.md) for details.

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
