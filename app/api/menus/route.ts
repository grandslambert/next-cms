import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db, { getSiteTable } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = (session.user as any).permissions || {};
    const siteId = (session.user as any).currentSiteId || 1;
    const menusTable = getSiteTable(siteId, 'menus');
    
    if (!permissions.manage_menus) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT * FROM ${menusTable} ORDER BY name ASC`
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
    const userId = (session.user as any).id;
    const siteId = (session.user as any).currentSiteId || 1;
    const menusTable = getSiteTable(siteId, 'menus');
    
    if (!permissions.manage_menus) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, location, description } = body;

    if (!name || !location) {
      return NextResponse.json({ error: 'Name and location are required' }, { status: 400 });
    }

    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO ${menusTable} (name, location, description) VALUES (?, ?, ?)`,
      [name, location, description || '']
    );

    const [newMenu] = await db.query<RowDataPacket[]>(
      `SELECT * FROM ${menusTable} WHERE id = ?`,
      [result.insertId]
    );

    // Log activity
    await logActivity({
      userId,
      action: 'menu_created' as any,
      entityType: 'menu' as any,
      entityId: result.insertId,
      entityName: name,
      details: `Created menu: ${name} (${location})`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
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


