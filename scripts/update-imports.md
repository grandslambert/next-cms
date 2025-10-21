# Import Update Tracking

## Files to Update (66 total)

### API Routes - Global Models (15 files)
- [ ] app/api/users/route.ts - User, SiteUser
- [ ] app/api/users/[id]/route.ts - User, Role, SiteUser
- [ ] app/api/roles/route.ts - Role
- [ ] app/api/roles/[id]/route.ts - Role, User
- [ ] app/api/sites/[id]/route.ts - Site, SiteUser
- [ ] app/api/sites/available/route.ts - Site, SiteUser
- [ ] app/api/sites/[id]/users/route.ts - SiteUser, User, Role, Site
- [ ] app/api/sites/[id]/users/[userId]/route.ts - SiteUser, User, Role, Site
- [ ] app/api/auth/switch-site/route.ts - Site, SiteUser
- [ ] app/api/auth/switch-user/route.ts - User, Role, SiteUser, Site
- [ ] app/api/settings/global/route.ts - GlobalSetting
- [ ] app/api/user/meta/route.ts - UserMeta
- [ ] app/api/posts/autosave/route.ts - UserMeta
- [ ] app/api/activity-log/route.ts - ActivityLog, User, Site

### API Routes - Site-Specific Models (40 files)
- Posts (10 files)
- Media (11 files)  
- Taxonomies/Terms (4 files)
- Post Types (3 files)
- Menus (7 files)
- Settings (2 files)
- Public API (1 file)

### Public Pages (4 files)
- app/(public)/page.tsx
- app/(public)/[...slug]/page.tsx
- app/(public)/blog/page.tsx
- app/(public)/blog/[...slug]/page.tsx

### Library Files (7 files)
- lib/activity-logger.ts
- lib/init-site-defaults.ts
- lib/menu-helpers.ts
- lib/menu-helpers-mongo.ts
- lib/post-url-builder.ts
- lib/post-utils.ts
- lib/url-utils.ts

