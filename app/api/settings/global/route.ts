import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import connectDB from '@/lib/mongodb';
import { GlobalSetting } from '@/lib/models';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function GET() {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = (session.user as any)?.isSuperAdmin || false;
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 });
    }

    // Fetch global settings
    const settings = await GlobalSetting.find().lean();

    const globalSettings = {
      hide_default_user: false,
    };

    settings.forEach((setting: any) => {
      switch (setting.key) {
        case 'auth_hide_default_user':
          globalSettings.hide_default_user = setting.value === true || setting.value === 'true' || setting.value === '1';
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
    await connectDB();
    
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

    // Save global setting (upsert)
    await GlobalSetting.findOneAndUpdate(
      { key: 'auth_hide_default_user' },
      { 
        value: body.hide_default_user,
        type: 'boolean',
        description: 'Hide default user from login screen'
      },
      { upsert: true, new: true }
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
