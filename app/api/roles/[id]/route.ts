import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [roles] = await db.query<RowDataPacket[]>(
      'SELECT id, name, display_name, description, permissions, is_system, created_at, updated_at FROM roles WHERE id = ?',
      [params.id]
    );

    if (roles.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const role = roles[0];
    role.permissions = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions;

    return NextResponse.json({ role });
  } catch (error) {
    console.error('Error fetching role:', error);
    return NextResponse.json({ error: 'Failed to fetch role' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if role is a system role
    const [existingRoles] = await db.query<RowDataPacket[]>(
      'SELECT is_system FROM roles WHERE id = ?',
      [params.id]
    );

    if (existingRoles.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, display_name, description, permissions } = body;

    // System roles can only have their permissions updated
    if (existingRoles[0].is_system) {
      if (!permissions) {
        return NextResponse.json({ error: 'Missing permissions' }, { status: 400 });
      }

      await db.query<ResultSetHeader>(
        'UPDATE roles SET permissions = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [JSON.stringify(permissions), params.id]
      );
    } else {
      if (!name || !display_name || !permissions) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      await db.query<ResultSetHeader>(
        'UPDATE roles SET name = ?, display_name = ?, description = ?, permissions = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, display_name, description || null, JSON.stringify(permissions), params.id]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if role is a system role
    const [roles] = await db.query<RowDataPacket[]>(
      'SELECT is_system FROM roles WHERE id = ?',
      [params.id]
    );

    if (roles.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    if (roles[0].is_system) {
      return NextResponse.json({ error: 'Cannot delete system role' }, { status: 403 });
    }

    // Check if any users have this role
    const [users] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM users WHERE role_id = ?',
      [params.id]
    );

    if (users[0].count > 0) {
      return NextResponse.json({ 
        error: `Cannot delete role: ${users[0].count} user(s) are assigned to this role` 
      }, { status: 400 });
    }

    await db.query<ResultSetHeader>(
      'DELETE FROM roles WHERE id = ?',
      [params.id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting role:', error);
    return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
  }
}

