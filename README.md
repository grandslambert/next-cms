# Next CMS

> Version 3.0.0

A powerful, modern content management system built with Next.js 14, TypeScript, Tailwind CSS, and MongoDB with multi-site support.

## 📖 Quick Start

**New to Next CMS?** Start here: **[QUICKSTART.md](QUICKSTART.md)**

The Quick Start guide will walk you through:
- Installing MongoDB
- Setting up the environment
- Initializing the database
- Starting your first CMS

## 🚀 Features

### Multi-Site Management
- **Multiple sites** from a single installation
- **Site isolation** - completely separate content, media, and settings per site
- **User assignment** - assign users to specific sites with different roles
- **Efficient architecture** - shared global tables, isolated site tables

### Content Management
- **Custom post types** - create any content structure you need
- **Rich text editor** - full-featured WYSIWYG editing
- **Media management** - organized folders, image optimization, bulk operations
- **Taxonomies** - categories and tags with hierarchical support
- **Revisions** - track content changes over time
- **Scheduled publishing** - set posts to publish automatically

### User Management
- **Role-based access** - Super Admin, Admin, Editor, Author, Guest
- **Granular permissions** - control exactly what users can do
- **Site role overrides** - customize system roles per site independently
- **Site-specific roles** - create custom roles for individual sites
- **User switching** - test as other users for debugging
- **Site-aware** - users see only their assigned sites
- **Multi-site users** - assign users to multiple sites with different roles

### Navigation & Menus
- **Visual menu builder** - drag-and-drop interface
- **Multiple menu locations** - header, footer, sidebar
- **Custom links** - add external URLs
- **Nested menus** - unlimited depth

### Advanced Features
- **Activity logging** - complete audit trail
- **SEO metadata** - per-post SEO fields
- **Featured images** - with multiple sizes
- **Custom fields** - extend content with metadata
- **Search & filtering** - find content quickly
- **Responsive design** - works on all devices

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **MySQL** 8.0+
- **Git** (for cloning)

## 🛠️ Quick Start

### 1. Clone and Install

   ```bash
   git clone <repository-url>
   cd next-cms
   npm install
   ```

### 2. Configure Environment

Create `.env.local`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-this-with-openssl-rand-base64-32
```

### 3. Create Database

```sql
CREATE DATABASE your_db_name CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Initialize Database

```bash
mysql -u your_db_user -p your_db_name < database/schema.sql
```

### 5. Start Development

   ```bash
   npm run dev
   ```

Visit [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

### 6. Default Login

**Super Administrator:**
- Username: `superadmin`
- Password: `SuperAdmin123!`

**Site Administrator (Site 1):**
- Username: `siteadmin`  
- Password: `SiteAdmin123!`

**⚠️ Change these passwords immediately!**

## 📚 Documentation

### Essential Docs
- **[Setup Guide](./SETUP.md)** - Installation and configuration
- **[Changelog](./CHANGELOG.md)** - Version history and release notes

### Complete Documentation

All comprehensive guides are in the **[Documentation/](./Documentation/)** folder:

**Architecture & Setup**
- [Database Structure](./Documentation/DATABASE_STRUCTURE.md) - Complete schema reference
- [Project Structure](./Documentation/PROJECT_STRUCTURE.md) - Codebase organization
- [Multi-Site Architecture](./Documentation/MULTI_SITE.md) - Multi-site system guide

**Content Management**
- [Content Types Guide](./Documentation/CONTENT_TYPES_GUIDE.md) - Custom post types & taxonomies
- [Media Guide](./Documentation/MEDIA_GUIDE.md) - Complete media management
- [Scheduled Publishing](./Documentation/SCHEDULED_PUBLISHING.md) - Schedule posts

**User & System Management**
- [Super Admin Interface](./Documentation/SUPER_ADMIN_INTERFACE.md) - System administration
- [Site User Management](./Documentation/SITE_USER_MANAGEMENT.md) - Multi-site users
- [User Switching](./Documentation/USER_SWITCHING.md) - Testing as other users
- [Session Management](./Documentation/SESSION_MANAGEMENT.md) - Session configuration

**Reference**
- [Features](./Documentation/FEATURES.md) - Complete feature list
- [Settings](./Documentation/SETTINGS.md) - Settings system reference
- [Versioning](./VERSIONING.md) - Version guidelines
- [Troubleshooting](./Documentation/TROUBLESHOOTING.md) - Common issues

## 🏗️ Architecture

Next CMS uses a multi-site architecture where a single installation can manage multiple independent websites.

### Database Architecture

- **Global Tables**: Shared across all sites (users, roles, sites, activity_log)
- **Site Tables**: Isolated per site with `site_{id}_` prefix (posts, media, menus, settings)

👉 **[View Complete Database Structure](./DATABASE_STRUCTURE.md)**

### User Hierarchy

```
Super Administrator (system-wide)
├─ Manages all sites and system settings
├─ Creates and assigns users to sites
├─ Views activity across all sites
└─ Access to Global Settings

Site Administrator (per site)
├─ Full access to assigned site(s)
├─ Manages site content and users
└─ Site-specific settings

Editor (per site)
├─ Creates and publishes content
└─ Manages media library

Author (per site)
├─ Creates own content
└─ Limited to own posts

Guest (public)
├─ Read-only access to public site
├─ Cannot access admin area
└─ No permissions
```

### Multi-Site Features

- **Site Isolation**: Each site has completely separate content, media, and settings
- **Shared Users**: Users can be assigned to multiple sites with different roles
- **Centralized Management**: Super admins manage all sites from one interface
- **Activity Logging**: Global audit trail with per-site filtering

## 🎨 Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: MySQL 8.0+
- **Authentication**: NextAuth.js
- **ORM**: mysql2
- **State Management**: TanStack Query
- **Forms**: React Hook Form
- **Editor**: TipTap
- **Icons**: Emoji (lightweight!)

## 📁 Project Structure

```
next-cms/
├── app/
│   ├── (public)/         # Public-facing site (pages, blog)
│   ├── admin/            # Admin dashboard and tools
│   └── api/              # REST API endpoints
├── components/
│   ├── admin/            # Admin UI components
│   └── public/           # Public-facing components
├── database/
│   ├── schema.sql        # Main database schema
│   └── site-tables-template.sql  # Template for new sites
├── lib/                  # Utilities, helpers, and database
├── hooks/                # Custom React hooks
└── [documentation files]
```

👉 **[View Complete Project Structure](./PROJECT_STRUCTURE.md)**

## 🚢 Deployment

### Build for Production

```bash
npm run build
npm start
```

### Using PM2

```bash
npm install -g pm2
pm2 start npm --name "next-cms" -- start
```

### Environment Variables

Update for production:
- `NEXTAUTH_URL` - Your domain
- `NODE_ENV=production`
- Strong `NEXTAUTH_SECRET`
- Secure database credentials

## 🔒 Security

- ✅ Password hashing with bcrypt
- ✅ Role-based access control
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ CSRF tokens (NextAuth)
- ✅ Secure session management
- ✅ Activity logging
- ✅ Input validation

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built with love using:
- Next.js by Vercel
- TanStack Query
- Tailwind CSS
- TipTap Editor
- And many other amazing open-source projects

## 📧 Support

- Documentation: Check the docs folder
- Issues: GitHub Issues
- Discussions: GitHub Discussions

## 🗺️ Roadmap

- [ ] [Content Preview & Views](./roadmap/content-preview-views.md) - Visual content previews for headless workflows
- [ ] [Plugin architecture](./roadmap/plugin-architecture.md) - Extensible plugin system for adding functionality
- [ ] [REST API for headless CMS](./roadmap/rest-api-headless.md) - Complete REST API for decoupled applications
- [ ] [GraphQL API](./roadmap/graphql-api.md) - Flexible GraphQL API with subscriptions
- [ ] [Advanced caching](./roadmap/advanced-caching.md) - Multi-layer caching for performance
- [ ] [CDN integration](./roadmap/cdn-integration.md) - Global content delivery network support
- [ ] [Multi-language support](./roadmap/multi-language-support.md) - Comprehensive i18n and localization
- [ ] [Advanced SEO tools](./roadmap/advanced-seo-tools.md) - SEO analysis, schema markup, and optimization
- [ ] [Analytics dashboard](./roadmap/analytics-dashboard.md) - Built-in traffic and content analytics
- [ ] [Email templates](./roadmap/email-templates.md) - Email system with newsletter management
- [ ] [Webhooks](./roadmap/webhooks.md) - Real-time event notifications for integrations
- [ ] [Import/Export improvements](./roadmap/import-export-improvements.md) - Enhanced data migration and backup tools
- [ ] [Backup & Restore](./roadmap/backup-restore.md) - Automated backups with cloud storage and point-in-time recovery

---

**Made with ❤️ for the content management community**
