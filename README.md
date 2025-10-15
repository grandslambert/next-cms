# Next CMS

A complete Content Management System built with Next.js 14, Tailwind CSS, and MySQL - similar to WordPress.

## Current Version: 1.0.2

See [CHANGELOG.md](CHANGELOG.md) for version history and release notes.

## Features

- 📝 **Posts & Pages Management** - Create and manage blog posts and static pages
- 🏷️ **Categories** - Organize posts with categories and inline category creation
- 🖼️ **Advanced Media Library** 
  - WordPress-style automatic image resizing with multiple size variants
  - Image metadata (title and alt text) for SEO and accessibility
  - Regenerate image sizes when settings change
  - Date-based folder organization (YYYY/MM)
  - Customizable image sizes with crop styles (cover, inside, contain, fill)
- ✏️ **Rich Text Editor** - Full-featured WYSIWYG editor (react-simple-wysiwyg)
- 🔐 **Authentication** - Secure login system with NextAuth.js
- 👥 **User Management** - Create and manage users with Admin, Editor, and Author roles
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
├── app/                    # Next.js app directory
│   ├── (public)/          # Public-facing pages
│   │   ├── page.tsx       # Homepage
│   │   ├── blog/          # Blog listing and posts
│   │   └── [slug]/        # Dynamic pages
│   ├── admin/             # Admin dashboard
│   │   ├── posts/         # Post management
│   │   ├── pages/         # Page management
│   │   ├── media/         # Media library
│   │   └── login/         # Login page
│   └── api/               # API routes
│       ├── auth/          # Authentication
│       ├── posts/         # Posts CRUD
│       ├── pages/         # Pages CRUD
│       └── media/         # Media upload/management
├── components/            # React components
│   ├── admin/            # Admin components
│   └── public/           # Public components
├── lib/                  # Utility functions
│   ├── db.ts            # Database connection
│   ├── auth.ts          # Authentication config
│   └── utils.ts         # Helper functions
├── database/             # Database schema
└── public/              # Static files
    └── uploads/         # Uploaded media files
```

## Usage

### Admin Panel

Access the admin panel at `/admin`:

1. **Dashboard** - Overview of your content
2. **Posts** - Create and manage blog posts
3. **Pages** - Create and manage static pages
4. **Media** - Upload and manage media files

### Creating Content

1. Navigate to Posts or Pages
2. Click "New Post" or "New Page"
3. Fill in the title and content using the rich text editor
4. Add a featured image (optional)
5. Set the status (Draft or Published)
6. Click "Create" or "Update"

### Media Management

1. Go to the Media Library
2. Click "Upload Files"
3. Select one or more files
4. Use the copy button to get the URL for use in posts/pages
5. Delete files as needed

## API Routes

### Posts
- `GET /api/posts` - List all posts
- `GET /api/posts/:id` - Get single post
- `POST /api/posts` - Create post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post

### Pages
- `GET /api/pages` - List all pages
- `GET /api/pages/:id` - Get single page
- `POST /api/pages` - Create page
- `PUT /api/pages/:id` - Update page
- `DELETE /api/pages/:id` - Delete page

### Media
- `GET /api/media` - List all media
- `POST /api/media` - Upload file
- `DELETE /api/media/:id` - Delete file

## Database Schema

The system uses the following main tables:

- **users** - User accounts and authentication
- **posts** - Blog posts
- **pages** - Static pages
- **media** - Uploaded files
- **categories** - Post categories (future use)
- **post_categories** - Post-category relationships

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

- [IMAGE_SYSTEM.md](IMAGE_SYSTEM.md) - WordPress-style image handling and sizing
- [IMAGE_CROP_STYLES.md](IMAGE_CROP_STYLES.md) - Image crop and fit strategies
- [IMAGE_REGENERATION.md](IMAGE_REGENERATION.md) - Regenerating image sizes
- [MEDIA_METADATA.md](MEDIA_METADATA.md) - Managing titles and alt text
- [MEDIA_SAFETY.md](MEDIA_SAFETY.md) - Safe media deletion with usage tracking
- [SETTINGS.md](SETTINGS.md) - Configuring site and media settings
- [VERSIONING.md](VERSIONING.md) - Semantic versioning guide
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues and solutions

## Security Considerations

1. Change default admin credentials
2. Use strong `NEXTAUTH_SECRET`
3. Enable HTTPS in production
4. Set up proper database backups
5. Implement rate limiting for API routes
6. Sanitize user input
7. Keep dependencies updated

## Future Enhancements

- [ ] Tags system
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

