# Changelog

All notable changes to Next CMS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.2] - 2025-10-21

### Fixed

- **User Switching**
  - JWT callback now properly handles `switchData` for session persistence
  - Fixed all ID types from number to string for MongoDB ObjectIds
  
- **Media Library**
  - Fixed field name mapping for frontend compatibility (mimetype, original_filename, filepath)
  - Implemented complete image size generation with proper crop styles
  - Fixed folder navigation to show correct subfolders
  - Added folder counts (file_count, subfolder_count)
  - Fixed permanent deletion to remove all size variants from server
  - Added trash count badge with automatic updates
  - Fixed bulk actions (405 error, parameter mismatch)
  - Implemented hierarchical folder display in move modals
  
- **Image Regeneration**
  - Fully implemented regenerate API with Sharp
  - Added bulk regenerate option for selected images
  - Deletes old variants before creating new ones

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
