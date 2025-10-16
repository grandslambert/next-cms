import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      'SELECT * FROM menus WHERE id = ?',
      [params.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    return NextResponse.json({ menu: rows[0] });
  } catch (error) {
    console.error('Error fetching menu:', error);
    return NextResponse.json({ error: 'Failed to fetch menu' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get current menu BEFORE updating
    const [beforeUpdate] = await db.query<RowDataPacket[]>(
      'SELECT * FROM menus WHERE id = ?',
      [params.id]
    );

    if (beforeUpdate.length === 0) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    const currentMenu = beforeUpdate[0];

    await db.query<ResultSetHeader>(
      'UPDATE menus SET name = ?, location = ?, description = ? WHERE id = ?',
      [name, location, description || '', params.id]
    );

    const [updated] = await db.query<RowDataPacket[]>(
      'SELECT * FROM menus WHERE id = ?',
      [params.id]
    );

    // Log activity
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'menu_updated' as any,
      entityType: 'menu' as any,
      entityId: Number.parseInt(params.id),
      entityName: name,
      details: `Updated menu: ${name}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      changesBefore: {
        name: currentMenu.name,
        location: currentMenu.location,
        description: currentMenu.description,
      },
      changesAfter: {
        name: updated[0].name,
        location: updated[0].location,
        description: updated[0].description,
      },
    });

    return NextResponse.json({ menu: updated[0] });
  } catch (error: any) {
    console.error('Error updating menu:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'A menu with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update menu' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = (session.user as any).permissions || {};
    if (!permissions.manage_menus) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get menu details for logging
    const [menuRows] = await db.query<RowDataPacket[]>(
      'SELECT * FROM menus WHERE id = ?',
      [params.id]
    );

    if (menuRows.length === 0) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    const menu = menuRows[0];

    // Log activity before deleting
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'menu_deleted' as any,
      entityType: 'menu' as any,
      entityId: Number.parseInt(params.id),
      entityName: menu.name,
      details: `Deleted menu: ${menu.name} (${menu.location})`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    // Delete menu (CASCADE will delete menu items)
    await db.query<ResultSetHeader>('DELETE FROM menus WHERE id = ?', [params.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting menu:', error);
    return NextResponse.json({ error: 'Failed to delete menu' }, { status: 500 });
  }
}

