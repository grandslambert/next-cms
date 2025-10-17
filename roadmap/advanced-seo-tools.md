# Advanced SEO Tools

## Overview
Enhance Next CMS with comprehensive SEO capabilities including automated optimization, schema markup, XML sitemaps, social media integration, and SEO analysis tools to improve search engine rankings and visibility.

## Goals
- Improve organic search rankings
- Automate SEO best practices
- Provide actionable SEO insights
- Support rich search results
- Simplify social media optimization

## Key Features

### On-Page SEO
- **Meta Tags Management**: Title, description, keywords per page
- **Open Graph Tags**: Facebook, LinkedIn social previews
- **Twitter Cards**: Twitter-specific previews
- **Canonical URLs**: Prevent duplicate content issues
- **Schema.org Markup**: Structured data for rich results
- **Alt Text Management**: Image SEO optimization
- **Heading Structure**: H1-H6 hierarchy analysis

### Content Analysis
- **Keyword Density**: Track focus keyword usage
- **Readability Score**: Flesch-Kincaid readability
- **Content Length**: Optimal length recommendations
- **Internal Linking**: Suggest related content links
- **External Links**: Monitor outbound links
- **Image Optimization**: Size, format, compression analysis

### Technical SEO
- **XML Sitemaps**: Auto-generated and submitted
- **Robots.txt**: Dynamic generation and management
- **404 Monitoring**: Track and fix broken links
- **Redirect Management**: 301, 302 redirects
- **Breadcrumbs**: Automatic breadcrumb generation
- **Page Speed**: Performance recommendations
- **Mobile Optimization**: Mobile-friendly testing

### Schema Markup
- **Article Schema**: Blog posts and articles
- **Organization Schema**: Company information
- **Person Schema**: Author profiles
- **Product Schema**: E-commerce products
- **FAQ Schema**: Frequently asked questions
- **How-To Schema**: Step-by-step guides
- **Review Schema**: Ratings and reviews
- **Event Schema**: Events and webinars

### Social Media Integration
- **Social Previews**: Live preview for all platforms
- **Default Images**: Fallback social share images
- **Social Meta**: Platform-specific metadata
- **Share Buttons**: Customizable share widgets
- **Social Analytics**: Track social shares

### SEO Monitoring
- **Rank Tracking**: Monitor keyword rankings
- **Search Console Integration**: Google Search Console data
- **Analytics Integration**: SEO traffic analysis
- **Competitor Analysis**: Compare with competitors
- **SEO Score**: Overall site SEO health score

## Database Schema

### SEO Metadata Table
```sql
CREATE TABLE site_{id}_seo_metadata (
  id INT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL,
  focus_keyword VARCHAR(200),
  meta_title VARCHAR(200),
  meta_description TEXT,
  meta_keywords VARCHAR(500),
  canonical_url VARCHAR(500),
  og_title VARCHAR(200),
  og_description TEXT,
  og_image VARCHAR(500),
  og_type VARCHAR(50) DEFAULT 'article',
  twitter_card VARCHAR(50) DEFAULT 'summary_large_image',
  twitter_title VARCHAR(200),
  twitter_description TEXT,
  twitter_image VARCHAR(500),
  schema_type VARCHAR(50),
  schema_data JSON,
  noindex BOOLEAN DEFAULT false,
  nofollow BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES site_{id}_posts(id) ON DELETE CASCADE,
  UNIQUE KEY unique_post (post_id)
);
```

### Redirects Table
```sql
CREATE TABLE site_{id}_redirects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  source_url VARCHAR(500) NOT NULL,
  target_url VARCHAR(500) NOT NULL,
  redirect_type ENUM('301', '302', '307', '308') DEFAULT '301',
  is_active BOOLEAN DEFAULT true,
  hit_count INT DEFAULT 0,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_source (source_url)
);
```

### 404 Errors Table
```sql
CREATE TABLE site_{id}_404_errors (
  id INT PRIMARY KEY AUTO_INCREMENT,
  url VARCHAR(500) NOT NULL,
  referer VARCHAR(500),
  user_agent TEXT,
  ip_address VARCHAR(45),
  hit_count INT DEFAULT 1,
  first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_resolved BOOLEAN DEFAULT false,
  redirect_id INT NULL,
  FOREIGN KEY (redirect_id) REFERENCES site_{id}_redirects(id),
  INDEX idx_url (url),
  INDEX idx_unresolved (is_resolved, hit_count)
);
```

### SEO Analysis Table
```sql
CREATE TABLE site_{id}_seo_analysis (
  id INT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL,
  focus_keyword VARCHAR(200),
  keyword_density DECIMAL(5,2),
  keyword_in_title BOOLEAN,
  keyword_in_meta BOOLEAN,
  keyword_in_url BOOLEAN,
  keyword_in_h1 BOOLEAN,
  title_length INT,
  meta_description_length INT,
  content_length INT,
  readability_score DECIMAL(5,2),
  internal_links_count INT,
  external_links_count INT,
  images_count INT,
  images_with_alt INT,
  seo_score INT,
  analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES site_{id}_posts(id) ON DELETE CASCADE
);
```

## Implementation Examples

### SEO Analysis Engine
```typescript
// lib/seo-analyzer.ts
export async function analyzeSEO(post: Post): Promise<SEOAnalysis> {
  const analysis: SEOAnalysis = {
    postId: post.id,
    focusKeyword: post.seo?.focus_keyword || '',
    score: 0,
    issues: [],
    recommendations: []
  };
  
  // Title optimization
  if (!post.title) {
    analysis.issues.push('Missing title');
  } else if (post.title.length < 30) {
    analysis.recommendations.push('Title is too short (< 30 chars)');
  } else if (post.title.length > 60) {
    analysis.issues.push('Title is too long (> 60 chars)');
  } else {
    analysis.score += 10;
  }
  
  // Focus keyword in title
  if (analysis.focusKeyword && !post.title.toLowerCase().includes(analysis.focusKeyword.toLowerCase())) {
    analysis.recommendations.push('Add focus keyword to title');
  } else {
    analysis.score += 10;
  }
  
  // Meta description
  if (!post.seo_description) {
    analysis.issues.push('Missing meta description');
  } else if (post.seo_description.length < 120) {
    analysis.recommendations.push('Meta description is too short');
  } else if (post.seo_description.length > 160) {
    analysis.issues.push('Meta description is too long');
  } else {
    analysis.score += 10;
  }
  
  // Content length
  const wordCount = countWords(post.content);
  if (wordCount < 300) {
    analysis.recommendations.push(`Content is short (${wordCount} words). Aim for 1000+`);
  } else if (wordCount >= 1000) {
    analysis.score += 15;
  } else {
    analysis.score += 10;
  }
  
  // Keyword density
  const keywordDensity = calculateKeywordDensity(post.content, analysis.focusKeyword);
  if (keywordDensity < 0.5) {
    analysis.recommendations.push('Focus keyword appears too rarely');
  } else if (keywordDensity > 3) {
    analysis.issues.push('Focus keyword appears too often (keyword stuffing)');
  } else {
    analysis.score += 10;
  }
  
  // Readability
  const readability = calculateReadability(post.content);
  if (readability < 40) {
    analysis.recommendations.push('Content is difficult to read');
  } else if (readability > 60) {
    analysis.score += 10;
  }
  
  // Images
  const images = extractImages(post.content);
  const imagesWithAlt = images.filter(img => img.alt).length;
  if (images.length > 0 && imagesWithAlt === images.length) {
    analysis.score += 10;
  } else if (images.length > imagesWithAlt) {
    analysis.issues.push(`${images.length - imagesWithAlt} images missing alt text`);
  }
  
  // Internal links
  const internalLinks = extractInternalLinks(post.content);
  if (internalLinks.length === 0) {
    analysis.recommendations.push('Add internal links to related content');
  } else {
    analysis.score += 10;
  }
  
  // Headings
  const headings = extractHeadings(post.content);
  if (!headings.h1) {
    analysis.issues.push('Missing H1 heading');
  } else if (headings.h1.length > 1) {
    analysis.issues.push('Multiple H1 headings found');
  } else {
    analysis.score += 10;
  }
  
  // URL structure
  if (post.slug.length > 75) {
    analysis.recommendations.push('URL slug is too long');
  } else if (analysis.focusKeyword && !post.slug.includes(analysis.focusKeyword.toLowerCase().replace(/\s+/g, '-'))) {
    analysis.recommendations.push('Add focus keyword to URL');
  } else {
    analysis.score += 5;
  }
  
  return analysis;
}
```

### Schema Markup Generator
```typescript
// lib/schema-generator.ts
export function generateArticleSchema(post: Post, site: Site): object {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.seo_title || post.title,
    "description": post.seo_description || post.excerpt,
    "image": post.featured_image?.url,
    "datePublished": post.published_at,
    "dateModified": post.updated_at,
    "author": {
      "@type": "Person",
      "name": post.author.display_name,
      "url": `${site.url}/author/${post.author.username}`
    },
    "publisher": {
      "@type": "Organization",
      "name": site.name,
      "logo": {
        "@type": "ImageObject",
        "url": site.logo_url
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${site.url}${post.url}`
    }
  };
}

export function generateBreadcrumbSchema(breadcrumbs: Breadcrumb[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": crumb.label,
      "item": crumb.url
    }))
  };
}

export function generateFAQSchema(faqs: FAQ[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}
```

### XML Sitemap Generator
```typescript
// lib/sitemap-generator.ts
export async function generateSitemap(siteId: number): Promise<string> {
  const site = await getSite(siteId);
  const posts = await getPosts({ status: 'published', siteId });
  const pages = await getPages({ status: 'published', siteId });
  const categories = await getCategories(siteId);
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  // Homepage
  xml += generateUrlEntry(site.url, new Date(), 'daily', 1.0);
  
  // Posts
  for (const post of posts) {
    xml += generateUrlEntry(
      `${site.url}${post.url}`,
      post.updated_at,
      'weekly',
      0.8
    );
  }
  
  // Pages
  for (const page of pages) {
    xml += generateUrlEntry(
      `${site.url}${page.url}`,
      page.updated_at,
      'monthly',
      0.9
    );
  }
  
  // Categories
  for (const category of categories) {
    xml += generateUrlEntry(
      `${site.url}/category/${category.slug}`,
      category.updated_at,
      'weekly',
      0.7
    );
  }
  
  xml += '</urlset>';
  
  return xml;
}

function generateUrlEntry(
  url: string,
  lastmod: Date,
  changefreq: string,
  priority: number
): string {
  return `  <url>
    <loc>${escapeXml(url)}</loc>
    <lastmod>${lastmod.toISOString()}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>\n`;
}
```

### Redirect Handler
```typescript
// middleware/redirect-handler.ts
export async function handleRedirects(req: Request, siteId: number) {
  const pathname = new URL(req.url).pathname;
  
  // Check if redirect exists
  const redirect = await db.query(
    'SELECT * FROM site_?_redirects WHERE source_url = ? AND is_active = true',
    [siteId, pathname]
  );
  
  if (redirect) {
    // Increment hit count
    await db.query(
      'UPDATE site_?_redirects SET hit_count = hit_count + 1 WHERE id = ?',
      [siteId, redirect.id]
    );
    
    // Return redirect response
    return new Response(null, {
      status: parseInt(redirect.redirect_type),
      headers: {
        'Location': redirect.target_url,
        'Cache-Control': redirect.redirect_type === '301' 
          ? 'public, max-age=31536000' 
          : 'no-cache'
      }
    });
  }
  
  return null;
}
```

### 404 Error Tracker
```typescript
// lib/404-tracker.ts
export async function track404(req: Request, siteId: number) {
  const url = new URL(req.url).pathname;
  const referer = req.headers.get('referer');
  const userAgent = req.headers.get('user-agent');
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
  
  // Check if error already exists
  const existing = await db.query(
    'SELECT id FROM site_?_404_errors WHERE url = ?',
    [siteId, url]
  );
  
  if (existing) {
    // Update existing record
    await db.query(
      'UPDATE site_?_404_errors SET hit_count = hit_count + 1, last_seen = NOW() WHERE id = ?',
      [siteId, existing.id]
    );
  } else {
    // Create new record
    await db.query(
      'INSERT INTO site_?_404_errors (url, referer, user_agent, ip_address) VALUES (?, ?, ?, ?)',
      [siteId, url, referer, userAgent, ip]
    );
  }
}
```

## Admin Interface Features

### SEO Dashboard
- Overall SEO score
- SEO health trends
- Top performing pages
- Pages needing attention
- Recent 404 errors
- Redirect performance

### Content Editor SEO Panel
- Real-time SEO analysis
- Keyword density meter
- Readability score
- Character count for meta fields
- Social media preview
- Schema markup preview

### Redirect Manager
- Add/edit/delete redirects
- Bulk import redirects
- Test redirects
- View redirect analytics
- Auto-suggest redirects for 404s

### 404 Monitor
- List of 404 errors
- Sort by frequency
- Filter by date range
- Quick create redirect
- Mark as resolved
- Export to CSV

## Implementation Phases

### Phase 1: Core SEO (2-3 weeks)
- Meta tags management
- SEO analysis engine
- Content scoring
- Admin UI

### Phase 2: Schema & Markup (1-2 weeks)
- Schema.org generators
- Open Graph tags
- Twitter Cards
- Breadcrumbs

### Phase 3: Technical SEO (2 weeks)
- XML sitemap generation
- Robots.txt management
- Redirect system
- 404 tracking

### Phase 4: Analysis & Monitoring (2-3 weeks)
- SEO dashboard
- Rank tracking
- Search Console integration
- Analytics integration

### Phase 5: Advanced Features (1-2 weeks)
- Automated recommendations
- Competitor analysis
- SEO reports
- Bulk optimization tools

## User Stories

1. **Content Writer**: "I want real-time SEO feedback while writing"
2. **SEO Manager**: "I want to track keyword rankings and identify issues"
3. **Site Owner**: "I want to improve search rankings without being an expert"
4. **Developer**: "I want automatic schema markup and technical SEO"

## Success Metrics
- Average SEO score: >80/100
- Organic traffic increase: >50% in 6 months
- 404 error resolution: <24 hours
- Schema markup coverage: >90% of content

## Dependencies
- Activity logging (for SEO actions)
- Analytics dashboard (for traffic data)
- REST API (for external integrations)

## Risks & Mitigation
- **Risk**: SEO algorithm changes
  - **Mitigation**: Regular updates, follow best practices, flexible rules
  
- **Risk**: Performance impact of analysis
  - **Mitigation**: Async analysis, caching, background jobs
  
- **Risk**: Over-optimization penalties
  - **Mitigation**: Balanced recommendations, warnings

## Related Features
- Analytics dashboard (SEO metrics)
- Multi-language support (hreflang, international SEO)
- Advanced caching (page speed optimization)

