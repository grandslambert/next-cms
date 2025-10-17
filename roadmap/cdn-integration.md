# CDN Integration

## Overview
Integrate Content Delivery Network (CDN) capabilities to serve static assets and cached pages from edge locations worldwide, dramatically improving global performance and reliability.

## Goals
- Reduce global latency to <100ms
- Decrease bandwidth costs by 60-80%
- Improve uptime and reliability
- Scale to millions of requests/day

## Key Features

### Asset Delivery
- **Static Assets**: Images, CSS, JavaScript
- **Media Library**: All uploaded files
- **Generated Images**: Thumbnails and optimized versions
- **Fonts**: Web fonts and icon fonts
- **Documents**: PDFs and downloadable files

### CDN Providers Support
- **Cloudflare**: Full integration with caching rules
- **AWS CloudFront**: S3 + CloudFront setup
- **Fastly**: Advanced caching and edge computing
- **Bunny CDN**: Cost-effective alternative
- **Azure CDN**: For Azure-hosted applications
- **Custom CDN**: Generic CDN configuration

### Smart Caching
- **Cache Everything**: Aggressive caching with smart invalidation
- **Cache Rules**: Per-path caching strategies
- **Query String Handling**: Control caching by parameters
- **Device-Specific**: Mobile vs desktop caching
- **Geographic Routing**: Serve region-specific content

### Purge & Invalidation
- **Single File**: Purge specific assets
- **Wildcard Patterns**: Clear groups of files
- **Cache Tags**: Tag-based invalidation
- **Automatic Purge**: On content updates
- **Manual Controls**: Admin interface for cache management

## Architecture

### CDN Flow
```
User Request
    ↓
CDN Edge (nearest location)
    ├─ Cache Hit → Serve from edge
    └─ Cache Miss
        ↓
    Origin Server (Next CMS)
        ↓
    Cache at Edge + Serve
```

### URL Structure
```
# Without CDN
https://yoursite.com/uploads/2025/10/image.jpg

# With CDN
https://cdn.yoursite.com/uploads/2025/10/image.jpg
# or
https://d1a2b3c4d5e6.cloudfront.net/uploads/2025/10/image.jpg
```

## Configuration

### Environment Variables
```env
# CDN Configuration
CDN_ENABLED=true
CDN_PROVIDER=cloudflare
CDN_URL=https://cdn.yoursite.com
CDN_ZONE_ID=your-zone-id
CDN_API_KEY=your-api-key

# S3 Configuration (if using AWS)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# Cloudflare Configuration
CLOUDFLARE_EMAIL=your@email.com
CLOUDFLARE_API_KEY=your-global-api-key
CLOUDFLARE_ZONE_ID=your-zone-id
```

### CDN Settings Interface
```typescript
interface CDNSettings {
  enabled: boolean;
  provider: 'cloudflare' | 'cloudfront' | 'fastly' | 'bunny' | 'custom';
  baseUrl: string;
  credentials: {
    apiKey?: string;
    apiSecret?: string;
    zoneId?: string;
    distributionId?: string;
  };
  caching: {
    defaultTTL: number;
    maxTTL: number;
    browserTTL: number;
  };
  rules: CacheRule[];
  purgeOnUpdate: boolean;
  serveFromOrigin: string[];  // Paths to never CDN
}

interface CacheRule {
  path: string;
  ttl: number;
  cacheByDevice?: boolean;
  cacheByCountry?: boolean;
  bypassQueryString?: boolean;
}
```

## Implementation Examples

### Image URL Transformation
```typescript
// lib/cdn-url.ts
export function getCDNUrl(path: string): string {
  if (!process.env.CDN_ENABLED) {
    return path;
  }
  
  const cdnBase = process.env.CDN_URL;
  
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  return `${cdnBase}/${cleanPath}`;
}

// Usage in components
<img 
  src={getCDNUrl(media.url)} 
  alt={media.alt}
  srcSet={media.sizes.map(size => 
    `${getCDNUrl(size.url)} ${size.width}w`
  ).join(', ')}
/>
```

### Media Upload to CDN
```typescript
// Upload to S3 + CloudFront
async function uploadToS3(file: File, key: string) {
  const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    }
  });
  
  await s3.send(new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Body: file,
    ContentType: file.type,
    CacheControl: 'public, max-age=31536000, immutable',
    Metadata: {
      originalName: file.name,
      uploadedBy: String(userId),
      siteId: String(siteId)
    }
  }));
  
  const cdnUrl = `${process.env.CDN_URL}/${key}`;
  
  return {
    url: cdnUrl,
    key: key,
    bucket: process.env.AWS_S3_BUCKET
  };
}
```

### Cache Purging
```typescript
// Cloudflare purge
async function purgeCloudflare(urls: string[]) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/purge_cache`,
    {
      method: 'POST',
      headers: {
        'X-Auth-Email': process.env.CLOUDFLARE_EMAIL!,
        'X-Auth-Key': process.env.CLOUDFLARE_API_KEY!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ files: urls })
    }
  );
  
  return await response.json();
}

// CloudFront invalidation
async function invalidateCloudFront(paths: string[]) {
  const cloudfront = new CloudFrontClient({
    region: process.env.AWS_REGION
  });
  
  await cloudfront.send(new CreateInvalidationCommand({
    DistributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
    InvalidationBatch: {
      CallerReference: Date.now().toString(),
      Paths: {
        Quantity: paths.length,
        Items: paths
      }
    }
  }));
}

// Generic purge wrapper
async function purgeCDN(urls: string[]) {
  const provider = process.env.CDN_PROVIDER;
  
  switch (provider) {
    case 'cloudflare':
      return await purgeCloudflare(urls);
    case 'cloudfront':
      return await invalidateCloudFront(urls);
    case 'fastly':
      return await purgeFastly(urls);
    default:
      console.warn('CDN purge not configured');
  }
}
```

### Automatic Purge on Update
```typescript
// Hook into content updates
eventBus.on('media.updated', async (media) => {
  const urls = [
    getCDNUrl(media.url),
    ...media.sizes.map(size => getCDNUrl(size.url))
  ];
  
  await purgeCDN(urls);
  await logActivity('cdn.purged', { mediaId: media.id, urls });
});

eventBus.on('post.published', async (post) => {
  const urls = [
    post.url,
    '/', // Homepage might feature this post
    ...post.categories.map(cat => `/category/${cat.slug}`)
  ];
  
  await purgeCDN(urls);
});
```

### Image Transformation at Edge
```typescript
// Cloudflare Images integration
function getTransformedImageUrl(
  imageUrl: string,
  options: {
    width?: number;
    height?: number;
    fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
    format?: 'auto' | 'webp' | 'avif' | 'json';
    quality?: number;
  }
) {
  const params = new URLSearchParams();
  
  if (options.width) params.set('width', String(options.width));
  if (options.height) params.set('height', String(options.height));
  if (options.fit) params.set('fit', options.fit);
  if (options.format) params.set('format', options.format);
  if (options.quality) params.set('quality', String(options.quality));
  
  return `${imageUrl}?${params.toString()}`;
}

// Usage
<img 
  src={getTransformedImageUrl(media.url, {
    width: 800,
    format: 'auto',
    quality: 85
  })}
/>
```

## CDN Provider Configurations

### Cloudflare
```typescript
const cloudflareConfig = {
  cacheRules: [
    {
      match: '/uploads/*',
      cacheTTL: 31536000,  // 1 year
      browserTTL: 86400     // 1 day
    },
    {
      match: '/_next/static/*',
      cacheTTL: 31536000,
      browserTTL: 31536000
    },
    {
      match: '/api/*',
      cacheTTL: 300,        // 5 minutes
      browserTTL: 0
    }
  ],
  features: {
    minify: true,
    brotli: true,
    http3: true,
    earlyHints: true,
    polish: 'lossless'
  }
};
```

### AWS CloudFront
```typescript
const cloudFrontConfig = {
  origins: [{
    domainName: 'yoursite.com',
    customHeaders: [
      { headerName: 'X-From-CloudFront', headerValue: 'true' }
    ]
  }],
  defaultCacheBehavior: {
    targetOriginId: 'nextcms-origin',
    viewerProtocolPolicy: 'redirect-to-https',
    allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
    cachedMethods: ['GET', 'HEAD'],
    compress: true,
    minTTL: 0,
    defaultTTL: 86400,
    maxTTL: 31536000
  },
  priceClass: 'PriceClass_100'  // US, Europe, Asia
};
```

## Admin Interface

### CDN Dashboard
```typescript
interface CDNDashboard {
  status: 'active' | 'inactive' | 'error';
  provider: string;
  statistics: {
    totalRequests: number;
    cachedRequests: number;
    bandwidth: {
      cached: string;
      origin: string;
      savings: string;
    };
    hitRate: number;
  };
  recentPurges: Array<{
    timestamp: Date;
    urls: string[];
    status: 'success' | 'pending' | 'failed';
  }>;
  distribution: {
    topLocations: Array<{
      location: string;
      requests: number;
    }>;
  };
}
```

### Purge Controls
- Purge single URL
- Purge by pattern (/uploads/*)
- Purge all
- Purge by tags
- Schedule purge
- View purge history

## Implementation Phases

### Phase 1: Infrastructure (1-2 weeks)
- CDN provider integration
- Configuration system
- URL transformation
- Basic asset delivery

### Phase 2: Media Integration (2 weeks)
- Upload to CDN/S3
- Media URL rewriting
- Image optimization at edge
- Existing media migration

### Phase 3: Cache Management (1-2 weeks)
- Purge API integration
- Automatic invalidation
- Cache rules configuration
- Admin interface

### Phase 4: Advanced Features (1-2 weeks)
- Multiple CDN support
- Geographic routing
- A/B testing support
- Analytics integration

### Phase 5: Optimization (1 week)
- Performance tuning
- Cost optimization
- Monitoring and alerts
- Documentation

## User Stories

1. **Site Visitor**: "I want images and pages to load instantly, no matter where I am"
2. **Site Owner**: "I want to reduce bandwidth costs while improving performance"
3. **Developer**: "I want automatic CDN integration without manual configuration"
4. **Admin**: "I want to see CDN statistics and control cache purging"

## Success Metrics
- Global latency: <100ms (p95)
- Bandwidth cost reduction: >70%
- CDN hit rate: >95%
- Origin traffic reduction: >80%

## Dependencies
- Advanced caching (origin caching layer)
- Media system (for asset delivery)
- Activity logging (for CDN actions)

## Risks & Mitigation
- **Risk**: CDN costs exceeding expectations
  - **Mitigation**: Usage monitoring, cost alerts, provider comparison
  
- **Risk**: Cache poisoning or stale content
  - **Mitigation**: Signed URLs, automatic purging, version hashing
  
- **Risk**: CDN provider outage
  - **Mitigation**: Fallback to origin, multi-CDN support

## Related Features
- Advanced caching (origin layer)
- Media guide (asset management)
- Theme system (static asset delivery)
- Analytics dashboard (CDN metrics)

