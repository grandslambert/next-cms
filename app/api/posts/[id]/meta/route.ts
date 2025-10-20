import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import db, { getSiteTable } from '@/lib/db';
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

    const siteId = (session.user as any).currentSiteId || 1;
    const postMetaTable = getSiteTable(siteId, 'post_meta');

    // Fetch custom fields for this post
    const [meta] = await db.query<RowDataPacket[]>(
      `SELECT * FROM ${postMetaTable} WHERE post_id = ? ORDER BY meta_key`,
      [params.id]
    );

    return NextResponse.json({ meta });
  } catch (error) {
    console.error('Error fetching post meta:', error);
    return NextResponse.json({ error: 'Failed to fetch post meta' }, { status: 500 });
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

    const userId = (session.user as any).id;
    const isSuperAdmin = (session.user as any)?.isSuperAdmin || false;
    const permissions = (session.user as any).permissions || {};
    const siteId = (session.user as any).currentSiteId || 1;
    const postsTable = getSiteTable(siteId, 'posts');
    const postMetaTable = getSiteTable(siteId, 'post_meta');

    // Check if post exists and user has permission to edit
    const [existingPost] = await db.query<RowDataPacket[]>(
      `SELECT author_id, post_type FROM ${postsTable} WHERE id = ?`,
      [params.id]
    );

    if (existingPost.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const post = existingPost[0];
    const isOwner = post.author_id === Number.parseInt(userId);
    const canManageOthers = isSuperAdmin || permissions.manage_others_posts === true;

    if (!isOwner && !canManageOthers) {
      return NextResponse.json({ error: 'You can only edit your own posts' }, { status: 403 });
    }

    const body = await request.json();
    const { meta } = body; // Array of { meta_key, meta_value }

    if (!Array.isArray(meta)) {
      return NextResponse.json({ error: 'Meta must be an array' }, { status: 400 });
    }

    // Delete all existing meta for this post
    await db.query<ResultSetHeader>(
      `DELETE FROM ${postMetaTable} WHERE post_id = ?`,
      [params.id]
    );

    // Insert new meta values (only if there are any)
    if (meta.length > 0) {
      const validMeta = meta.filter(m => m.meta_key && m.meta_key.trim() !== '');
      
      if (validMeta.length > 0) {
        const values = validMeta.map(m => [params.id, m.meta_key.trim(), m.meta_value || '']);
        await db.query<ResultSetHeader>(
          `INSERT INTO ${postMetaTable} (post_id, meta_key, meta_value) VALUES ?`,
          [values]
        );
      }
    }

    // Fetch updated meta
    const [updatedMeta] = await db.query<RowDataPacket[]>(
      `SELECT * FROM ${postMetaTable} WHERE post_id = ? ORDER BY meta_key`,
      [params.id]
    );

    return NextResponse.json({ meta: updatedMeta });
  } catch (error) {
    console.error('Error updating post meta:', error);
    return NextResponse.json({ error: 'Failed to update post meta' }, { status: 500 });
  }
}

