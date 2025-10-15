# Session Management

Next CMS uses NextAuth.js for session management with configurable timeout settings.

## Session Timeout Configuration

### Admin Settings

Admins can configure session timeout in **Settings → General → Session Timeout**:

1. Navigate to Admin → Settings
2. Scroll to "Content Management" section
3. Enter a number and select the unit (minutes, hours, or days)
4. Click "Save Changes"
5. Run `node scripts/sync-session-timeout.js` to update the environment variable
6. **Restart the development server** for changes to take effect

**Note:** Session timeout changes require syncing the environment variable and restarting the server because NextAuth configuration is loaded at startup.

### Default Settings

- **Default Timeout**: 24 hours (stored as 1440 minutes)
- **Minimum**: 1 minute (can be any unit)
- **Maximum**: Unlimited (e.g., 30 days)
- **Recommended**: 8-24 hours for standard use

The UI automatically displays the timeout in the most appropriate unit:
- 1440 minutes → shown as "24 hours"
- 60 minutes → shown as "1 hour"
- 2880 minutes → shown as "2 days"

### Environment Variable

You can also set the session timeout via environment variable in your `.env` file:

```env
# Session timeout in SECONDS (not minutes)
SESSION_TIMEOUT=86400  # 24 hours = 86400 seconds
```

**Important:** The environment variable is in SECONDS, while the admin UI setting is in MINUTES.

### How It Works

1. **Login**: User logs in with email and password
2. **JWT Token**: NextAuth creates a JWT token with expiration
3. **Session Duration**: Token expires after configured timeout
4. **Auto Logout**: User is automatically logged out when token expires
5. **Session Refresh**: Each page load refreshes the session (resets the timer)

### Session Refresh Behavior

- Sessions are automatically refreshed on page navigation
- Idle users (no page interaction) will be logged out after timeout
- Active users stay logged in indefinitely as long as they use the system

### Production Deployment

For production environments:

1. **Vercel/Netlify**: Set `SESSION_TIMEOUT` environment variable in platform settings
2. **Docker**: Add to environment variables in docker-compose.yml
3. **Traditional Hosting**: Add to your `.env` file or server configuration

### Troubleshooting

**Problem**: Users getting logged out too frequently

**Solutions**:
1. Check the session timeout setting in Admin → Settings
2. Verify `SESSION_TIMEOUT` environment variable is set correctly
3. Remember: ENV variable is in seconds, UI setting is in minutes
4. Restart the server after changing the setting
5. Clear browser cookies and log in again

**Problem**: Setting doesn't seem to work

**Reasons**:
- Didn't run the sync script after changing the setting
- Server wasn't restarted after changing the setting
- Browser cached old session

**Fix**:
1. Save the setting in admin panel
2. Run the sync script: `node scripts/sync-session-timeout.js`
3. Restart the development server: `npm run dev`
4. For production: Restart the application
5. Clear browser cache and cookies
6. Log in again

### Unit Conversion

The admin UI allows you to enter timeouts in minutes, hours, or days. The system converts everything to minutes for storage, then to seconds for NextAuth:

**Minutes:**
- 15 minutes = 900 seconds
- 30 minutes = 1800 seconds

**Hours:**
- 1 hour = 60 minutes = 3600 seconds
- 8 hours = 480 minutes = 28800 seconds
- 24 hours = 1440 minutes = 86400 seconds

**Days:**
- 1 day = 1440 minutes = 86400 seconds
- 7 days = 10080 minutes = 604800 seconds
- 30 days = 43200 minutes = 2592000 seconds

### Security Considerations

**Shorter Timeouts (15-60 minutes)**:
- ✅ More secure (less time for session hijacking)
- ✅ Good for public/shared computers
- ❌ Users need to log in more frequently
- ❌ Can interrupt workflow

**Longer Timeouts (8-24 hours)**:
- ✅ Better user experience
- ✅ Less interruption for content creators
- ❌ Longer window for potential session theft
- ✅ Acceptable for private/secured environments

**Recommended Settings by Use Case**:
- **Public library computers**: 15-30 minutes
- **Office environments**: 4-8 hours
- **Personal devices**: 24 hours (1 day)
- **Trusted private networks**: 2-7 days

### Best Practices

1. **Balance Security and UX**: Choose a timeout that balances security needs with user convenience
2. **Communicate to Users**: Let users know the session duration
3. **Warning Before Logout**: Consider adding a warning modal before auto-logout (future enhancement)
4. **Remember Me**: Consider adding "Remember Me" option for extended sessions (future enhancement)
5. **Activity-Based Refresh**: Current implementation refreshes on activity (page loads)

### Future Enhancements

Potential improvements:
- [ ] Idle timeout vs absolute timeout options
- [ ] "Remember Me" checkbox on login
- [ ] Session expiration warning modal
- [ ] Activity tracking for more intelligent timeout
- [ ] Per-role session timeouts
- [ ] Session management dashboard (view active sessions)

