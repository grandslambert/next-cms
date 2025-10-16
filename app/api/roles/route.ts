import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [roles] = await db.query<RowDataPacket[]>(
      'SELECT id, name, display_name, description, permissions, is_system, created_at, updated_at FROM roles ORDER BY id ASC'
    );

    // Parse JSON permissions
    const rolesWithParsedPermissions = roles.map(role => ({
      ...role,
      permissions: typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions
    }));

    return NextResponse.json({ roles: rolesWithParsedPermissions });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, display_name, description, permissions } = body;

    if (!name || !display_name || !permissions) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const [result] = await db.query<ResultSetHeader>(
      'INSERT INTO roles (name, display_name, description, permissions, is_system) VALUES (?, ?, ?, ?, false)',
      [name, display_name, description || null, JSON.stringify(permissions)]
    );

    // Log activity
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'role_created',
      entityType: 'role',
      entityId: result.insertId,
      entityName: display_name,
      details: `Created role: ${display_name} (${name})`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ 
      id: result.insertId,
      name,
      display_name,
      description,
      permissions,
      is_system: false
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating role:', error);
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
  }
}


