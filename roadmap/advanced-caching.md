# Advanced Caching

## Overview
Implement a comprehensive caching system to dramatically improve performance, reduce database load, and enable scaling to high-traffic scenarios.

## Goals
- Reduce page load times by >80%
- Decrease database queries by >90%
- Support high-traffic scenarios (10,000+ req/min)
- Minimize infrastructure costs

## Key Features

### Multi-Layer Caching
- **Page Cache**: Full HTML page caching
- **Fragment Cache**: Cache specific components
- **Data Cache**: API and database query results
- **Object Cache**: In-memory object storage
- **CDN Cache**: Static asset caching

### Cache Strategies
- **Static Page Caching**: Pre-generate and cache full pages
- **Incremental Static Regeneration**: Update cached pages periodically
- **Time-based Invalidation**: Expire after set duration
- **Event-based Invalidation**: Clear cache on content changes
- **Selective Invalidation**: Clear only affected pages

### Cache Stores
- **Redis**: Fast in-memory data store
- **Memcached**: Distributed memory caching
- **File System**: Disk-based cache for full pages
- **Edge Cache**: CDN-based caching
- **Browser Cache**: Client-side caching with proper headers

### Smart Invalidation
- **Dependency Tracking**: Know what to invalidate when content changes
- **Cascading Invalidation**: Clear parent/child relationships
- **Granular Control**: Invalidate specific items or patterns
- **Lazy Regeneration**: Regenerate on next request
- **Background Regeneration**: Rebuild cache without blocking requests

## Architecture

### Cache Hierarchy
```
Browser Cache (1 hour)
    ↓
CDN Cache (24 hours)
    ↓
Edge Cache (1 hour)
    ↓
Application Cache (Redis/Memcached)
    ↓
Database
```

### Cache Keys
```typescript
// Post cache key
`post:${siteId}:${postId}:${version}`

// Post list cache key
`posts:${siteId}:${postType}:${page}:${filters}:${sort}`

// Menu cache key
`menu:${siteId}:${location}:${version}`

// User cache key
`user:${userId}:${version}`

// Settings cache key
`settings:${siteId}:${key}:${version}`
```

### Cache Configuration
```typescript
// config/cache.ts
export const cacheConfig = {
  stores: {
    default: 'redis',
    pages: 'filesystem',
    sessions: 'redis',
    api: 'redis'
  },
  ttl: {
    posts: 3600,           // 1 hour
    pages: 86400,          // 24 hours
    menus: 43200,          // 12 hours
    media: 604800,         // 7 days
    api: 300,              // 5 minutes
    static: 2592000        // 30 days
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: 0,
    keyPrefix: 'nextcms:'
  },
  strategies: {
    posts: 'event-based',
    pages: 'event-based',
    api: 'time-based',
    static: 'immutable'
  }
};
```

## Implementation Examples

### Page Caching
```typescript
// Middleware for page cache
export async function cacheMiddleware(req: Request) {
  const cacheKey = generateCacheKey(req);
  
  // Try to get from cache
  const cached = await cache.get(cacheKey);
  if (cached) {
    return new Response(cached, {
      headers: {
        'Content-Type': 'text/html',
        'X-Cache': 'HIT',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  }
  
  // Generate page
  const page = await generatePage(req);
  
  // Store in cache
  await cache.set(cacheKey, page, { ttl: 3600 });
  
  return new Response(page, {
    headers: {
      'Content-Type': 'text/html',
      'X-Cache': 'MISS',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
```

### Query Caching
```typescript
// Cached database query
async function getCachedPost(postId: number) {
  const cacheKey = `post:${postId}`;
  
  return await cache.remember(cacheKey, async () => {
    return await db.query('SELECT * FROM posts WHERE id = ?', [postId]);
  }, { ttl: 3600 });
}
```

### Cache Invalidation
```typescript
// Invalidate on post update
async function updatePost(postId: number, data: PostData) {
  // Update database
  await db.query('UPDATE posts SET ? WHERE id = ?', [data, postId]);
  
  // Invalidate caches
  await cache.forget(`post:${postId}`);
  await cache.forgetPattern(`posts:*`);
  await cache.forget(`sitemap:*`);
  
  // Invalidate related pages
  const post = await getPost(postId);
  await invalidatePostPages(post);
  
  // Log activity
  await logActivity('post.updated', { postId });
}

async function invalidatePostPages(post: Post) {
  // Invalidate post page
  await cache.forget(`page:${post.slug}`);
  
  // Invalidate category pages
  for (const category of post.categories) {
    await cache.forgetPattern(`page:category:${category.slug}:*`);
  }
  
  // Invalidate homepage if featured
  if (post.featured) {
    await cache.forget('page:home');
  }
  
  // Invalidate archive pages
  await cache.forgetPattern('page:archive:*');
}
```

### Cache Warming
```typescript
// Warm cache after deployment or content updates
async function warmCache() {
  console.log('Starting cache warming...');
  
  // Warm homepage
  await fetchAndCache('/');
  
  // Warm all published posts
  const posts = await getPosts({ status: 'published' });
  for (const post of posts) {
    await fetchAndCache(post.url);
  }
  
  // Warm category pages
  const categories = await getCategories();
  for (const category of categories) {
    await fetchAndCache(`/category/${category.slug}`);
  }
  
  // Warm menus
  const menus = await getMenus();
  for (const menu of menus) {
    await cacheMenu(menu);
  }
  
  console.log('Cache warming complete!');
}
```

### Fragment Caching
```typescript
// Cache a React component
import { cache } from '@/lib/cache';

async function CachedWidget({ siteId }: { siteId: number }) {
  const cacheKey = `widget:popular:${siteId}`;
  
  const html = await cache.remember(cacheKey, async () => {
    const posts = await getPopularPosts(siteId, 5);
    return renderToString(<PopularPosts posts={posts} />);
  }, { ttl: 3600 });
  
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
```

## Cache Headers

### Static Assets
```
Cache-Control: public, max-age=31536000, immutable
ETag: "abc123"
```

### Dynamic Content
```
Cache-Control: public, max-age=3600, must-revalidate
ETag: "def456"
Vary: Accept-Encoding, Cookie
```

### Private/User-Specific Content
```
Cache-Control: private, max-age=300
Vary: Cookie
```

### No Cache
```
Cache-Control: no-store, no-cache, must-revalidate
Pragma: no-cache
Expires: 0
```

## Cache Statistics

### Metrics to Track
- **Hit Rate**: Percentage of requests served from cache
- **Miss Rate**: Percentage requiring database queries
- **Eviction Rate**: How often items are removed
- **Response Time**: Average time to serve cached vs uncached
- **Cache Size**: Memory/disk usage
- **TTL Distribution**: How long items stay cached

### Dashboard Display
```typescript
interface CacheStats {
  hitRate: number;        // 95.2%
  missRate: number;       // 4.8%
  totalRequests: number;  // 1,234,567
  cacheHits: number;      // 1,175,000
  cacheMisses: number;    // 59,567
  avgResponseTime: {
    cached: number;       // 12ms
    uncached: number;     // 245ms
  };
  cacheSize: {
    memory: string;       // "2.3 GB"
    disk: string;         // "15.7 GB"
  };
  topCachedPages: Array<{
    url: string;
    hits: number;
  }>;
}
```

## Implementation Phases

### Phase 1: Infrastructure (1-2 weeks)
- Redis setup and configuration
- Cache abstraction layer
- Basic cache helpers
- Cache key generation

### Phase 2: Query Caching (2 weeks)
- Database query caching
- ORM integration
- Cache invalidation on writes
- Cache warming scripts

### Phase 3: Page Caching (2-3 weeks)
- Full page caching
- Fragment caching
- Smart invalidation
- Cache headers

### Phase 4: Advanced Features (2 weeks)
- Edge caching
- Cache warming
- Statistics and monitoring
- Admin dashboard

### Phase 5: Optimization (1-2 weeks)
- Performance tuning
- Memory optimization
- Cache strategy refinement
- Load testing

## Cache Invalidation Strategies

### Event-Based (Best for Content)
```typescript
// Automatic invalidation on content changes
eventBus.on('post.updated', async (post) => {
  await invalidatePost(post.id);
  await invalidateRelatedPages(post);
});

eventBus.on('menu.updated', async (menu) => {
  await cache.forgetPattern(`menu:${menu.id}:*`);
  await cache.forgetPattern(`page:*`); // All pages have menu
});
```

### Time-Based (Best for External Data)
```typescript
// Auto-expire after duration
await cache.set('external-api-data', data, { ttl: 300 }); // 5 minutes
```

### Manual (Best for Control)
```typescript
// Admin action to clear cache
async function clearCache(pattern?: string) {
  if (pattern) {
    await cache.forgetPattern(pattern);
  } else {
    await cache.flush();
  }
  await logActivity('cache.cleared', { pattern });
}
```

## User Stories

1. **Site Visitor**: "I want pages to load instantly without waiting"
2. **Site Owner**: "I want my site to handle viral traffic without crashing"
3. **Developer**: "I want automatic cache invalidation when content changes"
4. **Admin**: "I want to see cache performance and clear it when needed"

## Success Metrics
- Page load time improvement: >80%
- Cache hit rate: >95%
- Database load reduction: >90%
- Concurrent users supported: 10,000+

## Dependencies
- Redis or Memcached installation
- CDN integration (for edge caching)
- Activity logging (for invalidation tracking)

## Risks & Mitigation
- **Risk**: Serving stale content
  - **Mitigation**: Smart invalidation, versioning, short TTLs for dynamic content
  
- **Risk**: Cache stampede (many requests generating same cache simultaneously)
  - **Mitigation**: Cache locking, stale-while-revalidate
  
- **Risk**: Memory exhaustion
  - **Mitigation**: Size limits, LRU eviction, monitoring

## Related Features
- CDN integration (edge caching layer)
- REST API (API response caching)
- GraphQL API (query caching)
- Analytics dashboard (cache performance metrics)

