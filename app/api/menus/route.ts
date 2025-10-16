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

    const permissions = (session.user as any).permissions || {};
    if (!permissions.manage_menus) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT * FROM menus ORDER BY name ASC'
    );

    return NextResponse.json({ menus: rows });
  } catch (error) {
    console.error('Error fetching menus:', error);
    return NextResponse.json({ error: 'Failed to fetch menus' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = (session.user as any).permissions || {};
    if (!permissions.manage_menus) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, location, description } = body;

    if (!name || !location) {
      return NextResponse.json({ error: 'Name and location are required' }, { status: 400 });
    }

    const [result] = await db.query<ResultSetHeader>(
      'INSERT INTO menus (name, location, description) VALUES (?, ?, ?)',
      [name, location, description || '']
    );

    const [newMenu] = await db.query<RowDataPacket[]>(
      'SELECT * FROM menus WHERE id = ?',
      [result.insertId]
    );

    // Log activity
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'menu_created' as any,
      entityType: 'menu' as any,
      entityId: result.insertId,
      entityName: name,
      details: `Created menu: ${name} (${location})`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ menu: newMenu[0] });
  } catch (error: any) {
    console.error('Error creating menu:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'A menu with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create menu' }, { status: 500 });
  }
}

