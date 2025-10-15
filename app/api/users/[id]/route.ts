import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT id, username, first_name, last_name, email, role, created_at, updated_at FROM users WHERE id = ?',
      [params.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: rows[0] });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const body = await request.json();
    const { username, first_name, last_name, email, password, role } = body;

    if (!username || !first_name || !email) {
      return NextResponse.json({ error: 'Username, first name, and email are required' }, { status: 400 });
    }

    // If password is provided, hash it; otherwise keep existing
    if (password && password.trim()) {
      const hashedPassword = bcrypt.hashSync(password, 10);
      await db.query<ResultSetHeader>(
        'UPDATE users SET username = ?, first_name = ?, last_name = ?, email = ?, password = ?, role = ? WHERE id = ?',
        [username, first_name, last_name || '', email, hashedPassword, role || 'author', params.id]
      );
    } else {
      await db.query<ResultSetHeader>(
        'UPDATE users SET username = ?, first_name = ?, last_name = ?, email = ?, role = ? WHERE id = ?',
        [username, first_name, last_name || '', email, role || 'author', params.id]
      );
    }

    const [updatedUser] = await db.query<RowDataPacket[]>(
      'SELECT id, username, first_name, last_name, email, role, created_at, updated_at FROM users WHERE id = ?',
      [params.id]
    );

    return NextResponse.json({ user: updatedUser[0] });
  } catch (error: any) {
    console.error('Error updating user:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'A user with this username or email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    // Prevent deleting yourself
    if ((session.user as any).id === parseInt(params.id)) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    await db.query<ResultSetHeader>('DELETE FROM users WHERE id = ?', [params.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}

