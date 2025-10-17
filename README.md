# Next CMS

A powerful, modern content management system built with Next.js 14, TypeScript, Tailwind CSS, and MySQL.

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
- **Role-based access** - Super Admin, Admin, Editor, Author
- **Granular permissions** - control exactly what users can do
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

- **[Setup Guide](./SETUP.md)** - Detailed installation instructions
- **[Multi-Site Architecture](./MULTI_SITE.md)** - How multi-site works
- **[Super Admin Interface](./SUPER_ADMIN_INTERFACE.md)** - System administration
- **[Site User Management](./SITE_USER_MANAGEMENT.md)** - Managing users and sites
- **[User Switching](./USER_SWITCHING.md)** - Testing as other users
- **[Features](./FEATURES.md)** - Complete feature list
- **[Changelog](./CHANGELOG.md)** - Version history

## 🏗️ Architecture

### Database Structure

**Global Tables:**
- `users` - All user accounts
- `roles` - Permission definitions
- `sites` - Site configurations
- `site_users` - User-site assignments
- `activity_log` - Audit trail

**Site-Specific Tables** (per site):
- `site_1_posts` - Content
- `site_1_media` - Uploaded files
- `site_1_menus` - Navigation
- `site_1_settings` - Configuration
- `site_1_taxonomies` - Categories/tags
- And more...

### User Hierarchy

```
Super Administrator
├─ Manages all sites
├─ Creates/assigns users
└─ System-level administration

Site Administrator (per site)
├─ Full site access
├─ Manages site content
└─ Can create site users

Editor (per site)
├─ Publishes all content
└─ Manages media

Author (per site)
├─ Creates own content
└─ Limited permissions
```

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
├── app/                   # Next.js app directory
│   ├── (public)/         # Public-facing site
│   ├── admin/            # Admin interface
│   └── api/              # API endpoints
├── components/           # React components
│   ├── admin/           # Admin UI components
│   └── public/          # Public components
├── database/            # Database files
│   ├── schema.sql       # Main schema (RUN THIS)
│   └── site-tables-template.sql
├── lib/                 # Utilities & helpers
├── hooks/               # Custom React hooks
├── types/               # TypeScript definitions
├── scripts/             # Helper scripts
└── public/             # Static assets
    └── uploads/        # Uploaded media
```

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

- [ ] Theme system
- [ ] Plugin architecture
- [ ] REST API for headless CMS
- [ ] GraphQL API
- [ ] Advanced caching
- [ ] CDN integration
- [ ] Multi-language support
- [ ] Advanced SEO tools
- [ ] Analytics dashboard
- [ ] Email templates
- [ ] Webhooks
- [ ] Import/Export improvements

---

**Made with ❤️ for the content management community**
