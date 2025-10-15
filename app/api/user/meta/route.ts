import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const searchParams = request.nextUrl.searchParams;
    const metaKey = searchParams.get('key');

    let query = 'SELECT * FROM user_meta WHERE user_id = ?';
    const params: any[] = [userId];

    if (metaKey) {
      query += ' AND meta_key = ?';
      params.push(metaKey);
    }

    const [meta] = await db.query<RowDataPacket[]>(query, params);

    // If requesting a specific key, return just that value
    if (metaKey && meta.length > 0) {
      return NextResponse.json({ meta_key: meta[0].meta_key, meta_value: meta[0].meta_value });
    }

    return NextResponse.json({ meta });
  } catch (error) {
    console.error('Error fetching user meta:', error);
    return NextResponse.json({ error: 'Failed to fetch user meta' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { meta_key, meta_value } = body;

    if (!meta_key) {
      return NextResponse.json({ error: 'meta_key is required' }, { status: 400 });
    }

    // Check if meta already exists
    const [existing] = await db.query<RowDataPacket[]>(
      'SELECT id FROM user_meta WHERE user_id = ? AND meta_key = ?',
      [userId, meta_key]
    );

    if (existing.length > 0) {
      // Update existing
      await db.query<ResultSetHeader>(
        'UPDATE user_meta SET meta_value = ? WHERE user_id = ? AND meta_key = ?',
        [meta_value, userId, meta_key]
      );
    } else {
      // Insert new
      await db.query<ResultSetHeader>(
        'INSERT INTO user_meta (user_id, meta_key, meta_value) VALUES (?, ?, ?)',
        [userId, meta_key, meta_value]
      );
    }

    return NextResponse.json({ success: true, meta_key, meta_value });
  } catch (error) {
    console.error('Error updating user meta:', error);
    return NextResponse.json({ error: 'Failed to update user meta' }, { status: 500 });
  }
}

