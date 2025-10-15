# Changelog

All notable changes to Next CMS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

