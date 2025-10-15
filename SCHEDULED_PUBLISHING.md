# Scheduled Publishing

Next CMS supports WordPress-style scheduled publishing, allowing you to set future publication dates for your posts.

## How It Works

1. **Schedule a Post**: When editing a post, enter a future date/time in the "Schedule Publish" field and click "Schedule Post"
2. **Automatic Publication**: Posts with scheduled dates are automatically published when the scheduled time arrives
3. **Background Processing**: A cron job checks for scheduled posts and publishes them automatically

## Setting Up the Cron Job

To enable automatic publishing of scheduled posts, you need to set up a cron job that calls the processing endpoint regularly.

### Option 1: System Cron (Linux/Mac)

1. Open your crontab:
   ```bash
   crontab -e
   ```

2. Add this line to check every minute:
   ```cron
   * * * * * curl -X POST http://localhost:3000/api/posts/process-scheduled
   ```

3. For production, use your actual domain:
   ```cron
   * * * * * curl -X POST https://yourdomain.com/api/posts/process-scheduled
   ```

### Option 2: External Cron Service

Use a service like:
- **EasyCron** (https://www.easycron.com)
- **cron-job.org** (https://cron-job.org)
- **UptimeRobot** (can ping endpoints every 5 minutes)

Configure them to POST to:
```
https://yourdomain.com/api/posts/process-scheduled
```

### Option 3: Vercel Cron Jobs

If hosting on Vercel, create a `vercel.json` file:

```json
{
  "crons": [{
    "path": "/api/posts/process-scheduled",
    "schedule": "* * * * *"
  }]
}
```

### Option 4: Next.js Standalone Script

Create a standalone script that can be run by any task scheduler:

```javascript
// scripts/process-scheduled-posts.js
const axios = require('axios');

async function processScheduledPosts() {
  try {
    const response = await axios.post('http://localhost:3000/api/posts/process-scheduled');
    console.log(response.data.message);
  } catch (error) {
    console.error('Error processing scheduled posts:', error.message);
  }
}

processScheduledPosts();
```

Then run it with cron:
```cron
* * * * * cd /path/to/your/project && node scripts/process-scheduled-posts.js
```

## Security Considerations

### Production Setup

The `/api/posts/process-scheduled` endpoint is currently open to allow cron job access. For production, consider:

1. **Add API Key Authentication**:
   ```typescript
   // In app/api/posts/process-scheduled/route.ts
   const apiKey = request.headers.get('x-api-key');
   if (apiKey !== process.env.CRON_API_KEY) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
   }
   ```

2. **IP Whitelisting**: Configure your firewall to only allow requests from your cron service's IP

3. **Rate Limiting**: Implement rate limiting to prevent abuse

## How Scheduled Posts Work

1. **Creating a Scheduled Post**:
   - User sets a future date/time in the datetime picker
   - Clicks "Schedule Post"
   - Post saved with `status = 'scheduled'` and `scheduled_publish_at` timestamp

2. **Processing Scheduled Posts**:
   - Cron job calls `/api/posts/process-scheduled` every minute
   - API finds all posts where:
     - `status = 'scheduled'`
     - `scheduled_publish_at <= NOW()`
   - Updates matching posts:
     - `status` → `'published'`
     - `published_at` → `scheduled_publish_at`

3. **Viewing Scheduled Posts**:
   - "Scheduled" tab shows all scheduled posts
   - Purple badge indicates scheduled status
   - Date column shows scheduled publish time
   - Post count updates in real-time

## Permissions

- Scheduling posts requires the same `can_publish` permission as immediate publishing
- Users without `can_publish` can only submit for review (pending status)

## Revisions

Scheduled posts are included in the revision system. When a scheduled post is updated, a revision is created just like any other post.

## Custom Fields

Custom fields are preserved when posts are automatically published from scheduled status.

## Testing

To test scheduled publishing without waiting:

1. Schedule a post for 1-2 minutes in the future
2. Manually call the endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/posts/process-scheduled
   ```
3. Check that the post status changed to "published"

## Troubleshooting

**Posts not publishing automatically?**
- Verify your cron job is running correctly
- Check server logs for errors
- Ensure the application is running (for local development)
- Verify the system time is correct

**Scheduled time incorrect?**
- Check your server's timezone settings
- The datetime picker uses local time, but it's stored as UTC in the database
- Scheduled posts publish based on server time

## Future Enhancements

Potential improvements for scheduled publishing:
- [ ] Email notifications when posts are published
- [ ] Recurring post schedules
- [ ] Bulk scheduling
- [ ] Calendar view of scheduled posts
- [ ] Timezone selection per post

