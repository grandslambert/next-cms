import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { SiteModels } from '@/lib/model-factory';
import { getCurrentSiteId } from '@/lib/api-helpers';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function GET(request: NextRequest) {
  try {
    const siteId = await getCurrentSiteId();
    const Setting = await SiteModels.Setting(siteId);
    
    const settingsRecords = await Setting.find().lean();

    // Convert to key-value object
    const settings: any = {};
    settingsRecords.forEach((record: any) => {
      settings[record.key] = record.value;
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const siteId = await getCurrentSiteId();
    const Setting = await SiteModels.Setting(siteId);
    
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }
    const body = await request.json();
    const { settings } = body;

    if (!settings) {
      return NextResponse.json({ error: 'Settings object is required' }, { status: 400 });
    }

    // Fetch current settings BEFORE updating (for activity log)
    const currentRecords = await Setting.find({}).lean(); // No site_id filter needed
    const beforeSettings: any = {};
    currentRecords.forEach((record: any) => {
      beforeSettings[record.key] = record.value;
    });

    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      let settingType = 'string';

      if (typeof value === 'object' && value !== null) {
        settingType = 'json';
      } else if (typeof value === 'boolean') {
        settingType = 'boolean';
      } else if (typeof value === 'number') {
        settingType = 'number';
      }

      // Upsert setting
      await Setting.findOneAndUpdate(
        { key }, // No site_id - we're in the site database
        { 
          value, 
          type: settingType,
          group: 'general', // Default group, can be customized per setting
          updated_at: new Date()
        },
        { upsert: true, new: true }
      );
    }

    // Log activity with before/after changes
    const userId = (session.user as any).id;
    const settingKeys = Object.keys(settings).join(', ');
    
    // Only include changed settings in before/after
    const changesBefore: any = {};
    const changesAfter: any = {};
    
    for (const key of Object.keys(settings)) {
      const beforeValue = beforeSettings[key] !== undefined ? beforeSettings[key] : null;
      const afterValue = settings[key];
      
      if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
        changesBefore[key] = beforeValue;
        changesAfter[key] = afterValue;
      }
    }
    
    await logActivity({
      userId,
      action: 'settings_updated',
      entityType: 'settings',
      entityId: null,
      entityName: 'System Settings',
      details: `Updated settings: ${settingKeys}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      changesBefore: Object.keys(changesBefore).length > 0 ? changesBefore : undefined,
      changesAfter: Object.keys(changesAfter).length > 0 ? changesAfter : undefined,
      siteId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
