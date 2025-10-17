# Changelog

All notable changes to Next CMS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.0] - 2025-10-17

### Added
- **REST API v1 Foundation** - Complete headless CMS API infrastructure
  - **API Structure & Versioning**: Versioned API endpoints at `/api/v1/`
    - API root endpoint with documentation and feature list
    - Health check endpoint for monitoring
    - Comprehensive API documentation (README.md)
    - CORS support with configurable origins
    - OPTIONS handlers for preflight requests
  - **Response Standardization**:
    - Consistent JSON response format with success/error states
    - Standardized error codes and messages (400, 401, 403, 404, 409, 422, 429, 500, 503)
    - Pagination support with navigation links (prev, next, first, last)
    - Metadata in all responses (timestamp, version)
    - Pre-built error response helpers
  - **Request Validation**:
    - Required field validation
    - Pagination validation (page, per_page with 100 item limit)
    - Sort parameter validation with field whitelisting
    - Field selection validation for sparse fieldsets
    - Email, URL, and date format validation
    - String length validation
    - Enum value validation
  - **Authentication & Security**:
    - JWT token-based authentication
    - Access tokens (1 hour expiry, configurable)
    - Refresh tokens (7 days expiry, configurable)
    - Token blacklisting for logout
    - API key authentication support
    - Bearer token extraction and validation
    - Rate limiting (in-memory, 100/hour unauthenticated, 1000/hour authenticated)
    - Multi-site support via headers or query params
  - **Authentication Endpoints**:
    - `POST /api/v1/auth/login` - User authentication with JWT token generation
    - `POST /api/v1/auth/refresh` - Refresh access token using refresh token
    - `POST /api/v1/auth/logout` - Logout with token blacklisting
    - `GET /api/v1/auth/me` - Get current authenticated user details
  - **Authentication Features**:
    - bcrypt password hashing
    - Role-based authentication (super_admin, admin, editor, author, contributor, guest)
    - Permission checking middleware
    - Activity logging for login/logout events
    - Account status validation
    - Site assignment support
  - **Developer Tools**:
    - Complete API documentation with examples
    - Authentication flow documentation
    - curl examples for testing
    - PowerShell examples for Windows
    - Error response documentation
    - Implementation progress tracker
- **Posts API** - Complete CRUD operations for posts
  - **List Posts** (`GET /api/v1/posts`):
    - Pagination with configurable page size (max 100 items)
    - Advanced filtering by status, author, date range, post type
    - Full-text search in title and content
    - Sorting by multiple fields (ascending/descending)
    - Include related resources (author, categories, tags, featured_image)
    - Navigation links (prev, next, first, last)
  - **Get Single Post** (`GET /api/v1/posts/:id`):
    - Complete post details
    - Include author, categories, tags, featured_image, revisions
    - SEO metadata (title, description, keywords)
    - Custom fields support
  - **Create Post** (`POST /api/v1/posts`):
    - Automatic slug generation from title
    - Support for all post types
    - Status management (draft, pending, published, scheduled, private)
    - Category and tag associations
    - Featured image assignment
    - SEO fields
    - Custom fields (JSON object)
    - Activity logging
  - **Update Post** (`PUT /api/v1/posts/:id`):
    - Full post updates with slug regeneration
    - Category and tag management
    - All fields updatable
  - **Partial Update** (`PATCH /api/v1/posts/:id`):
    - Update only specified fields
    - Efficient for status changes or quick edits
  - **Delete Post** (`DELETE /api/v1/posts/:id`):
    - Soft delete support
    - Activity logging
    - Cascade deletion of related data
  - **Features**:
    - Multi-site aware (all operations site-specific)
    - Authentication required
    - Activity logging for all operations
    - Automatic author assignment
    - Conflict detection (duplicate slugs)
    - Comprehensive error handling
    - CORS support

### Changed
- **Dependencies**: Added JWT support
  - Added `jsonwebtoken` package for token generation and validation
  - Added `@types/jsonwebtoken` for TypeScript support

### Technical Details
- API utilities organized in `lib/api/` directory
  - `response.ts` - Response formatting and error handling
  - `validation.ts` - Request validation helpers
  - `middleware.ts` - API middleware utilities
  - `jwt.ts` - JWT token generation and validation
  - `auth-middleware.ts` - Authentication middleware
- API endpoints organized in `app/api/v1/` directory
- TypeScript type safety throughout
- All linting rules passing
- Comprehensive JSDoc comments

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

