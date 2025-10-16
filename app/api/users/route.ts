import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT u.id, u.username, u.first_name, u.last_name, u.email, u.role_id, 
              r.name as role_name, r.display_name as role_display_name, 
              u.created_at, u.updated_at 
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       ORDER BY u.created_at DESC`
    );

    return NextResponse.json({ users: rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).permissions?.manage_users) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const body = await request.json();
    const { username, first_name, last_name, email, password, role_id } = body;

    if (!username || !first_name || !email || !password || !role_id) {
      return NextResponse.json({ error: 'Username, first name, email, password, and role are required' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    const [result] = await db.query<ResultSetHeader>(
      'INSERT INTO users (username, first_name, last_name, email, password, role_id) VALUES (?, ?, ?, ?, ?, ?)',
      [username, first_name, last_name || '', email, hashedPassword, role_id]
    );

    const [newUser] = await db.query<RowDataPacket[]>(
      `SELECT u.id, u.username, u.first_name, u.last_name, u.email, u.role_id,
              r.name as role_name, r.display_name as role_display_name, u.created_at 
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [result.insertId]
    );

    // Log activity
    const currentUserId = (session.user as any).id;
    await logActivity({
      userId: currentUserId,
      action: 'user_created',
      entityType: 'user',
      entityId: result.insertId,
      entityName: username,
      details: `Created user: ${username} (${first_name} ${last_name})`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ user: newUser[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'A user with this username or email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

