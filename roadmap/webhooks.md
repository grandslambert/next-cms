# Webhooks

## Overview
Implement a comprehensive webhook system that allows Next CMS to send real-time HTTP notifications to external services when specific events occur, enabling seamless integrations and automation workflows.

## Goals
- Enable real-time event notifications
- Support third-party integrations
- Provide reliable delivery with retry logic
- Allow flexible event filtering
- Support webhook security

## Key Features

### Event Types
- **Post Events**: Created, updated, published, deleted, status changed
- **User Events**: Registered, updated, deleted, role changed
- **Media Events**: Uploaded, updated, deleted
- **Comment Events**: Posted, approved, deleted
- **Taxonomy Events**: Term created, updated, deleted
- **Menu Events**: Created, updated, deleted
- **System Events**: Settings changed, site created, backup completed

### Webhook Management
- **Webhook Registration**: Add webhook endpoints via UI
- **Event Selection**: Choose which events to receive
- **Payload Customization**: Select which data to include
- **Secret Keys**: Secure webhook signatures
- **Active/Inactive**: Enable/disable webhooks
- **Test Webhooks**: Send test payloads

### Delivery Features
- **Retry Logic**: Automatic retries on failure
- **Exponential Backoff**: Increasing delays between retries
- **Queue System**: Asynchronous delivery
- **Batch Delivery**: Group multiple events
- **Priority Levels**: High, normal, low priority
- **Timeout Configuration**: Configurable request timeouts

### Security
- **HMAC Signatures**: Verify webhook authenticity
- **Secret Keys**: Per-webhook secret tokens
- **IP Whitelisting**: Restrict to specific IPs (for receiving)
- **HTTPS Only**: Require secure connections
- **Rate Limiting**: Prevent abuse
- **Replay Protection**: Timestamp-based validation

### Monitoring & Logging
- **Delivery Status**: Track successful/failed deliveries
- **Response Logging**: Store webhook responses
- **Performance Metrics**: Average delivery time
- **Error Tracking**: Capture and display errors
- **Delivery History**: View past webhook calls
- **Webhook Dashboard**: Overview of all webhooks

## Database Schema

### Webhooks Table
```sql
CREATE TABLE site_{id}_webhooks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  url VARCHAR(500) NOT NULL,
  events JSON NOT NULL,
  secret_key VARCHAR(64),
  is_active BOOLEAN DEFAULT true,
  timeout_seconds INT DEFAULT 30,
  retry_max_attempts INT DEFAULT 3,
  retry_backoff_seconds INT DEFAULT 60,
  custom_headers JSON,
  payload_template JSON,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active (is_active)
);
```

### Webhook Deliveries Table
```sql
CREATE TABLE site_{id}_webhook_deliveries (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  webhook_id INT NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSON NOT NULL,
  status ENUM('pending', 'sending', 'success', 'failed', 'cancelled') DEFAULT 'pending',
  http_status INT,
  response_body TEXT,
  response_headers JSON,
  error_message TEXT,
  attempts INT DEFAULT 0,
  next_retry_at TIMESTAMP NULL,
  duration_ms INT,
  sent_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (webhook_id) REFERENCES site_{id}_webhooks(id) ON DELETE CASCADE,
  INDEX idx_webhook (webhook_id),
  INDEX idx_status (status),
  INDEX idx_event (event_type),
  INDEX idx_retry (next_retry_at)
);
```

## Event Payload Examples

### Post Published
```json
{
  "event": "post.published",
  "timestamp": "2025-10-17T12:00:00Z",
  "site_id": 1,
  "data": {
    "post": {
      "id": 123,
      "title": "My New Blog Post",
      "slug": "my-new-blog-post",
      "content": "Full post content here...",
      "excerpt": "Post excerpt...",
      "status": "published",
      "post_type": "post",
      "author": {
        "id": 5,
        "username": "john",
        "display_name": "John Doe"
      },
      "featured_image": {
        "id": 45,
        "url": "https://example.com/image.jpg",
        "alt": "Image description"
      },
      "categories": [
        {"id": 1, "name": "Technology", "slug": "technology"}
      ],
      "tags": [
        {"id": 10, "name": "JavaScript", "slug": "javascript"}
      ],
      "published_at": "2025-10-17T12:00:00Z",
      "url": "https://example.com/blog/my-new-blog-post"
    }
  }
}
```

### User Created
```json
{
  "event": "user.created",
  "timestamp": "2025-10-17T12:00:00Z",
  "site_id": 1,
  "data": {
    "user": {
      "id": 42,
      "username": "newuser",
      "email": "newuser@example.com",
      "display_name": "New User",
      "role": "author",
      "created_at": "2025-10-17T12:00:00Z"
    }
  }
}
```

### Media Uploaded
```json
{
  "event": "media.uploaded",
  "timestamp": "2025-10-17T12:00:00Z",
  "site_id": 1,
  "data": {
    "media": {
      "id": 67,
      "filename": "photo.jpg",
      "original_filename": "IMG_1234.jpg",
      "mime_type": "image/jpeg",
      "file_size": 245760,
      "width": 1920,
      "height": 1080,
      "url": "https://example.com/uploads/2025/10/photo.jpg",
      "sizes": [
        {
          "name": "thumbnail",
          "width": 150,
          "height": 150,
          "url": "https://example.com/uploads/2025/10/photo-150x150.jpg"
        }
      ],
      "uploaded_by": 5,
      "created_at": "2025-10-17T12:00:00Z"
    }
  }
}
```

## Implementation Examples

### Webhook Service
```typescript
// lib/webhook-service.ts
export class WebhookService {
  async trigger(event: string, data: any, siteId: number) {
    // Get webhooks listening to this event
    const webhooks = await this.getWebhooksForEvent(event, siteId);
    
    for (const webhook of webhooks) {
      // Create delivery record
      await this.queueDelivery(webhook, event, data);
    }
  }
  
  async getWebhooksForEvent(event: string, siteId: number) {
    const webhooks = await db.query(
      'SELECT * FROM site_?_webhooks WHERE is_active = true',
      [siteId]
    );
    
    return webhooks.filter(webhook => 
      webhook.events.includes(event) || webhook.events.includes('*')
    );
  }
  
  async queueDelivery(webhook: Webhook, event: string, data: any) {
    const payload = this.buildPayload(webhook, event, data);
    
    await db.query(
      'INSERT INTO webhook_deliveries (webhook_id, event_type, payload) VALUES (?, ?, ?)',
      [webhook.id, event, JSON.stringify(payload)]
    );
  }
  
  buildPayload(webhook: Webhook, event: string, data: any) {
    const payload = {
      event,
      timestamp: new Date().toISOString(),
      site_id: webhook.site_id,
      data
    };
    
    // Apply custom payload template if exists
    if (webhook.payload_template) {
      return this.applyTemplate(payload, webhook.payload_template);
    }
    
    return payload;
  }
  
  async deliver(delivery: WebhookDelivery) {
    const webhook = await this.getWebhook(delivery.webhook_id);
    
    // Mark as sending
    await db.query(
      'UPDATE webhook_deliveries SET status = ?, attempts = attempts + 1 WHERE id = ?',
      ['sending', delivery.id]
    );
    
    const startTime = Date.now();
    
    try {
      // Generate signature
      const signature = this.generateSignature(
        delivery.payload,
        webhook.secret_key
      );
      
      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'NextCMS-Webhook/1.0',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': delivery.event_type,
        'X-Webhook-Delivery': delivery.id.toString(),
        ...webhook.custom_headers
      };
      
      // Send request
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: delivery.payload,
        signal: AbortSignal.timeout(webhook.timeout_seconds * 1000)
      });
      
      const duration = Date.now() - startTime;
      const responseBody = await response.text();
      
      if (response.ok) {
        // Success
        await db.query(
          `UPDATE webhook_deliveries 
           SET status = ?, http_status = ?, response_body = ?, 
               duration_ms = ?, sent_at = NOW(), completed_at = NOW()
           WHERE id = ?`,
          ['success', response.status, responseBody, duration, delivery.id]
        );
      } else {
        throw new Error(`HTTP ${response.status}: ${responseBody}`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Should we retry?
      if (delivery.attempts < webhook.retry_max_attempts) {
        const nextRetry = this.calculateNextRetry(
          delivery.attempts,
          webhook.retry_backoff_seconds
        );
        
        await db.query(
          `UPDATE webhook_deliveries 
           SET status = ?, error_message = ?, duration_ms = ?, next_retry_at = ?
           WHERE id = ?`,
          ['pending', error.message, duration, nextRetry, delivery.id]
        );
      } else {
        // Max retries exceeded
        await db.query(
          `UPDATE webhook_deliveries 
           SET status = ?, error_message = ?, duration_ms = ?, completed_at = NOW()
           WHERE id = ?`,
          ['failed', error.message, duration, delivery.id]
        );
      }
    }
  }
  
  generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }
  
  calculateNextRetry(attempts: number, baseDelay: number): Date {
    // Exponential backoff: 1min, 2min, 4min, 8min, etc.
    const delaySeconds = baseDelay * Math.pow(2, attempts);
    return new Date(Date.now() + delaySeconds * 1000);
  }
  
  verifyWebhook(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}
```

### Webhook Processor
```typescript
// lib/webhook-processor.ts
export class WebhookProcessor {
  private webhookService: WebhookService;
  private isRunning: boolean = false;
  
  constructor() {
    this.webhookService = new WebhookService();
  }
  
  async start() {
    this.isRunning = true;
    
    while (this.isRunning) {
      await this.processBatch();
      await this.sleep(5000); // Process every 5 seconds
    }
  }
  
  async processBatch() {
    // Get pending deliveries
    const deliveries = await db.query(`
      SELECT * FROM webhook_deliveries
      WHERE status = 'pending'
      AND (next_retry_at IS NULL OR next_retry_at <= NOW())
      ORDER BY created_at ASC
      LIMIT 10
    `);
    
    // Process in parallel
    await Promise.all(
      deliveries.map(delivery => 
        this.webhookService.deliver(delivery)
      )
    );
  }
  
  stop() {
    this.isRunning = false;
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Trigger Webhooks on Events
```typescript
// Example: Trigger webhook when post is published
export async function publishPost(postId: number) {
  // Update post status
  await db.query(
    'UPDATE posts SET status = ?, published_at = NOW() WHERE id = ?',
    ['published', postId]
  );
  
  // Get post data
  const post = await getPost(postId);
  
  // Trigger webhook
  await webhookService.trigger('post.published', { post }, post.site_id);
  
  // Log activity
  await logActivity('post.published', { postId });
}
```

### Admin UI - Webhook Form
```typescript
// components/WebhookForm.tsx
export function WebhookForm({ webhook, onSave }: Props) {
  const [url, setUrl] = useState(webhook?.url || '');
  const [events, setEvents] = useState<string[]>(webhook?.events || []);
  const [secretKey, setSecretKey] = useState(webhook?.secret_key || '');
  
  const availableEvents = [
    { value: 'post.created', label: 'Post Created' },
    { value: 'post.updated', label: 'Post Updated' },
    { value: 'post.published', label: 'Post Published' },
    { value: 'post.deleted', label: 'Post Deleted' },
    { value: 'user.created', label: 'User Created' },
    { value: 'user.updated', label: 'User Updated' },
    { value: 'media.uploaded', label: 'Media Uploaded' },
    { value: '*', label: 'All Events' }
  ];
  
  const generateSecretKey = () => {
    const key = crypto.randomBytes(32).toString('hex');
    setSecretKey(key);
  };
  
  const testWebhook = async () => {
    const response = await fetch('/api/webhooks/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, secret_key: secretKey })
    });
    
    const result = await response.json();
    alert(result.success ? 'Test successful!' : 'Test failed: ' + result.error);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Webhook URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://your-app.com/webhook"
          required
        />
      </div>
      
      <div>
        <label>Events</label>
        {availableEvents.map(event => (
          <label key={event.value}>
            <input
              type="checkbox"
              checked={events.includes(event.value)}
              onChange={(e) => {
                if (e.target.checked) {
                  setEvents([...events, event.value]);
                } else {
                  setEvents(events.filter(e => e !== event.value));
                }
              }}
            />
            {event.label}
          </label>
        ))}
      </div>
      
      <div>
        <label>Secret Key</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            placeholder="Optional secret for HMAC signatures"
          />
          <button type="button" onClick={generateSecretKey}>
            Generate
          </button>
        </div>
      </div>
      
      <div className="flex gap-2">
        <button type="submit">Save Webhook</button>
        <button type="button" onClick={testWebhook}>
          Test Webhook
        </button>
      </div>
    </form>
  );
}
```

## Integration Examples

### Zapier Integration
```typescript
// Zapier can consume webhooks directly
const zapierWebhook = {
  name: 'Zapier - New Post',
  url: 'https://hooks.zapier.com/hooks/catch/12345/abcde/',
  events: ['post.published']
};
```

### Slack Notification
```typescript
// Format webhook for Slack
const slackWebhook = {
  name: 'Slack Notifications',
  url: 'https://hooks.slack.com/services/T00/B00/XXXX',
  events: ['post.published', 'user.created'],
  payload_template: {
    text: '{{event}} occurred',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*{{data.post.title}}* was published by {{data.post.author.display_name}}'
        }
      }
    ]
  }
};
```

### Discord Notification
```typescript
const discordWebhook = {
  name: 'Discord Notifications',
  url: 'https://discord.com/api/webhooks/123456/abcdef',
  events: ['post.published'],
  payload_template: {
    content: 'New post published!',
    embeds: [{
      title: '{{data.post.title}}',
      description: '{{data.post.excerpt}}',
      url: '{{data.post.url}}',
      color: 3447003
    }]
  }
};
```

## Implementation Phases

### Phase 1: Core System (2-3 weeks)
- Webhook registration
- Event triggering
- Basic delivery
- Database schema

### Phase 2: Reliability (1-2 weeks)
- Retry logic
- Queue system
- Error handling
- Timeout management

### Phase 3: Security (1 week)
- HMAC signatures
- Secret keys
- HTTPS enforcement
- Validation

### Phase 4: UI & Monitoring (2 weeks)
- Admin interface
- Delivery history
- Performance metrics
- Dashboard

### Phase 5: Advanced Features (1-2 weeks)
- Payload templates
- Batch delivery
- Custom headers
- Testing tools

## User Stories

1. **Developer**: "I want to trigger actions in other systems when content is published"
2. **Integration Specialist**: "I want to connect Next CMS to Zapier/Make/n8n"
3. **Site Owner**: "I want Slack notifications when important events occur"
4. **System Admin**: "I want reliable webhook delivery with monitoring"

## Success Metrics
- Delivery success rate: >99%
- Average delivery time: <2 seconds
- Retry success rate: >90%
- Zero data loss

## Dependencies
- Activity logging (for webhook events)
- Advanced caching (for webhook configuration)
- REST API (webhook management API)

## Risks & Mitigation
- **Risk**: Webhook endpoint downtime
  - **Mitigation**: Retry logic, exponential backoff, max attempts
  
- **Risk**: Slow webhook endpoints blocking delivery
  - **Mitigation**: Timeouts, async processing, queue system
  
- **Risk**: Security vulnerabilities
  - **Mitigation**: HMAC signatures, HTTPS only, rate limiting

## Related Features
- Email templates (webhook for email events)
- Analytics dashboard (webhook performance metrics)
- REST API (webhook management)

