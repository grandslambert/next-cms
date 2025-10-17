import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = (session.user as any)?.isSuperAdmin || false;
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 });
    }

    // Fetch global settings
    const [settings] = await db.query<RowDataPacket[]>(
      `SELECT setting_key, setting_value FROM global_settings`
    );

    const globalSettings = {
      hide_default_user: false,
    };

    settings.forEach((setting: any) => {
      const value = setting.setting_value;
      switch (setting.setting_key) {
        case 'auth_hide_default_user':
          globalSettings.hide_default_user = value === 'true' || value === '1';
          break;
      }
    });

    return NextResponse.json({ settings: globalSettings });
  } catch (error) {
    console.error('Error fetching global settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch global settings' },
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
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const userId = (session.user as any).id;

    // Save global settings
    await db.query(
      `INSERT INTO global_settings (setting_key, setting_value, setting_type) 
       VALUES ('auth_hide_default_user', ?, 'boolean') 
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [body.hide_default_user ? '1' : '0']
    );

    // Log activity
    await logActivity({
      userId,
      action: 'settings_updated',
      entityType: 'settings',
      entityName: 'Global Settings',
      details: 'Updated global settings',
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving global settings:', error);
    return NextResponse.json(
      { error: 'Failed to save global settings' },
      { status: 500 }
    );
  }
}

