import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT * FROM menu_locations ORDER BY name ASC'
    );

    return NextResponse.json({ locations: rows });
  } catch (error) {
    console.error('Error fetching menu locations:', error);
    return NextResponse.json({ error: 'Failed to fetch menu locations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = (session.user as any).permissions || {};
    if (!permissions.manage_settings) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const [result] = await db.query<ResultSetHeader>(
      'INSERT INTO menu_locations (name, description) VALUES (?, ?)',
      [name.toLowerCase().replaceAll(/[^a-z0-9_]/g, '_'), description || null]
    );

    const [newLocation] = await db.query<RowDataPacket[]>(
      'SELECT * FROM menu_locations WHERE id = ?',
      [result.insertId]
    );

    // Log activity
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'created' as any,
      entityType: 'menu_location' as any,
      entityId: result.insertId,
      entityName: name,
      details: `Created menu location: ${name}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ location: newLocation[0] });
  } catch (error) {
    console.error('Error creating menu location:', error);
    return NextResponse.json({ error: 'Failed to create menu location' }, { status: 500 });
  }
}


