# Next CMS

A complete Content Management System built with Next.js 14, Tailwind CSS, and MySQL - similar to WordPress.

## Current Version: 1.3.4

See [CHANGELOG.md](CHANGELOG.md) for version history and release notes.

## Features

- 📝 **Unified Content System** 
  - Custom post types (posts, pages, portfolios, products, events, etc.)
  - Hierarchical support for parent/child relationships
  - Configurable features per post type (title, content, excerpt, featured image, taxonomies)
  - Built-in post types: Posts (blog) and Pages (static content)
  - Trash system with restore and permanent delete capabilities
  - Bulk actions for managing multiple posts at once
  - Smart status filtering with real-time post counts
  - Post revisions with configurable history limit and one-click restore
  - Custom fields (post meta) for unlimited key-value data
  - Scheduled publishing with cron job integration
- 🏷️ **Flexible Taxonomy System** - Create custom taxonomies (categories, tags, etc.) for any post type with hierarchical support
- 🖼️ **Advanced Media Library** 
  - WordPress-style automatic image resizing with multiple size variants
  - Image metadata (title and alt text) for SEO and accessibility
  - Folder organization with hierarchical structure
  - Drag and drop to move files between folders
  - Trash system with restore and permanent delete
  - Bulk actions (move, trash, restore, delete)
  - File count badges on folders
  - Breadcrumb navigation for folder browsing
  - Regenerate image sizes when settings change
  - Date-based file storage (YYYY/MM on filesystem)
  - Customizable image sizes with crop styles (cover, inside, contain, fill)
  - Compact grid layout showing more items at once
- ✏️ **Rich Text Editor** - Full-featured WYSIWYG editor (react-simple-wysiwyg)
- 🔐 **Authentication** - Secure login system with NextAuth.js
- 👥 **Advanced User Management** 
  - Custom role creation with granular permissions
  - Per-post-type permission control (manage, edit, delete)
  - Content workflow with pending review status
  - Author reassignment capability
  - Role-based admin interface visibility
- 🔍 **Advanced Post List Features**
  - Powerful search across title and content (debounced)
  - Column filters for title, author, status, taxonomies, and date
  - Customizable columns with user-specific preferences
  - Featured image thumbnails in list view
  - Items per page selector (10, 25, 50, 100)
  - Smart pagination with page numbers and navigation
- ⚙️ **Settings System** - Configurable site name, tagline, media settings, revisions limit, and session timeout
- 🎨 **Beautiful UI** - Modern, responsive interface with Tailwind CSS
- ⚡ **Fast & SEO-Friendly** - Server-side rendering with Next.js 14
- 🗄️ **MySQL Database** - Robust relational database for content storage

## Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MySQL
- **Authentication**: NextAuth.js
- **Rich Text Editor**: React Quill
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form
- **Notifications**: React Hot Toast

## Prerequisites

- Node.js 18+ 
- MySQL 8+
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd next-cms
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   
   Create a MySQL database:
   ```sql
   CREATE DATABASE nextcms;
   ```

   Import the schema:
   ```bash
   mysql -u root -p nextcms < database/schema.sql
   ```

4. **Configure environment variables**
   
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

   Update `.env` with your configuration:
   ```env
   # Database
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=nextcms

   # NextAuth
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key-here

   # Upload
   UPLOAD_DIR=./public/uploads

   # Session timeout in seconds (default: 86400 = 24 hours)
   SESSION_TIMEOUT=86400
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Default Credentials

The database schema includes a default admin user:

- **Email**: admin@example.com
- **Password**: admin123

⚠️ **Important**: Change these credentials immediately after first login in production!

## Project Structure

```
next-cms/
├── app/                       # Next.js app directory
│   ├── (public)/             # Public-facing pages
│   │   ├── page.tsx          # Homepage
│   │   ├── blog/             # Blog listing and posts
│   │   └── [...slug]/        # Dynamic hierarchical pages
│   ├── admin/                # Admin dashboard
│   │   ├── page.tsx          # Dashboard with content summary
│   │   ├── content-types/    # Content types management
│   │   │   ├── post-types/   # Post type definitions
│   │   │   └── taxonomies/   # Taxonomy definitions
│   │   ├── post-type/        # Dynamic post type content
│   │   │   └── [slug]/       # Posts for each type (list, new, edit)
│   │   ├── taxonomy/         # Dynamic taxonomy terms
│   │   │   └── [slug]/       # Terms for each taxonomy
│   │   ├── media/            # Media library
│   │   ├── users/            # User management
│   │   │   └── roles/        # Custom roles & permissions
│   │   ├── settings/         # Site settings
│   │   │   ├── page.tsx      # General settings
│   │   │   └── media/        # Media settings
│   │   └── login/            # Login page
│   └── api/                  # API routes
│       ├── auth/             # Authentication
│       ├── posts/            # Posts CRUD
│       │   ├── [id]/         # Single post operations
│       │   │   ├── restore/          # Restore from trash
│       │   │   ├── permanent-delete/ # Hard delete
│       │   │   ├── revisions/        # Post revisions
│       │   │   └── meta/             # Custom fields
│       │   ├── trash/empty/  # Empty trash
│       │   └── process-scheduled/ # Cron endpoint
│       ├── post-types/       # Post types management
│       ├── taxonomies/       # Taxonomies management
│       ├── terms/            # Terms management
│       ├── users/            # User management
│       ├── roles/            # Roles & permissions
│       ├── media/            # Media upload/management
│       ├── settings/         # Settings management
│       └── user/             # User metadata/preferences
│           └── meta/         # User preferences (columns, items per page)
├── components/               # React components
│   ├── admin/               # Admin components
│   │   ├── media/           # Media library components
│   │   │   ├── MediaUploadProgress.tsx
│   │   │   ├── MediaGrid.tsx
│   │   │   ├── EditMediaModal.tsx
│   │   │   ├── FolderModal.tsx
│   │   │   ├── MoveMediaModal.tsx
│   │   │   ├── BulkMoveModal.tsx
│   │   │   ├── LoadingOverlay.tsx
│   │   │   └── TrashView.tsx
│   │   ├── post-editor/     # Post editor sub-components
│   │   ├── PostTypeForm.tsx # Main post editor
│   │   ├── MediaSelector.tsx # Featured image picker
│   │   └── Sidebar.tsx      # Admin navigation
│   └── public/              # Public components
├── hooks/                   # Custom React hooks
│   └── usePermission.ts    # Permission checking
├── lib/                     # Utility functions
│   ├── db.ts               # Database connection
│   ├── auth.ts             # Authentication config
│   └── utils.ts            # Helper functions
├── database/                # Database schema
│   └── schema.sql          # Complete database structure
├── scripts/                # Utility scripts
│   └── sync-session-timeout.js # Sync session timeout to .env
└── public/                 # Static files
    └── uploads/            # Uploaded media files
```

## Usage

### Admin Panel

Access the admin panel at `/admin`:

1. **Dashboard** - Overview of your content with post type and taxonomy counts
2. **Post Types** - View and manage content for each post type (Posts, Pages, etc.)
3. **Content Types** - Create and configure custom post types and taxonomies
4. **Taxonomies** - Manage terms (categories, tags) for your content
5. **Media** - Upload and manage media files
6. **Users** - Manage users and custom roles with granular permissions
7. **Settings** - Configure site name, tagline, media sizes, revisions limit, and session timeout

### Creating Content

1. Navigate to the desired post type (Posts, Pages, etc.)
2. Click "New [Post Type]"
3. Fill in the title and content using the rich text editor
4. Add custom fields for additional metadata (key-value pairs)
5. Select parent (for hierarchical content), taxonomies, and featured image
6. Change author if you have `can_reassign` permission
7. Set the status:
   - **Draft** - Save without publishing
   - **Pending** - Submit for review (if you can't publish)
   - **Published** - Make content live (requires `can_publish` permission)
   - **Scheduled** - Set a future publish date/time
8. Click "Publish", "Update", "Schedule", or "Submit for Review" based on your permissions
9. View revision history and restore previous versions if needed

### Managing Content

**Status Filtering:**
- Use tabs to filter posts by status (All, Published, Draft, Pending, Trash)
- Counts show number of posts in each status
- Tabs with zero posts are automatically hidden

**Bulk Actions:**
1. Select multiple posts using checkboxes
2. Choose an action from the dropdown:
   - **Move to Trash** - Soft delete multiple posts
   - **Restore** - Recover posts from trash
   - **Delete Permanently** - Permanently remove posts from database
3. Click "Apply" to execute the action

**Trash System:**
- Deleted posts move to trash (not permanently deleted)
- View trashed items via the "Trash" status tab
- Restore individual posts or empty entire trash
- Permanent deletion only available from trash view

**Search and Filtering:**
- Use the search bar to find posts by title or content
- Apply column filters for precise results
- Combine multiple filters for advanced queries
- Results update automatically as you type (debounced)

**List Customization:**
- Toggle column visibility (featured image, author, status, taxonomies, date)
- Choose items per page (10, 25, 50, or 100)
- Navigate with pagination controls
- Settings saved per user and per post type

**Revisions:**
- View complete revision history for any post
- See what changed, when, and by whom
- Restore any previous version with one click
- Automatic cleanup based on max revisions setting

### Media Management

**Organizing Media:**
1. Go to the Media Library
2. Create folders to organize files by clicking "New Folder"
3. Navigate folders with breadcrumb navigation
4. Upload files into the current folder

**Working with Files:**
1. Click "Upload Files" to add new media
2. Drag and drop files onto folders to move them
3. Use bulk actions to move or delete multiple files at once
4. Edit title and alt text for SEO and accessibility
5. Copy URLs for use in posts/pages
6. Regenerate sizes if media settings change

**Trash System:**
1. Deleted files move to trash (not permanently deleted)
2. Click "Trash" button to view deleted files
3. Restore individual files or use bulk restore
4. Permanently delete files when ready
5. Empty entire trash with one click

### Managing Roles and Permissions

1. Navigate to **Users → Roles**
2. View system roles (Admin, Editor, Author) or create custom roles
3. Select a role to edit its permissions:
   - **General Permissions**: Core capabilities like managing media, users, settings
   - **Administration**: Manage post types, taxonomies, and roles
   - **Post Type Permissions**: Per-post-type control for each custom type
4. Clone existing roles to create variations
5. Assign roles to users in the Users management page

**Key Permissions:**
- `manage_posts_[type]` - Create/edit own posts of a specific type
- `manage_others_posts` - Edit/view others' posts
- `view_others_posts` - See others' posts in lists
- `can_publish` - Publish directly (vs. submit for review)
- `can_delete` / `can_delete_others` - Delete own/others' posts
- `can_reassign` - Change post authors
- `manage_media` - Upload and manage media files
- `manage_users` - Create and edit user accounts
- `manage_roles` - Create and edit custom roles
- `manage_post_types` - Create custom post types and taxonomies
- `manage_taxonomies` - Manage taxonomy terms
- `manage_settings` - Edit site settings

## API Routes

All API routes enforce role-based permissions. Unauthorized requests return 403 Forbidden.

### Posts (All Content)
- `GET /api/posts` - List posts (filtered by permissions)
- `GET /api/posts/:id` - Get single post
- `POST /api/posts` - Create post (requires `manage_posts_[type]`)
- `PUT /api/posts/:id` - Update post (checks ownership and permissions)
- `DELETE /api/posts/:id` - Move post to trash (soft delete)
- `POST /api/posts/:id/restore` - Restore post from trash
- `DELETE /api/posts/:id/permanent-delete` - Permanently delete post from database
- `DELETE /api/posts/trash/empty` - Empty all items from trash
- `GET /api/posts/:id/revisions` - Get post revision history
- `POST /api/posts/:id/revisions/:revisionId/restore` - Restore a specific revision
- `GET /api/posts/:id/meta` - Get post custom fields
- `PUT /api/posts/:id/meta` - Update post custom fields
- `GET /api/posts/process-scheduled` - Process scheduled posts (cron endpoint)

### Post Types
- `GET /api/post-types` - List all post types
- `POST /api/post-types` - Create post type (requires `manage_post_types`)
- `PUT /api/post-types/:id` - Update post type
- `DELETE /api/post-types/:id` - Delete post type

### Taxonomies
- `GET /api/taxonomies` - List all taxonomies
- `POST /api/taxonomies` - Create taxonomy (requires `manage_post_types`)
- `PUT /api/taxonomies/:id` - Update taxonomy
- `DELETE /api/taxonomies/:id` - Delete taxonomy

### Terms
- `GET /api/terms` - List terms (filtered by taxonomy)
- `POST /api/terms` - Create term (requires `manage_taxonomies`)
- `PUT /api/terms/:id` - Update term
- `DELETE /api/terms/:id` - Delete term

### Users
- `GET /api/users` - List users (requires `manage_users`)
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Roles
- `GET /api/roles` - List all roles
- `GET /api/roles/:id` - Get single role (requires `manage_roles`)
- `POST /api/roles` - Create role
- `PUT /api/roles/:id` - Update role permissions
- `DELETE /api/roles/:id` - Delete custom role

### Media
- `GET /api/media` - List all media (supports folder_id and trash filters)
- `POST /api/media` - Upload file (supports folder_id)
- `DELETE /api/media/:id` - Move file to trash (soft delete)
- `PUT /api/media/:id/move` - Move file to folder
- `POST /api/media/:id/restore` - Restore from trash
- `DELETE /api/media/:id/permanent-delete` - Permanently delete file
- `DELETE /api/media/trash/empty` - Empty entire trash

### Media Folders
- `GET /api/media/folders` - List folders (supports parent_id filter)
- `POST /api/media/folders` - Create folder
- `GET /api/media/folders/:id` - Get folder details
- `PUT /api/media/folders/:id` - Update folder (rename/move)
- `DELETE /api/media/folders/:id` - Delete folder

### Media Bulk Actions
- `POST /api/media/bulk` - Bulk operations (trash, restore, move)
- `POST /api/media/bulk/permanent-delete` - Bulk permanent delete

### Settings
- `GET /api/settings` - Get site settings (requires `manage_settings`)
- `PUT /api/settings` - Update settings

### User Meta
- `GET /api/user/meta` - Get user preference by key
- `PUT /api/user/meta` - Update user preference (column visibility, items per page, etc.)

## Database Schema

The system uses the following main tables:

- **users** - User accounts and authentication
- **roles** - Custom roles with granular permissions
- **posts** - All content (posts, pages, custom post types) with trash and scheduled status
- **post_revisions** - Complete revision history for posts
- **post_meta** - Custom fields (key-value pairs) for posts
- **user_meta** - User preferences and settings
- **post_types** - Custom post type definitions
- **taxonomies** - Custom taxonomy definitions
- **terms** - Taxonomy terms (categories, tags, etc.)
- **post_terms** - Post-term relationships
- **media** - Uploaded files with metadata, folder assignment, and soft delete (trash)
- **media_folders** - Hierarchical folder structure for organizing media
- **settings** - Site configuration (includes max_revisions and session_timeout)

## Deployment

### Database Setup

Ensure your production MySQL database is set up and the schema is imported.

### Environment Variables

Set all required environment variables in your hosting platform.

### Build

```bash
npm run build
npm start
```

### Hosting Recommendations

- **Vercel** - Recommended for Next.js apps
- **Railway** - Easy database and app hosting
- **DigitalOcean** - Full control with App Platform
- **AWS** - Elastic Beanstalk or ECS

## Documentation

Comprehensive guides for various features:

- [CHANGELOG.md](CHANGELOG.md) - Complete version history and release notes
- [CUSTOM_POST_TYPES.md](CUSTOM_POST_TYPES.md) - Creating and managing custom post types
- [SCHEDULED_PUBLISHING.md](SCHEDULED_PUBLISHING.md) - Setting up cron jobs for scheduled posts
- [SESSION_MANAGEMENT.md](SESSION_MANAGEMENT.md) - Configuring session timeout and security
- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) - Migrating from v1.0.2 to v1.0.3 (Pages to Post Types)
- [IMAGE_SYSTEM.md](IMAGE_SYSTEM.md) - WordPress-style image handling and sizing
- [IMAGE_CROP_STYLES.md](IMAGE_CROP_STYLES.md) - Image crop and fit strategies
- [IMAGE_REGENERATION.md](IMAGE_REGENERATION.md) - Regenerating image sizes
- [MEDIA_METADATA.md](MEDIA_METADATA.md) - Managing titles and alt text
- [MEDIA_SAFETY.md](MEDIA_SAFETY.md) - Safe media deletion with usage tracking
- [SETTINGS.md](SETTINGS.md) - Configuring site and media settings
- [VERSIONING.md](VERSIONING.md) - Semantic versioning guide
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues and solutions

**Note:** The roles and permissions system is fully integrated. See the "Managing Roles and Permissions" section above for details on creating custom roles and configuring granular access control.

## Security Considerations

1. Change default admin credentials
2. Use strong `NEXTAUTH_SECRET`
3. Enable HTTPS in production
4. Set up proper database backups
5. Implement rate limiting for API routes
6. Sanitize user input
7. Keep dependencies updated

## Future Enhancements

Completed features (see CHANGELOG for details):
- [x] Revision history with restore capability
- [x] Scheduled publishing with cron integration
- [x] Bulk actions for posts (trash, restore, delete)
- [x] Bulk actions for media (move, trash, restore, delete)
- [x] Advanced search and filtering with column filters
- [x] Custom fields (post meta) system
- [x] Pagination for post lists
- [x] Session timeout configuration
- [x] Media library folders with drag and drop
- [x] Media trash system with restore

Planned features:
- [ ] Comments system with moderation
- [ ] SEO metadata editor per post/page (title, description, keywords)
- [ ] Multi-language support (i18n)
- [ ] AI-generated content suggestions
- [ ] AI-generated alt text for images
- [ ] Analytics dashboard (page views, popular content)
- [ ] Email notifications (new comment, user registration, etc.)
- [ ] Custom themes with theme editor
- [ ] Plugin system for extensibility
- [ ] Export/import functionality (JSON, CSV)
- [ ] Duplicate post/page functionality
- [ ] Post templates for consistent formatting
- [ ] Autosave and drafts
- [ ] Collaborative editing with real-time updates
- [ ] Activity log and audit trail
- [ ] Two-factor authentication (2FA)
- [ ] OAuth providers (Google, GitHub, etc.)
- [ ] API rate limiting
- [ ] GraphQL API option

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or suggestions, please open an issue on GitHub.

## Version History

See [CHANGELOG.md](CHANGELOG.md) for complete version history.

## Acknowledgments

- Next.js team for the amazing framework
- Tailwind CSS for the utility-first CSS framework
- NextAuth.js for authentication
- Sharp for image processing
- React Simple WYSIWYG for the text editor

