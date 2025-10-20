# Changelog

All notable changes to Next CMS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.1] - 2025-10-20

### Fixed

- **Dependencies**
  - Removed `mysql2` package - all code fully migrated to MongoDB
  
- **Post Type Support Configuration**
  - Fixed default support arrays for Posts and Pages to include all features (`title`, `editor`, `thumbnail`, `excerpt`, `comments`, `custom_fields`, `author`)
  - Fixed TypeScript errors in post type API routes with proper type casting for MongoDB lean queries
  - Updated database initialization script to ensure post editor displays all UI components

See [changelog/v3.0.1.md](changelog/v3.0.1.md) for details.

---

## [3.0.0] - 2025-10-20

### 🚨 BREAKING CHANGES

**Complete MongoDB Migration** - Version 3.0.0 marks the full transition from MySQL to MongoDB for core CMS features.

- **New Installations:** Must use MongoDB (MongoDB Atlas or local MongoDB)
- **Existing MySQL Installations:** NOT compatible with this version
- **No Migration Path:** Fresh MongoDB implementation, not a MySQL migration
- **Database Required:** MongoDB connection required in `.env` file

### Added

- **MongoDB Core Implementation**
  - MongoDB connection layer with Mongoose (`lib/mongodb.ts`)
  - Connection pooling, caching, and multi-site support
  - 15 Mongoose models for complete CMS functionality
  - Database initialization script with defaults (`scripts/init-mongodb.ts`)
  - NPM scripts: `npm run db:init` and `npm run db:init:clear`

- **Mongoose Models (15 Total)**
  - User, Site, Role, SiteUser, Setting, GlobalSetting
  - PostType, Post, Taxonomy, Term, PostTerm
  - Menu, MenuItem, MenuLocation, ActivityLog

- **Converted API Routes (25+ routes)**
  - Authentication (NextAuth with MongoDB)
  - Sites Management (full CRUD + user assignments)
  - Settings Management (site-specific + global)
  - Users Management (full CRUD)
  - Roles Management (list, create)
  - Activity Log (read, filter)
  - Post Types (list, create)
  - Menus (public read)

- **Documentation**
  - Quick Start Guide (`QUICKSTART.md`)
  - MongoDB Getting Started (`Documentation/MONGODB_GETTING_STARTED.md`)
  - MongoDB Status (`MONGODB_STATUS.md`)

### Changed

- **Authentication System**
  - Complete migration to MongoDB backend
  - Created `lib/auth-mongo.ts` for MongoDB authentication
  - Updated all API routes to use MongoDB auth
  - Session now uses string-based MongoDB ObjectIds

- **Session Management**
  - `currentSiteId` and `roleId` now stored as strings (MongoDB ObjectIds)
  - Updated TypeScript types across application
  - Added ObjectId validation in API routes

- **Type System**
  - All database IDs changed from `number` to `string`
  - Consistent `_id` to `id` mapping in API responses
  - 24-character hex string validation for ObjectIds

- **Dependencies**
  - Added `mongoose@^8.0.3`, `dotenv@^16.3.1`, `ts-node@^10.9.2`
  - Retained `mysql2` for features not yet converted

### Fixed

- **ObjectId Validation** - Prevents invalid ID format errors
- **Session Handling** - Proper optional chaining across all API routes
- **Role Permissions** - Fixed Mongoose Map serialization issues
- **Site Management** - Consistent ID mapping from `_id` to `id`
- **User Management** - Fixed role selection and ObjectId handling
- **Menu System** - Complete MySQL removal, MongoDB-based retrieval
- **Frontend Components** - Type safety for string-based IDs

### Known Limitations

**Features Not Yet Converted (Still Using MySQL):**
- Posts/Pages creation and editing
- Categories & Tags management (admin)
- Media library
- Menus admin interface
- Comments system

See [changelog/v3.0.0.md](changelog/v3.0.0.md) for complete details.

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
