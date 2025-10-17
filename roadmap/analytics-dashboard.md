# Analytics Dashboard

## Overview
Build a comprehensive analytics system that provides insights into content performance, user behavior, traffic sources, and business metrics, helping site owners make data-driven decisions.

## Goals
- Understand user behavior and engagement
- Track content performance
- Measure conversion goals
- Provide actionable insights
- Privacy-focused analytics

## Key Features

### Traffic Analytics
- **Page Views**: Total and unique page views
- **Unique Visitors**: Daily, weekly, monthly visitors
- **Sessions**: Session duration and pages per session
- **Bounce Rate**: Single-page session percentage
- **Traffic Sources**: Direct, referral, search, social
- **Geographic Data**: Visitor locations (country, city)
- **Device Analytics**: Desktop, mobile, tablet breakdown

### Content Performance
- **Top Pages**: Most viewed pages
- **Top Posts**: Best performing blog posts
- **Entry Pages**: Where visitors land
- **Exit Pages**: Where visitors leave
- **Time on Page**: Average reading time
- **Scroll Depth**: How far users scroll
- **Content Categories**: Performance by category/tag

### User Behavior
- **User Flow**: Visitor navigation paths
- **Event Tracking**: Clicks, downloads, video plays
- **Heatmaps**: Click and scroll heatmaps
- **Session Recordings**: (Optional) replay user sessions
- **Search Terms**: Internal search queries
- **404 Errors**: Broken links and missing pages

### Conversion Tracking
- **Goal Completion**: Track specific actions
- **Form Submissions**: Contact, newsletter signups
- **Download Tracking**: File downloads
- **Outbound Clicks**: External link tracking
- **E-commerce**: Sales, revenue, conversion rate
- **Funnel Analysis**: Multi-step conversion funnels

### Real-Time Analytics
- **Active Users**: Currently online visitors
- **Live Page Views**: Real-time page activity
- **Traffic Sources**: Live traffic channels
- **Popular Pages**: Current trending content
- **Geographic Map**: Visitor locations in real-time

### Reports & Insights
- **Custom Reports**: Build your own reports
- **Scheduled Reports**: Email reports daily/weekly
- **Data Export**: CSV, Excel, PDF exports
- **Report Sharing**: Share with team members
- **Comparative Analysis**: Compare time periods
- **Trend Analysis**: Identify growth trends

## Database Schema

### Page Views Table
```sql
CREATE TABLE site_{id}_analytics_pageviews (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  visitor_id VARCHAR(64) NOT NULL,
  session_id VARCHAR(64) NOT NULL,
  page_url VARCHAR(500) NOT NULL,
  page_title VARCHAR(500),
  post_id INT NULL,
  referrer VARCHAR(500),
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  utm_term VARCHAR(100),
  utm_content VARCHAR(100),
  device_type ENUM('desktop', 'mobile', 'tablet', 'bot'),
  browser VARCHAR(50),
  os VARCHAR(50),
  country VARCHAR(2),
  city VARCHAR(100),
  ip_address VARCHAR(45),
  duration INT DEFAULT 0,
  scroll_depth INT DEFAULT 0,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_visitor (visitor_id),
  INDEX idx_session (session_id),
  INDEX idx_page (page_url),
  INDEX idx_post (post_id),
  INDEX idx_date (viewed_at)
) ENGINE=InnoDB ROW_FORMAT=COMPRESSED;
```

### Events Table
```sql
CREATE TABLE site_{id}_analytics_events (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  visitor_id VARCHAR(64) NOT NULL,
  session_id VARCHAR(64) NOT NULL,
  event_category VARCHAR(100) NOT NULL,
  event_action VARCHAR(100) NOT NULL,
  event_label VARCHAR(200),
  event_value INT,
  page_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_visitor (visitor_id),
  INDEX idx_category (event_category),
  INDEX idx_date (created_at)
);
```

### Goals Table
```sql
CREATE TABLE site_{id}_analytics_goals (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  goal_type ENUM('url', 'event', 'duration', 'pages_per_session'),
  target_value VARCHAR(500),
  value_amount DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE site_{id}_analytics_goal_completions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  goal_id INT NOT NULL,
  visitor_id VARCHAR(64) NOT NULL,
  session_id VARCHAR(64) NOT NULL,
  value DECIMAL(10,2),
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (goal_id) REFERENCES site_{id}_analytics_goals(id) ON DELETE CASCADE,
  INDEX idx_goal (goal_id),
  INDEX idx_date (completed_at)
);
```

### Summary Tables (for performance)
```sql
CREATE TABLE site_{id}_analytics_daily_summary (
  id INT PRIMARY KEY AUTO_INCREMENT,
  date DATE NOT NULL,
  page_views INT DEFAULT 0,
  unique_visitors INT DEFAULT 0,
  sessions INT DEFAULT 0,
  bounce_rate DECIMAL(5,2),
  avg_session_duration INT,
  avg_pages_per_session DECIMAL(5,2),
  goal_completions INT DEFAULT 0,
  goal_value DECIMAL(10,2),
  UNIQUE KEY unique_date (date),
  INDEX idx_date (date)
);

CREATE TABLE site_{id}_analytics_page_summary (
  id INT PRIMARY KEY AUTO_INCREMENT,
  date DATE NOT NULL,
  page_url VARCHAR(500) NOT NULL,
  post_id INT NULL,
  page_views INT DEFAULT 0,
  unique_visitors INT DEFAULT 0,
  avg_time_on_page INT,
  avg_scroll_depth INT,
  bounce_rate DECIMAL(5,2),
  UNIQUE KEY unique_date_page (date, page_url),
  INDEX idx_date (date),
  INDEX idx_post (post_id)
);
```

## Implementation Examples

### Tracking Script
```typescript
// public/analytics.js
(function() {
  const analytics = {
    visitorId: null,
    sessionId: null,
    
    init: function() {
      this.visitorId = this.getOrCreateVisitorId();
      this.sessionId = this.getOrCreateSessionId();
      this.trackPageView();
      this.setupEventListeners();
    },
    
    getOrCreateVisitorId: function() {
      let id = localStorage.getItem('visitor_id');
      if (!id) {
        id = this.generateId();
        localStorage.setItem('visitor_id', id);
      }
      return id;
    },
    
    getOrCreateSessionId: function() {
      let id = sessionStorage.getItem('session_id');
      if (!id) {
        id = this.generateId();
        sessionStorage.setItem('session_id', id);
      }
      return id;
    },
    
    generateId: function() {
      return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    trackPageView: function() {
      const data = {
        visitor_id: this.visitorId,
        session_id: this.sessionId,
        page_url: window.location.pathname,
        page_title: document.title,
        referrer: document.referrer,
        screen_resolution: `${screen.width}x${screen.height}`,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString()
      };
      
      // Extract UTM parameters
      const urlParams = new URLSearchParams(window.location.search);
      ['source', 'medium', 'campaign', 'term', 'content'].forEach(param => {
        const value = urlParams.get(`utm_${param}`);
        if (value) data[`utm_${param}`] = value;
      });
      
      this.send('/api/analytics/pageview', data);
      
      // Track time on page
      this.startTimeTracking();
      this.trackScrollDepth();
    },
    
    trackEvent: function(category, action, label, value) {
      const data = {
        visitor_id: this.visitorId,
        session_id: this.sessionId,
        event_category: category,
        event_action: action,
        event_label: label,
        event_value: value,
        page_url: window.location.pathname
      };
      
      this.send('/api/analytics/event', data);
    },
    
    startTimeTracking: function() {
      const startTime = Date.now();
      
      window.addEventListener('beforeunload', () => {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        navigator.sendBeacon(
          '/api/analytics/duration',
          JSON.stringify({
            visitor_id: this.visitorId,
            session_id: this.sessionId,
            page_url: window.location.pathname,
            duration: duration
          })
        );
      });
    },
    
    trackScrollDepth: function() {
      let maxScroll = 0;
      
      window.addEventListener('scroll', () => {
        const scrollPercentage = Math.floor(
          (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
        );
        
        if (scrollPercentage > maxScroll) {
          maxScroll = scrollPercentage;
        }
      });
      
      window.addEventListener('beforeunload', () => {
        navigator.sendBeacon(
          '/api/analytics/scroll',
          JSON.stringify({
            visitor_id: this.visitorId,
            session_id: this.sessionId,
            page_url: window.location.pathname,
            scroll_depth: maxScroll
          })
        );
      });
    },
    
    setupEventListeners: function() {
      // Track outbound links
      document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && link.hostname !== window.location.hostname) {
          this.trackEvent('Outbound', 'Click', link.href);
        }
      });
      
      // Track downloads
      document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && /\.(pdf|zip|doc|docx|xls|xlsx|ppt|pptx)$/i.test(link.href)) {
          this.trackEvent('Download', 'Click', link.href);
        }
      });
      
      // Track form submissions
      document.addEventListener('submit', (e) => {
        if (e.target.tagName === 'FORM') {
          this.trackEvent('Form', 'Submit', e.target.action || window.location.pathname);
        }
      });
    },
    
    send: function(endpoint, data) {
      fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }).catch(err => console.error('Analytics error:', err));
    }
  };
  
  analytics.init();
  
  // Expose to window for custom tracking
  window.trackEvent = analytics.trackEvent.bind(analytics);
})();
```

### Analytics API Endpoint
```typescript
// app/api/analytics/pageview/route.ts
export async function POST(req: Request) {
  const data = await req.json();
  const siteId = getCurrentSiteId(req);
  
  // Get device info
  const ua = parseUserAgent(data.user_agent);
  
  // Get geo info (from IP)
  const geo = await getGeoLocation(data.ip_address || getClientIp(req));
  
  // Insert page view
  await db.query(`
    INSERT INTO site_${siteId}_analytics_pageviews 
    (visitor_id, session_id, page_url, page_title, referrer, 
     utm_source, utm_medium, utm_campaign, utm_term, utm_content,
     device_type, browser, os, country, city, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    data.visitor_id,
    data.session_id,
    data.page_url,
    data.page_title,
    data.referrer,
    data.utm_source,
    data.utm_medium,
    data.utm_campaign,
    data.utm_term,
    data.utm_content,
    ua.device_type,
    ua.browser,
    ua.os,
    geo.country,
    geo.city,
    data.ip_address || getClientIp(req)
  ]);
  
  return Response.json({ success: true });
}
```

### Dashboard Data Aggregation
```typescript
// lib/analytics-aggregator.ts
export async function getDashboardData(
  siteId: number,
  dateRange: DateRange
): Promise<DashboardData> {
  const [stats, topPages, trafficSources, deviceBreakdown] = await Promise.all([
    getOverallStats(siteId, dateRange),
    getTopPages(siteId, dateRange, 10),
    getTrafficSources(siteId, dateRange),
    getDeviceBreakdown(siteId, dateRange)
  ]);
  
  return {
    stats,
    topPages,
    trafficSources,
    deviceBreakdown
  };
}

async function getOverallStats(siteId: number, dateRange: DateRange) {
  const [current, previous] = await Promise.all([
    db.query(`
      SELECT 
        COUNT(*) as page_views,
        COUNT(DISTINCT visitor_id) as unique_visitors,
        COUNT(DISTINCT session_id) as sessions,
        AVG(duration) as avg_session_duration,
        SUM(CASE WHEN (
          SELECT COUNT(*) 
          FROM site_${siteId}_analytics_pageviews pv2 
          WHERE pv2.session_id = pv.session_id
        ) = 1 THEN 1 ELSE 0 END) / COUNT(DISTINCT session_id) * 100 as bounce_rate
      FROM site_${siteId}_analytics_pageviews pv
      WHERE viewed_at BETWEEN ? AND ?
    `, [dateRange.start, dateRange.end]),
    
    db.query(`
      SELECT 
        COUNT(*) as page_views,
        COUNT(DISTINCT visitor_id) as unique_visitors
      FROM site_${siteId}_analytics_pageviews
      WHERE viewed_at BETWEEN ? AND ?
    `, [dateRange.previousStart, dateRange.previousEnd])
  ]);
  
  return {
    pageViews: {
      value: current.page_views,
      change: calculatePercentageChange(current.page_views, previous.page_views)
    },
    uniqueVisitors: {
      value: current.unique_visitors,
      change: calculatePercentageChange(current.unique_visitors, previous.unique_visitors)
    },
    sessions: current.sessions,
    avgSessionDuration: current.avg_session_duration,
    bounceRate: current.bounce_rate
  };
}
```

### Real-Time Dashboard
```typescript
// components/RealTimeDashboard.tsx
export function RealTimeDashboard() {
  const [realTimeData, setRealTimeData] = useState<RealTimeData | null>(null);
  
  useEffect(() => {
    // Fetch real-time data every 5 seconds
    const interval = setInterval(async () => {
      const data = await fetch('/api/analytics/realtime').then(r => r.json());
      setRealTimeData(data);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="grid grid-cols-4 gap-4">
      <Card>
        <h3>Active Users</h3>
        <div className="text-4xl font-bold">{realTimeData?.activeUsers || 0}</div>
      </Card>
      
      <Card>
        <h3>Page Views (last 30 min)</h3>
        <div className="text-4xl font-bold">{realTimeData?.recentPageViews || 0}</div>
      </Card>
      
      <Card>
        <h3>Top Page Right Now</h3>
        <div className="text-lg">{realTimeData?.topPage?.title}</div>
        <div className="text-sm text-gray-500">{realTimeData?.topPage?.views} views</div>
      </Card>
      
      <Card>
        <h3>Top Referrer</h3>
        <div className="text-lg">{realTimeData?.topReferrer?.source}</div>
        <div className="text-sm text-gray-500">{realTimeData?.topReferrer?.count} visitors</div>
      </Card>
      
      <Card className="col-span-4">
        <h3>Active Pages</h3>
        <table>
          <thead>
            <tr>
              <th>Page</th>
              <th>Active Users</th>
            </tr>
          </thead>
          <tbody>
            {realTimeData?.activePages?.map(page => (
              <tr key={page.url}>
                <td>{page.title}</td>
                <td>{page.activeUsers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
```

## Implementation Phases

### Phase 1: Core Tracking (2-3 weeks)
- Tracking script
- Page view tracking
- Basic analytics API
- Database schema

### Phase 2: Dashboard (2-3 weeks)
- Overview dashboard
- Traffic analytics
- Content performance
- Charts and visualizations

### Phase 3: Advanced Analytics (2-3 weeks)
- Event tracking
- Goal tracking
- User flow
- Custom reports

### Phase 4: Real-Time & Insights (2 weeks)
- Real-time dashboard
- Automated insights
- Anomaly detection
- Alerts and notifications

### Phase 5: Integrations (1-2 weeks)
- Google Analytics export
- Search Console integration
- External API
- Data warehouse export

## User Stories

1. **Site Owner**: "I want to see how many people visit my site and what they read"
2. **Marketing Manager**: "I want to track campaign performance and conversions"
3. **Content Creator**: "I want to know which posts perform best"
4. **Developer**: "I want privacy-focused analytics that I control"

## Success Metrics
- Tracking accuracy: >99%
- Dashboard load time: <2 seconds
- Real-time latency: <5 seconds
- Data retention: 2+ years

## Dependencies
- Advanced caching (for performance)
- Activity logging (for audit trail)
- REST API (for external access)

## Risks & Mitigation
- **Risk**: Performance impact of tracking
  - **Mitigation**: Async tracking, efficient queries, summary tables
  
- **Risk**: Privacy concerns and GDPR compliance
  - **Mitigation**: Cookie consent, IP anonymization, data export/deletion
  
- **Risk**: Large data volume
  - **Mitigation**: Data aggregation, archival, partitioning

## Related Features
- Advanced SEO tools (SEO metrics)
- CDN integration (bandwidth metrics)
- Advanced caching (performance metrics)

