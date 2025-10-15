# Next CMS

A complete Content Management System built with Next.js 14, Tailwind CSS, and MySQL - similar to WordPress.

## Current Version: 1.3.1

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
- 🏷️ **Flexible Taxonomy System** - Create custom taxonomies (categories, tags, etc.) for any post type with hierarchical support
- 🖼️ **Advanced Media Library** 
  - WordPress-style automatic image resizing with multiple size variants
  - Image metadata (title and alt text) for SEO and accessibility
  - Regenerate image sizes when settings change
  - Date-based folder organization (YYYY/MM)
  - Customizable image sizes with crop styles (cover, inside, contain, fill)
- ✏️ **Rich Text Editor** - Full-featured WYSIWYG editor (react-simple-wysiwyg)
- 🔐 **Authentication** - Secure login system with NextAuth.js
- 👥 **Advanced User Management** 
  - Custom role creation with granular permissions
  - Per-post-type permission control (manage, edit, delete)
  - Content workflow with pending review status
  - Author reassignment capability
  - Role-based admin interface visibility
- ⚙️ **Settings System** - Configurable site name, tagline, and media settings
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
│   │   │   └── [slug]/       # Posts for each type
│   │   ├── taxonomy/         # Dynamic taxonomy terms
│   │   │   └── [slug]/       # Terms for each taxonomy
│   │   ├── media/            # Media library
│   │   ├── users/            # User management
│   │   │   └── roles/        # Custom roles & permissions
│   │   ├── settings/         # Site settings
│   │   └── login/            # Login page
│   └── api/                  # API routes
│       ├── auth/             # Authentication
│       ├── posts/            # Posts CRUD
│       ├── post-types/       # Post types management
│       ├── taxonomies/       # Taxonomies management
│       ├── terms/            # Terms management
│       ├── users/            # User management
│       ├── roles/            # Roles & permissions
│       ├── media/            # Media upload/management
│       └── settings/         # Settings management
├── components/               # React components
│   ├── admin/               # Admin components
│   └── public/              # Public components
├── hooks/                   # Custom React hooks
│   └── usePermission.ts    # Permission checking
├── lib/                     # Utility functions
│   ├── db.ts               # Database connection
│   ├── auth.ts             # Authentication config
│   └── utils.ts            # Helper functions
├── database/                # Database schema
│   └── schema.sql          # Complete database structure
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
7. **Settings** - Configure site and media settings

### Creating Content

1. Navigate to the desired post type (Posts, Pages, etc.)
2. Click "New [Post Type]"
3. Fill in the title and content using the rich text editor
4. Select parent (for hierarchical content), taxonomies, and featured image
5. Change author if you have `can_reassign` permission
6. Set the status:
   - **Draft** - Save without publishing
   - **Pending** - Submit for review (if you can't publish)
   - **Published** - Make content live (requires `can_publish` permission)
7. Click "Publish", "Update", or "Submit for Review" based on your permissions

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

### Media Management

1. Go to the Media Library
2. Click "Upload Files"
3. Select one or more files
4. Use the copy button to get the URL for use in posts/pages
5. Delete files as needed

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
- `GET /api/media` - List all media (requires `manage_media`)
- `POST /api/media` - Upload file
- `DELETE /api/media/:id` - Delete file and sizes

### Settings
- `GET /api/settings` - Get site settings (requires `manage_settings`)
- `PUT /api/settings` - Update settings

## Database Schema

The system uses the following main tables:

- **users** - User accounts and authentication
- **roles** - Custom roles with granular permissions
- **posts** - All content (posts, pages, custom post types)
- **post_types** - Custom post type definitions
- **taxonomies** - Custom taxonomy definitions
- **terms** - Taxonomy terms (categories, tags, etc.)
- **post_terms** - Post-term relationships
- **media** - Uploaded files with metadata
- **settings** - Site configuration

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

- [ ] Comments system
- [ ] SEO metadata editor per post/page
- [ ] Multi-language support
- [ ] AI-generated alt text suggestions
- [ ] Analytics dashboard
- [ ] Email notifications
- [ ] Custom themes
- [ ] Plugin system
- [ ] Revision history
- [ ] Scheduled publishing
- [ ] Bulk actions for posts and media
- [ ] Advanced search and filtering
- [ ] Export/import functionality

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

