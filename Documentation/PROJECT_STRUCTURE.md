# Project Structure

Next CMS follows Next.js 14 App Router conventions with a clear separation between admin and public-facing code.

## Directory Overview

```
next-cms/
├── app/                      # Next.js App Router
├── components/               # React components
├── database/                 # Database schema files
├── hooks/                    # Custom React hooks
├── lib/                      # Utility functions and helpers
├── public/                   # Static assets
├── scripts/                  # Utility scripts
├── types/                    # TypeScript type definitions
└── [config files]            # Configuration files
```

## Detailed Structure

### `/app` - Next.js App Router

```
app/
├── (public)/                 # Public-facing site (group route)
│   ├── [...slug]/           # Dynamic page routing
│   │   └── page.tsx         # Renders pages/posts by slug
│   ├── blog/                # Blog section
│   │   ├── [...slug]/       # Individual blog posts
│   │   │   └── page.tsx
│   │   └── page.tsx         # Blog archive
│   ├── layout.tsx           # Public layout wrapper
│   └── page.tsx             # Homepage
│
├── admin/                    # Admin interface
│   ├── activity-log/        # Activity log viewer
│   │   └── page.tsx
│   ├── content-types/       # Post types & taxonomies
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── post-types/
│   │   │   └── page.tsx
│   │   └── taxonomies/
│   │       └── page.tsx
│   ├── media/               # Media library
│   │   └── page.tsx
│   ├── navigation/          # Menu builder
│   │   └── page.tsx
│   ├── post-type/           # Post editor
│   │   └── [slug]/
│   │       ├── [id]/
│   │       │   └── page.tsx # Edit post
│   │       ├── new/
│   │       │   └── page.tsx # Create post
│   │       └── page.tsx     # Post list
│   ├── settings/            # Settings pages
│   │   ├── authentication/
│   │   │   └── page.tsx     # Password requirements
│   │   ├── global/
│   │   │   └── page.tsx     # Global settings (Super Admin)
│   │   ├── media/
│   │   │   └── page.tsx     # Media settings
│   │   ├── menus/
│   │   │   └── page.tsx     # Menu locations
│   │   ├── layout.tsx
│   │   └── page.tsx         # General settings
│   ├── sites/               # Multi-site management (Super Admin)
│   │   └── page.tsx
│   ├── taxonomy/            # Taxonomy term management
│   │   └── [slug]/
│   │       └── page.tsx
│   ├── tools/               # System tools
│   │   └── import-export/
│   │       └── page.tsx
│   ├── users/               # User management
│   │   ├── page.tsx         # User list
│   │   └── roles/
│   │       └── page.tsx     # Role management
│   ├── help/
│   │   └── page.tsx         # Help & documentation
│   ├── layout.tsx           # Admin layout with sidebar
│   ├── login/
│   │   └── page.tsx         # Login page
│   └── page.tsx             # Dashboard
│
├── api/                      # API routes
│   ├── activity-log/
│   │   └── route.ts         # Fetch activity logs
│   ├── auth/
│   │   ├── [...nextauth]/
│   │   │   └── route.ts     # NextAuth.js handler
│   │   ├── switch-site/
│   │   │   └── route.ts     # Site switching
│   │   └── switch-user/
│   │       └── route.ts     # User switching
│   ├── media/               # Media operations
│   │   ├── [id]/
│   │   │   ├── route.ts     # Get/update/delete media
│   │   │   ├── replace/     # Replace media file
│   │   │   └── usage/       # Where media is used
│   │   ├── bulk/
│   │   │   ├── delete/
│   │   │   └── move/
│   │   ├── folders/         # Folder management
│   │   ├── regenerate/      # Regenerate thumbnails
│   │   ├── trash/           # Trash operations
│   │   └── route.ts         # Upload/list media
│   ├── menu-items/          # Menu item CRUD
│   ├── menus/               # Menu CRUD
│   ├── post-types/          # Post type CRUD
│   ├── posts/               # Post CRUD
│   │   ├── [id]/
│   │   │   ├── meta/        # Post metadata
│   │   │   ├── revisions/   # Post revisions
│   │   │   ├── restore/     # Restore from trash
│   │   │   ├── permanent-delete/
│   │   │   └── route.ts
│   │   ├── autosave/        # Autosave handling
│   │   ├── process-scheduled/ # Process scheduled posts
│   │   ├── trash/           # Trash operations
│   │   └── route.ts
│   ├── roles/               # Role CRUD
│   ├── settings/            # Settings management
│   │   ├── authentication/  # Auth settings
│   │   ├── global/          # Global settings
│   │   └── route.ts
│   ├── sites/               # Site management
│   │   ├── [id]/
│   │   │   ├── users/       # Site user assignment
│   │   │   └── route.ts
│   │   ├── available/       # Available sites for user
│   │   └── route.ts
│   ├── taxonomies/          # Taxonomy CRUD
│   ├── terms/               # Term CRUD
│   ├── tools/
│   │   ├── export/          # Export data
│   │   └── import/          # Import data
│   └── users/               # User CRUD
│       ├── [id]/
│       │   └── route.ts
│       └── route.ts
│
├── globals.css              # Global styles
├── layout.tsx               # Root layout
├── loading.tsx              # Loading state
├── not-found.tsx            # 404 page
└── providers.tsx            # React Query provider
```

### `/components` - React Components

```
components/
├── admin/                    # Admin-specific components
│   ├── help/                # Help documentation components
│   │   ├── AppearanceHelp.tsx
│   │   ├── DashboardHelp.tsx
│   │   ├── MediaHelp.tsx
│   │   ├── PostsHelp.tsx
│   │   ├── SettingsHelp.tsx
│   │   ├── TaxonomiesHelp.tsx
│   │   ├── TipsHelp.tsx
│   │   ├── ToolsHelp.tsx
│   │   └── UsersHelp.tsx
│   ├── media/               # Media library components
│   │   ├── BulkMoveModal.tsx
│   │   ├── EditMediaModal.tsx
│   │   ├── FolderModal.tsx
│   │   ├── LoadingOverlay.tsx
│   │   ├── MediaGrid.tsx
│   │   ├── MediaUploadProgress.tsx
│   │   ├── MoveMediaModal.tsx
│   │   └── TrashView.tsx
│   ├── navigation/          # Menu builder components
│   │   ├── AddMenuItemForm.tsx
│   │   ├── MenuForm.tsx
│   │   ├── MenuItemsList.tsx
│   │   ├── MenuList.tsx
│   │   └── NavigationHeader.tsx
│   ├── post-editor/         # Post editor components
│   │   ├── AutosaveDiffModal.tsx
│   │   ├── CustomFieldsBox.tsx
│   │   ├── FeaturedImageBox.tsx
│   │   ├── PageAttributesBox.tsx
│   │   ├── PublishBox.tsx
│   │   ├── RevisionsBox.tsx
│   │   ├── SeoMetadataBox.tsx
│   │   └── TaxonomyBox.tsx
│   ├── ActivityLogDetailsModal.tsx
│   ├── CategorySelector.tsx
│   ├── MediaSelector.tsx
│   ├── PostTypeForm.tsx
│   ├── RichTextEditor.tsx
│   ├── Sidebar.tsx          # Admin sidebar navigation
│   ├── SiteSwitcher.tsx     # Site switching dropdown
│   ├── SiteUsersModal.tsx   # Manage site users
│   └── SwitchBackButton.tsx # Switch back from testing mode
│
└── public/                   # Public-facing components
    ├── Footer.tsx
    ├── Menu.tsx             # Navigation menu renderer
    └── Navbar.tsx
```

### `/database` - Database Files

```
database/
├── schema.sql               # Main schema (includes Site 1)
└── site-tables-template.sql # Template for new sites
```

### `/hooks` - Custom React Hooks

```
hooks/
└── usePermission.ts         # Permission checking hook
```

### `/lib` - Utilities and Helpers

```
lib/
├── activity-logger.ts       # Activity logging functions
├── auth.ts                  # NextAuth.js configuration
├── db.ts                    # Database connection
├── image-utils.ts           # Image processing
├── menu-helpers.ts          # Menu data fetchers
├── password-validator.ts    # Password validation
├── post-url-builder.ts      # URL generation for posts
├── post-utils.ts            # Post data fetchers
├── url-utils.ts             # URL utilities
└── utils.ts                 # General utilities
```

### `/public` - Static Assets

```
public/
└── uploads/                 # Uploaded media files
    ├── site_1/              # Site 1 media
    │   └── 2025/
    │       └── 10/
    └── site_2/              # Site 2 media (if exists)
        └── 2025/
            └── 10/
```

### `/scripts` - Utility Scripts

```
scripts/
└── hash-password.js         # Generate password hashes
```

### `/types` - TypeScript Types

```
types/
└── next-auth.d.ts           # NextAuth.js type extensions
```

## Configuration Files

```
next-cms/
├── .env.local               # Environment variables (create this)
├── .gitignore              # Git ignore rules
├── CHANGELOG.md            # Version history
├── DATABASE_STRUCTURE.md   # Database documentation
├── FEATURES.md             # Feature documentation
├── LICENSE                 # MIT License
├── MULTI_SITE.md           # Multi-site documentation
├── next-env.d.ts           # Next.js TypeScript types
├── next.config.js          # Next.js configuration
├── package.json            # Dependencies and scripts
├── package-lock.json       # Locked dependencies
├── postcss.config.js       # PostCSS configuration
├── PROJECT_STRUCTURE.md    # This file
├── README.md               # Main documentation
├── SETUP.md                # Setup instructions
├── tailwind.config.ts      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── VERSION                 # Current version number
```

## Key Architectural Decisions

### Route Organization

- **Public routes** use route groups `(public)` to apply a separate layout
- **Admin routes** are under `/admin` with a sidebar layout
- **API routes** follow RESTful conventions with resource-based organization

### Component Organization

- Components are organized by domain (admin vs public)
- Subdirectories group related components (e.g., `media/`, `navigation/`)
- Modals and complex forms are separate components for reusability

### Database Abstraction

- `getSiteTable()` helper dynamically prefixes table names
- All queries use parameterized statements to prevent SQL injection
- Global tables are shared, site tables are prefixed with `site_{id}_`

### Multi-Site Support

- Site context stored in user session (`currentSiteId`)
- API routes check session for site context
- Super admins can manage all sites, regular admins are site-scoped

### Type Safety

- TypeScript throughout the application
- Type definitions in `/types` for shared types
- API responses properly typed with interfaces

## Development Workflow

1. **Frontend changes**: Edit components in `/components` or pages in `/app`
2. **Backend changes**: Edit API routes in `/app/api`
3. **Database changes**: Update `schema.sql` and `site-tables-template.sql`
4. **Styling**: Use Tailwind CSS classes, extend in `tailwind.config.ts`
5. **New features**: Add to appropriate directory, update documentation

## Best Practices

- Keep components small and focused
- Use server components where possible (Next.js 14)
- Client components marked with `'use client'`
- API routes handle authentication and authorization
- Database queries use proper site context
- All user inputs are validated and sanitized

