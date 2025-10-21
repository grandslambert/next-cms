import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { SiteModels } from '@/lib/model-factory';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function GET() {
  try {
    // Note: This endpoint is public (no auth check) because it's used on the login page
    // Only safe settings (hide_default_user, password requirements) are exposed
    
    const authSettings = {
      hide_default_user: false,
      password_min_length: 8,
      password_require_uppercase: true,
      password_require_lowercase: true,
      password_require_numbers: true,
      password_require_special: false,
    };

    // For now, just return defaults since we don't have a site context on login page
    // Settings will be properly fetched once user is logged in
    return NextResponse.json({ settings: authSettings });
  } catch (error) {
    console.error('Error fetching authentication settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch authentication settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = (session.user as any)?.isSuperAdmin || false;
    const userPermissions = (session.user as any).permissions || {};
    if (!isSuperAdmin && !userPermissions.manage_settings) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();

    // Validate
    if (body.password_min_length < 6 || body.password_min_length > 128) {
      return NextResponse.json(
        { error: 'Password minimum length must be between 6 and 128' },
        { status: 400 }
      );
    }

    const userId = (session.user as any).id;
    const siteIdStr = (session.user as any).currentSiteId;
    
    if (!siteIdStr) {
      return NextResponse.json({ error: 'No site context available' }, { status: 400 });
    }

    // Get Setting model for the current site
    const Setting = await SiteModels.Setting(siteIdStr);

    // Save password settings to MongoDB
    const passwordSettings = [
      { key: 'password_min_length', value: body.password_min_length, type: 'number' },
      { key: 'password_require_uppercase', value: body.password_require_uppercase, type: 'boolean' },
      { key: 'password_require_lowercase', value: body.password_require_lowercase, type: 'boolean' },
      { key: 'password_require_numbers', value: body.password_require_numbers, type: 'boolean' },
      { key: 'password_require_special', value: body.password_require_special, type: 'boolean' },
    ];

    for (const setting of passwordSettings) {
      await Setting.findOneAndUpdate(
        { key: setting.key }, // No site_id - we're already in the site database
        {
          value: setting.value,
          type: setting.type,
          group: 'authentication',
          updated_at: new Date()
        },
        { upsert: true, new: true }
      );
    }

    // Log activity
    await logActivity({
      userId,
      action: 'settings_updated',
      entityType: 'settings',
      entityName: 'Authentication Settings',
      details: 'Updated password requirements',
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId: siteIdStr,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving authentication settings:', error);
    return NextResponse.json(
      { error: 'Failed to save authentication settings' },
      { status: 500 }
    );
  }
}
