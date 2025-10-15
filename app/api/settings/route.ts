import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT * FROM settings'
    );

    // Convert to key-value object
    const settings: any = {};
    rows.forEach((row: any) => {
      if (row.setting_type === 'json' && row.setting_value) {
        try {
          settings[row.setting_key] = JSON.parse(row.setting_value);
        } catch {
          settings[row.setting_key] = row.setting_value;
        }
      } else if (row.setting_type === 'boolean') {
        settings[row.setting_key] = row.setting_value === 'true' || row.setting_value === '1';
      } else if (row.setting_type === 'number') {
        settings[row.setting_key] = Number(row.setting_value);
      } else {
        settings[row.setting_key] = row.setting_value;
      }
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings) {
      return NextResponse.json({ error: 'Settings object is required' }, { status: 400 });
    }

    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      let settingType = 'string';
      let settingValue = value;

      if (typeof value === 'object') {
        settingType = 'json';
        settingValue = JSON.stringify(value);
      } else if (typeof value === 'boolean') {
        settingType = 'boolean';
        settingValue = value ? '1' : '0';
      } else if (typeof value === 'number') {
        settingType = 'number';
        settingValue = value.toString();
      }

      await db.query<ResultSetHeader>(
        `INSERT INTO settings (setting_key, setting_value, setting_type) 
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE setting_value = ?, setting_type = ?`,
        [key, settingValue, settingType, settingValue, settingType]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

