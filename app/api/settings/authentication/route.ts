import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db, { getSiteTable } from '@/lib/db';
import { RowDataPacket } from 'mysql2';
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

    // Fetch global settings (hide_default_user is system-wide)
    const [globalSettings] = await db.query<RowDataPacket[]>(
      `SELECT setting_key, setting_value FROM global_settings 
       WHERE setting_key = 'auth_hide_default_user'`
    );

    globalSettings.forEach((setting: any) => {
      if (setting.setting_key === 'auth_hide_default_user') {
        authSettings.hide_default_user = setting.setting_value === 'true' || setting.setting_value === '1';
      }
    });

    // Fetch site-specific settings (password requirements from site 1 for login page)
    const settingsTable = getSiteTable(1, 'settings');
    const [siteSettings] = await db.query<RowDataPacket[]>(
      `SELECT setting_key, setting_value FROM ${settingsTable} 
       WHERE setting_key IN (
         'password_min_length',
         'password_require_uppercase',
         'password_require_lowercase',
         'password_require_numbers',
         'password_require_special'
       )`
    );

    siteSettings.forEach((setting: any) => {
      const value = setting.setting_value;
      switch (setting.setting_key) {
        case 'password_min_length':
          authSettings.password_min_length = parseInt(value) || 8;
          break;
        case 'password_require_uppercase':
          authSettings.password_require_uppercase = value === 'true' || value === '1';
          break;
        case 'password_require_lowercase':
          authSettings.password_require_lowercase = value === 'true' || value === '1';
          break;
        case 'password_require_numbers':
          authSettings.password_require_numbers = value === 'true' || value === '1';
          break;
        case 'password_require_special':
          authSettings.password_require_special = value === 'true' || value === '1';
          break;
      }
    });

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
    const siteId = (session.user as any).currentSiteId || 1;

    // Save site-specific password settings
    const settingsTable = getSiteTable(siteId, 'settings');
    const passwordSettings = [
      { key: 'password_min_length', value: body.password_min_length.toString() },
      { key: 'password_require_uppercase', value: body.password_require_uppercase ? '1' : '0' },
      { key: 'password_require_lowercase', value: body.password_require_lowercase ? '1' : '0' },
      { key: 'password_require_numbers', value: body.password_require_numbers ? '1' : '0' },
      { key: 'password_require_special', value: body.password_require_special ? '1' : '0' },
    ];

    for (const setting of passwordSettings) {
      await db.query(
        `INSERT INTO ${settingsTable} (setting_key, setting_value, setting_type) 
         VALUES (?, ?, 'string') 
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [setting.key, setting.value]
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
      siteId,
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

