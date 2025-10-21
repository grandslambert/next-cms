# Changelog

All notable changes to Next CMS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.3] - 2025-01-21

### Fixed

- **Database Architecture Fixes**
  - Fixed critical issues with multi-database architecture where Site ID references were inconsistent
  - Changed Site references from `Site._id` (ObjectId) to `Site.id` (Number) throughout the codebase
  - Fixed `SiteUser.site_id` and `UserMeta.site_id` to use Number instead of ObjectId
  - Removed `site_id` filters from all site-specific models (they're in separate databases)

- **SuperAdmin Functionality**
  - Fixed user creation with proper role validation using `GlobalModels.Role()`
  - Fixed site_id conversion from ObjectId to Number in site assignments
  - Fixed user list queries to use numeric site IDs
  - Fixed all site routes (GET, POST, PUT, DELETE) to use `Site.findOne({ id: siteId })`
  - Fixed site creation to use numeric IDs for database initialization
  - Fixed site user assignment routes to use numeric site_id
  - Fixed site switching to use numeric site ID validation

- **Activity Logging**
  - Fixed activity log to correctly log to global database for SuperAdmin actions
  - Fixed activity log viewer to query global database by default for SuperAdmin
  - Removed site_id from global action logging (user creation, site creation, etc.)
  - Fixed site lookup in activity logs to use numeric site.id

- **API Routes**
  - Post Types: Completely rewritten to use `SiteModels.PostType(siteId)` and removed site_id filters
  - Settings: Removed site_id filters from site-specific settings queries
  - User Metadata: Fixed to use numeric site_id in global UserMeta model
  - Site Users: Fixed all routes to use numeric site_id for SiteUser queries
  - Authentication: Fixed switch-site route to use numeric site ID

- **Developer Experience**
  - Added `dev:clean` script to kill node processes and clear build caches
  - Separated dev startup from cache cleaning for better control
  - Created comprehensive database structure documentation (`DATABASE_STRUCTURE_FINAL.md`)

See [changelog/v3.0.3.md](changelog/v3.0.3.md) for details.

---

## [3.0.2] - 2025-10-21

See [changelog/v3.0.2.md](changelog/v3.0.2.md) for details.

---

## [3.0.1] - 2025-10-20

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
