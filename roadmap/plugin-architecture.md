# Plugin Architecture

## Overview
Create a robust plugin system that allows developers to extend Next CMS functionality without modifying core code, enabling a rich ecosystem of add-ons and extensions.

## Goals
- Enable extensibility without core modifications
- Support third-party plugin development
- Provide safe plugin isolation and sandboxing
- Create plugin marketplace ecosystem

## Key Features

### Plugin System Core
- **Plugin Manager**: Install, activate, deactivate, and delete plugins
- **Plugin API**: Standardized hooks, filters, and actions
- **Dependency Management**: Handle plugin dependencies automatically
- **Version Control**: Plugin versioning and compatibility checking
- **Auto-updates**: Optional automatic plugin updates

### Plugin Types
1. **Functionality Plugins**: Add new features (contact forms, galleries, etc.)
2. **Integration Plugins**: Connect to external services (analytics, CRM, etc.)
3. **Content Plugins**: New post types, fields, or content blocks
4. **Admin Plugins**: Enhance admin interface and workflows
5. **API Plugins**: Extend or modify API endpoints

### Developer Tools
- **Plugin Generator**: CLI tool to scaffold new plugins
- **Testing Framework**: Automated testing for plugins
- **Documentation Generator**: Auto-generate plugin docs
- **Debug Mode**: Enhanced logging and error reporting
- **Hot Reload**: Development mode with instant updates

### Security Features
- **Sandboxing**: Isolated plugin execution environment
- **Permission System**: Granular plugin capabilities
- **Code Review**: Automated security scanning
- **Digital Signatures**: Verify plugin authenticity
- **Audit Logging**: Track plugin actions

## Technical Architecture

### Plugin Structure
```
plugins/
├── my-plugin/
│   ├── plugin.json           # Plugin metadata
│   ├── index.ts              # Main entry point
│   ├── hooks/                # Hook implementations
│   │   ├── filters.ts
│   │   └── actions.ts
│   ├── api/                  # API extensions
│   │   └── routes.ts
│   ├── components/           # React components
│   │   ├── admin/
│   │   └── public/
│   ├── migrations/           # Database migrations
│   │   └── 001-initial.sql
│   ├── assets/               # Static assets
│   ├── tests/                # Plugin tests
│   └── README.md
```

### Plugin Manifest (plugin.json)
```json
{
  "name": "My Awesome Plugin",
  "slug": "my-plugin",
  "version": "1.0.0",
  "description": "Does amazing things",
  "author": "Developer Name",
  "homepage": "https://example.com",
  "requires": {
    "nextcms": ">=2.0.0",
    "php": ">=8.0",
    "node": ">=18.0"
  },
  "dependencies": {
    "other-plugin": "^1.2.0"
  },
  "permissions": [
    "database.read",
    "database.write",
    "api.extend",
    "admin.menu"
  ],
  "hooks": {
    "post.beforeSave": "./hooks/post-save.ts",
    "user.afterLogin": "./hooks/user-login.ts"
  },
  "settings": {
    "configurable": true,
    "schema": "./settings-schema.json"
  }
}
```

### Database Schema
```sql
-- Global plugin registry
CREATE TABLE plugins (
  id INT PRIMARY KEY AUTO_INCREMENT,
  slug VARCHAR(100) UNIQUE,
  name VARCHAR(200),
  version VARCHAR(20),
  status ENUM('active', 'inactive', 'error'),
  installed_at TIMESTAMP,
  updated_at TIMESTAMP,
  metadata JSON
);

-- Site-specific plugin activations
CREATE TABLE site_{id}_plugin_activations (
  plugin_id INT,
  site_id INT,
  active BOOLEAN DEFAULT true,
  settings JSON,
  activated_at TIMESTAMP,
  FOREIGN KEY (plugin_id) REFERENCES plugins(id)
);

-- Plugin data storage
CREATE TABLE plugin_data (
  id INT PRIMARY KEY AUTO_INCREMENT,
  plugin_slug VARCHAR(100),
  data_key VARCHAR(200),
  data_value LONGTEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  INDEX idx_plugin_key (plugin_slug, data_key)
);
```

### Hook System API
```typescript
// Register action hook
addAction('post.beforeSave', async (post) => {
  // Modify post before saving
  post.customField = processData(post.content);
  return post;
});

// Register filter hook
addFilter('post.content', (content, post) => {
  // Modify content before display
  return addCustomFormatting(content);
});

// Register admin menu item
addAdminMenuItem({
  label: 'My Plugin',
  icon: '🔌',
  path: '/admin/my-plugin',
  component: MyPluginPage,
  permission: 'plugin.myPlugin.access'
});

// Register API endpoint
addAPIRoute('POST', '/api/my-plugin/action', async (req, res) => {
  // Handle custom API endpoint
  return res.json({ success: true });
});
```

## Available Hooks

### Content Hooks
- `post.beforeSave` - Before post is saved
- `post.afterSave` - After post is saved
- `post.beforeDelete` - Before post is deleted
- `post.content.filter` - Filter post content for display
- `post.excerpt.filter` - Filter post excerpt

### User Hooks
- `user.beforeLogin` - Before user logs in
- `user.afterLogin` - After successful login
- `user.beforeLogout` - Before user logs out
- `user.capabilities.filter` - Filter user permissions

### Media Hooks
- `media.beforeUpload` - Before file upload
- `media.afterUpload` - After file upload
- `media.image.sizes` - Register custom image sizes

### Admin Hooks
- `admin.menu.register` - Add admin menu items
- `admin.dashboard.widgets` - Add dashboard widgets
- `admin.settings.pages` - Add settings pages

### System Hooks
- `system.init` - Plugin initialization
- `system.cron` - Register scheduled tasks
- `system.shutdown` - Plugin cleanup

## Implementation Phases

### Phase 1: Core System (3-4 weeks)
- Plugin loader and manager
- Hook and filter system
- Basic plugin API
- Plugin database tables

### Phase 2: Security & Isolation (2-3 weeks)
- Sandboxing implementation
- Permission system
- Security scanning
- Error handling

### Phase 3: Developer Tools (2-3 weeks)
- Plugin generator CLI
- Documentation tools
- Testing framework
- Debug mode

### Phase 4: Marketplace & Distribution (3-4 weeks)
- Plugin repository
- Install/update system
- Plugin search and discovery
- Rating and review system

### Phase 5: Advanced Features (2-3 weeks)
- Dependency resolution
- Automatic updates
- Plugin migration tools
- Performance monitoring

## Example Plugins

### 1. Contact Form Plugin
- Adds contact form builder
- Email notifications
- Spam protection
- Form submissions database

### 2. SEO Advanced Plugin
- Enhanced SEO meta fields
- XML sitemap generation
- Schema.org markup
- Social media previews

### 3. Analytics Plugin
- Dashboard widgets
- Page view tracking
- User behavior analysis
- Custom reports

### 4. Social Share Plugin
- Share buttons
- Open Graph tags
- Twitter cards
- Custom share messages

## User Stories

1. **Developer**: "I want to add custom functionality without forking the CMS"
2. **Site Owner**: "I want to install a contact form with a few clicks"
3. **Agency**: "I want to create proprietary plugins for clients"
4. **Community**: "I want to share my plugins with others"

## Success Metrics
- Plugin installation success rate: >95%
- Average plugin activation time: <30 seconds
- Plugin error rate: <1%
- Community plugin submissions: 50+ in first year

## Dependencies
- Theme system (plugins may extend themes)
- REST API (for plugin endpoints)
- Advanced caching (for plugin performance)
- Activity logging (for plugin actions)

## Risks & Mitigation
- **Risk**: Poorly coded plugins crash the system
  - **Mitigation**: Sandboxing, error boundaries, auto-disable on errors
  
- **Risk**: Plugin security vulnerabilities
  - **Mitigation**: Automated scanning, code review, permission system
  
- **Risk**: Plugin conflicts and incompatibilities
  - **Mitigation**: Dependency checking, version management, isolation

## Related Features
- Theme system (themes can be extended by plugins)
- REST API (plugins can add endpoints)
- Webhooks (plugins can trigger webhooks)

