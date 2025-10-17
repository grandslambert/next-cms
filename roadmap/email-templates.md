# Email Templates

## Overview
Implement a comprehensive email template system for transactional emails, notifications, newsletters, and automated campaigns with a visual email builder and responsive designs.

## Goals
- Professional, branded email communications
- Automated transactional emails
- Newsletter and campaign management
- Email analytics and tracking
- Easy customization without coding

## Key Features

### Template Types
- **Transactional**: Password resets, account notifications
- **System**: User registration, role changes, activity alerts
- **Content**: New post notifications, comment notifications
- **Newsletter**: Regular newsletters, digest emails
- **Marketing**: Campaigns, announcements, promotions
- **Administrative**: Admin alerts, system notifications

### Visual Email Builder
- **Drag-and-Drop**: Build emails visually
- **Component Library**: Pre-built email components
- **Responsive Preview**: Desktop, tablet, mobile previews
- **Template Variables**: Dynamic content placeholders
- **Conditional Blocks**: Show/hide based on conditions
- **Live Preview**: See changes in real-time

### Email Customization
- **Branding**: Logo, colors, fonts per site
- **Header/Footer**: Reusable header and footer templates
- **Social Links**: Automated social media icons
- **Unsubscribe**: Automatic unsubscribe links
- **Personalization**: User-specific content
- **Localization**: Multi-language email templates

### Email Delivery
- **SMTP Integration**: Connect to any SMTP server
- **Service Providers**: SendGrid, Mailgun, AWS SES, Postmark
- **Queue Management**: Background email sending
- **Retry Logic**: Automatic retry on failure
- **Rate Limiting**: Control sending rate
- **Batch Sending**: Send to multiple recipients

### Newsletter Management
- **Subscriber Lists**: Manage email lists
- **Subscription Forms**: Embeddable signup forms
- **Double Opt-in**: Confirm subscriptions
- **Segmentation**: Target specific groups
- **Campaigns**: Create and schedule campaigns
- **A/B Testing**: Test subject lines and content

### Email Analytics
- **Open Rates**: Track email opens
- **Click Rates**: Track link clicks
- **Bounce Tracking**: Monitor delivery issues
- **Unsubscribe Rates**: Track opt-outs
- **Campaign Performance**: Compare campaigns
- **Heat Maps**: Click heat maps for emails

## Database Schema

### Email Templates Table
```sql
CREATE TABLE site_{id}_email_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL,
  type ENUM('transactional', 'system', 'content', 'newsletter', 'marketing', 'admin'),
  subject VARCHAR(500) NOT NULL,
  preview_text VARCHAR(200),
  html_content LONGTEXT NOT NULL,
  text_content TEXT,
  design_json JSON,
  variables JSON,
  is_active BOOLEAN DEFAULT true,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_slug (slug)
);
```

### Email Queue Table
```sql
CREATE TABLE site_{id}_email_queue (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  template_id INT,
  to_email VARCHAR(255) NOT NULL,
  to_name VARCHAR(200),
  from_email VARCHAR(255),
  from_name VARCHAR(200),
  subject VARCHAR(500) NOT NULL,
  html_body LONGTEXT,
  text_body TEXT,
  variables JSON,
  priority ENUM('high', 'normal', 'low') DEFAULT 'normal',
  status ENUM('pending', 'sending', 'sent', 'failed', 'cancelled') DEFAULT 'pending',
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  scheduled_at TIMESTAMP NULL,
  sent_at TIMESTAMP NULL,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_scheduled (scheduled_at),
  INDEX idx_priority (priority)
);
```

### Subscribers Table
```sql
CREATE TABLE site_{id}_email_subscribers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(200),
  status ENUM('active', 'unsubscribed', 'bounced', 'complained') DEFAULT 'active',
  subscription_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  unsubscribe_date TIMESTAMP NULL,
  confirmation_token VARCHAR(64),
  confirmed_at TIMESTAMP NULL,
  lists JSON,
  custom_fields JSON,
  source VARCHAR(100),
  ip_address VARCHAR(45),
  user_agent TEXT,
  UNIQUE KEY unique_email (email),
  INDEX idx_status (status),
  INDEX idx_confirmed (confirmed_at)
);
```

### Email Campaigns Table
```sql
CREATE TABLE site_{id}_email_campaigns (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  preview_text VARCHAR(200),
  template_id INT,
  html_content LONGTEXT,
  text_content TEXT,
  status ENUM('draft', 'scheduled', 'sending', 'sent', 'cancelled') DEFAULT 'draft',
  segment_filter JSON,
  send_to_count INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  opened_count INT DEFAULT 0,
  clicked_count INT DEFAULT 0,
  bounced_count INT DEFAULT 0,
  unsubscribed_count INT DEFAULT 0,
  scheduled_at TIMESTAMP NULL,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Email Analytics Table
```sql
CREATE TABLE site_{id}_email_analytics (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email_queue_id BIGINT,
  campaign_id INT,
  subscriber_id INT,
  event_type ENUM('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed'),
  event_data JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_queue (email_queue_id),
  INDEX idx_campaign (campaign_id),
  INDEX idx_subscriber (subscriber_id),
  INDEX idx_event (event_type),
  INDEX idx_date (created_at)
);
```

## Built-in Email Templates

### 1. Welcome Email
```html
Subject: Welcome to {{ site_name }}!

Hi {{ user_name }},

Welcome to {{ site_name }}! We're excited to have you here.

[Get Started Button]

If you have any questions, feel free to reach out.

Best regards,
The {{ site_name }} Team
```

### 2. Password Reset
```html
Subject: Reset Your Password

Hi {{ user_name }},

We received a request to reset your password.

[Reset Password Button]

This link will expire in {{ expiry_hours }} hours.

If you didn't request this, please ignore this email.

Best regards,
The {{ site_name }} Team
```

### 3. New Post Notification
```html
Subject: New Post: {{ post_title }}

Hi {{ subscriber_name }},

We just published a new post that you might enjoy:

{{ post_title }}
{{ post_excerpt }}

[Read More Button]

Best regards,
The {{ site_name }} Team
```

### 4. Comment Notification
```html
Subject: New Comment on "{{ post_title }}"

Hi {{ author_name }},

{{ commenter_name }} left a comment on your post "{{ post_title }}":

"{{ comment_excerpt }}"

[View Comment Button]

Best regards,
The {{ site_name }} Team
```

### 5. Newsletter Digest
```html
Subject: {{ site_name }} Weekly Digest

Hi {{ subscriber_name }},

Here are this week's highlights:

{% for post in recent_posts %}
  {{ post.title }}
  {{ post.excerpt }}
  [Read More]
{% endfor %}

[Visit {{ site_name }} Button]

Best regards,
The {{ site_name }} Team
```

## Implementation Examples

### Email Service
```typescript
// lib/email-service.ts
export class EmailService {
  private transporter: any;
  
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }
  
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const result = await this.transporter.sendMail({
        from: options.from || process.env.DEFAULT_FROM_EMAIL,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        headers: {
          'X-Campaign-ID': options.campaignId,
          'X-Subscriber-ID': options.subscriberId,
          'List-Unsubscribe': options.unsubscribeUrl
        }
      });
      
      await this.trackEvent('sent', options.emailQueueId);
      
      return true;
    } catch (error) {
      console.error('Email send error:', error);
      return false;
    }
  }
  
  async sendFromTemplate(
    templateSlug: string,
    to: string,
    variables: Record<string, any>
  ): Promise<boolean> {
    // Get template
    const template = await getEmailTemplate(templateSlug);
    
    // Render template with variables
    const html = this.renderTemplate(template.html_content, variables);
    const text = this.renderTemplate(template.text_content, variables);
    const subject = this.renderTemplate(template.subject, variables);
    
    // Queue email
    await this.queueEmail({
      template_id: template.id,
      to_email: to,
      subject,
      html_body: html,
      text_body: text,
      variables
    });
    
    return true;
  }
  
  renderTemplate(template: string, variables: Record<string, any>): string {
    let result = template;
    
    // Simple variable replacement
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(
        new RegExp(`{{\\s*${key}\\s*}}`, 'g'),
        String(value)
      );
    }
    
    return result;
  }
  
  async queueEmail(email: QueuedEmail): Promise<number> {
    const result = await db.query(
      'INSERT INTO email_queue SET ?',
      [email]
    );
    
    return result.insertId;
  }
}
```

### Email Queue Processor
```typescript
// lib/email-queue-processor.ts
export class EmailQueueProcessor {
  private emailService: EmailService;
  private isRunning: boolean = false;
  
  constructor() {
    this.emailService = new EmailService();
  }
  
  async start() {
    this.isRunning = true;
    
    while (this.isRunning) {
      await this.processBatch();
      await this.sleep(5000); // Process every 5 seconds
    }
  }
  
  async processBatch() {
    // Get pending emails
    const emails = await db.query(`
      SELECT * FROM email_queue
      WHERE status = 'pending'
      AND (scheduled_at IS NULL OR scheduled_at <= NOW())
      AND attempts < max_attempts
      ORDER BY priority DESC, created_at ASC
      LIMIT 10
    `);
    
    for (const email of emails) {
      await this.processEmail(email);
    }
  }
  
  async processEmail(email: QueuedEmail) {
    // Mark as sending
    await db.query(
      'UPDATE email_queue SET status = ?, attempts = attempts + 1 WHERE id = ?',
      ['sending', email.id]
    );
    
    try {
      // Send email
      const success = await this.emailService.sendEmail({
        to: email.to_email,
        subject: email.subject,
        html: email.html_body,
        text: email.text_body,
        emailQueueId: email.id
      });
      
      if (success) {
        // Mark as sent
        await db.query(
          'UPDATE email_queue SET status = ?, sent_at = NOW() WHERE id = ?',
          ['sent', email.id]
        );
      } else {
        throw new Error('Email send failed');
      }
    } catch (error) {
      // Mark as failed
      const status = email.attempts >= email.max_attempts ? 'failed' : 'pending';
      
      await db.query(
        'UPDATE email_queue SET status = ?, error_message = ? WHERE id = ?',
        [status, error.message, email.id]
      );
    }
  }
  
  stop() {
    this.isRunning = false;
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Visual Email Builder
```typescript
// components/EmailBuilder.tsx
export function EmailBuilder({ template, onSave }: Props) {
  const [design, setDesign] = useState(template?.design_json || {});
  const [preview, setPreview] = useState<'desktop' | 'mobile'>('desktop');
  
  const components = [
    { type: 'header', label: 'Header', icon: '📄' },
    { type: 'text', label: 'Text Block', icon: '📝' },
    { type: 'button', label: 'Button', icon: '🔘' },
    { type: 'image', label: 'Image', icon: '🖼️' },
    { type: 'divider', label: 'Divider', icon: '➖' },
    { type: 'social', label: 'Social Icons', icon: '📱' },
    { type: 'footer', label: 'Footer', icon: '📄' }
  ];
  
  const addComponent = (type: string) => {
    const newComponent = createComponent(type);
    setDesign({
      ...design,
      blocks: [...design.blocks, newComponent]
    });
  };
  
  const renderPreview = () => {
    return generateHTML(design);
  };
  
  return (
    <div className="flex h-screen">
      {/* Component Library */}
      <div className="w-64 bg-gray-100 p-4">
        <h3 className="font-bold mb-4">Components</h3>
        {components.map(comp => (
          <button
            key={comp.type}
            onClick={() => addComponent(comp.type)}
            className="w-full p-2 mb-2 bg-white rounded hover:bg-gray-50"
          >
            <span className="mr-2">{comp.icon}</span>
            {comp.label}
          </button>
        ))}
      </div>
      
      {/* Canvas */}
      <div className="flex-1 p-8 overflow-auto bg-gray-50">
        <div className={`mx-auto ${preview === 'mobile' ? 'max-w-sm' : 'max-w-2xl'}`}>
          <div 
            className="bg-white shadow-lg"
            dangerouslySetInnerHTML={{ __html: renderPreview() }}
          />
        </div>
      </div>
      
      {/* Properties Panel */}
      <div className="w-80 bg-gray-100 p-4">
        <h3 className="font-bold mb-4">Properties</h3>
        {/* Component-specific properties */}
      </div>
    </div>
  );
}
```

### Subscription Form Widget
```typescript
// components/SubscriptionForm.tsx
export function SubscriptionForm({ listId, inline = false }: Props) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    
    try {
      const response = await fetch('/api/email/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, listId })
      });
      
      if (response.ok) {
        setStatus('success');
        setEmail('');
        setName('');
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    }
  };
  
  if (status === 'success') {
    return (
      <div className="p-4 bg-green-50 text-green-800 rounded">
        ✓ Thanks for subscribing! Please check your email to confirm.
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit} className={inline ? 'flex gap-2' : 'space-y-4'}>
      {!inline && (
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2 border rounded"
        />
      )}
      
      <input
        type="email"
        placeholder="Your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full px-4 py-2 border rounded"
      />
      
      <button
        type="submit"
        disabled={status === 'loading'}
        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
      </button>
      
      {status === 'error' && (
        <p className="text-red-600 text-sm">
          Something went wrong. Please try again.
        </p>
      )}
    </form>
  );
}
```

## Implementation Phases

### Phase 1: Core System (2-3 weeks)
- Email service setup
- Queue system
- Basic templates
- SMTP integration

### Phase 2: Template Management (2 weeks)
- Template CRUD
- Variable system
- Built-in templates
- Admin UI

### Phase 3: Visual Builder (3-4 weeks)
- Drag-and-drop builder
- Component library
- Responsive preview
- Template export/import

### Phase 4: Newsletter System (2-3 weeks)
- Subscriber management
- Subscription forms
- Campaign creation
- Segmentation

### Phase 5: Analytics (1-2 weeks)
- Open tracking
- Click tracking
- Campaign reports
- A/B testing

## User Stories

1. **Site Owner**: "I want professional-looking emails without hiring a designer"
2. **Marketing Manager**: "I want to send newsletters and track their performance"
3. **Developer**: "I want reliable email delivery with retry logic"
4. **Content Creator**: "I want to notify subscribers when I publish new content"

## Success Metrics
- Email delivery rate: >99%
- Average open rate: >20%
- Template creation time: <30 minutes
- Queue processing time: <5 seconds per email

## Dependencies
- Activity logging (for email tracking)
- Analytics dashboard (for email metrics)
- REST API (for subscription API)

## Risks & Mitigation
- **Risk**: Emails marked as spam
  - **Mitigation**: SPF/DKIM/DMARC setup, reputation monitoring, double opt-in
  
- **Risk**: Email delivery failures
  - **Mitigation**: Queue system, retry logic, multiple providers
  
- **Risk**: Privacy and compliance (GDPR, CAN-SPAM)
  - **Mitigation**: Unsubscribe links, data export, consent management

## Related Features
- Activity logging (email events)
- Analytics dashboard (email performance)
- Webhooks (email status notifications)

