# Content Preview & Views System

## Overview
Implement a flexible preview and view system that allows content creators to visualize how their content will appear in different contexts, devices, and layouts when consumed via the headless API, without dictating front-end implementation.

## Goals
- Preview content in multiple device formats (mobile, tablet, desktop)
- Create custom view templates for different content types
- Support live preview during content editing
- Enable client preview URLs for external applications
- Provide embeddable preview components

## Key Features

### Preview Modes
- **Device Preview**: Mobile, tablet, desktop, custom dimensions
- **Orientation Preview**: Portrait and landscape modes
- **Dark/Light Mode**: Preview in different color schemes
- **Context Preview**: See content in list views, single views, cards
- **Live Editor Preview**: Real-time preview while editing

### View Templates
- **Content Type Views**: Different layouts per post type
- **Component Views**: Headers, cards, lists, grids, featured items
- **Layout Variations**: Single column, two column, grid, masonry
- **Responsive Previews**: See how layouts adapt to screen sizes
- **Custom View Builder**: Create custom preview templates

### Preview Configuration
- **Preview URLs**: Register external application URLs for live previews
- **Authentication**: Secure preview access with tokens
- **Draft Preview**: Preview unpublished content
- **Version Preview**: Preview specific content revisions
- **Scheduled Preview**: See how future-dated content will appear

### Integration Features
- **Preview API**: Endpoints for external preview systems
- **Embeddable Previews**: iFrame or component-based previews
- **Preview Webhooks**: Notify external systems of content changes
- **SDK Support**: JavaScript/React/Vue preview components
- **Screenshot Generation**: Auto-generate preview images

## Technical Considerations

### Architecture
- View templates stored in `/views` directory
- Preview rendering engine (React/Vue/HTML)
- Isolated preview iframe for security
- Real-time preview updates via WebSocket
- Token-based preview authentication

### Data Structure
```sql
CREATE TABLE site_{id}_preview_views (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200),
  slug VARCHAR(200),
  view_type ENUM('post', 'page', 'list', 'card', 'custom'),
  post_types JSON,
  template_html TEXT,
  template_css TEXT,
  template_js TEXT,
  is_default BOOLEAN DEFAULT false,
  created_by INT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE KEY unique_slug (slug)
);

CREATE TABLE site_{id}_preview_configs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200),
  preview_url VARCHAR(500),
  preview_type ENUM('iframe', 'external', 'api'),
  auth_token VARCHAR(128),
  headers JSON,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP
);

CREATE TABLE site_{id}_preview_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  token VARCHAR(128) UNIQUE,
  post_id INT,
  expires_at TIMESTAMP,
  created_by INT,
  created_at TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES site_{id}_posts(id) ON DELETE CASCADE
);
```

### View Structure
```
views/
├── default/
│   ├── view.json            # View metadata
│   ├── templates/
│   │   ├── post-single.html
│   │   ├── post-card.html
│   │   ├── post-list.html
│   │   └── page-single.html
│   ├── styles/
│   │   └── preview.css
│   └── config.json
```

## Implementation Phases

### Phase 1: Core Preview (2-3 weeks)
- Preview iframe system
- Device/responsive preview modes
- Basic view templates
- Preview API endpoints

### Phase 2: Live Preview (2 weeks)
- Real-time editor preview
- WebSocket integration
- Auto-update on content changes
- Multiple preview panes

### Phase 3: External Integration (2-3 weeks)
- Preview URL registration
- Token authentication
- External preview API
- Webhook notifications

### Phase 4: Advanced Features (2 weeks)
- Custom view builder
- Preview screenshots
- Version/revision preview
- SDK components

### Phase 5: Polish (1 week)
- Documentation
- Default view templates
- Performance optimization
- Preview analytics

## User Stories

1. **Content Editor**: "I want to see how my post will look on mobile before publishing"
2. **Developer**: "I want to preview content in my React app while editing in CMS"
3. **Designer**: "I want to create preview templates that match our brand guidelines"
4. **Marketing Manager**: "I want to preview how content appears in different contexts (cards, lists, featured)"

## Success Metrics
- Preview load time: <1 second
- Real-time preview latency: <200ms
- Preview accuracy: >95% match to production
- External preview integration time: <30 minutes

## Dependencies
- REST API (for preview data endpoints)
- WebSocket support (for live preview updates)
- Media system (for preview images)
- Authentication system (for preview tokens)

## Risks & Mitigation
- **Risk**: Preview not matching production rendering
  - **Mitigation**: Use same data structure as API, allow custom CSS injection
  
- **Risk**: Security issues with preview tokens
  - **Mitigation**: Time-limited tokens, IP restrictions, rate limiting
  
- **Risk**: Performance impact of real-time previews
  - **Mitigation**: Debouncing, efficient WebSocket usage, caching

## Related Features
- REST API (provides data for previews)
- GraphQL API (alternative data source)
- Webhooks (notify external apps of content changes)
- Email templates (preview before sending)

