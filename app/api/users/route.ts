import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT id, username, first_name, last_name, email, role, created_at, updated_at FROM users ORDER BY created_at DESC'
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
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const body = await request.json();
    const { username, first_name, last_name, email, password, role } = body;

    if (!username || !first_name || !email || !password) {
      return NextResponse.json({ error: 'Username, first name, email, and password are required' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    const [result] = await db.query<ResultSetHeader>(
      'INSERT INTO users (username, first_name, last_name, email, password, role) VALUES (?, ?, ?, ?, ?, ?)',
      [username, first_name, last_name || '', email, hashedPassword, role || 'author']
    );

    const [newUser] = await db.query<RowDataPacket[]>(
      'SELECT id, username, first_name, last_name, email, role, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    return NextResponse.json({ user: newUser[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'A user with this username or email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

