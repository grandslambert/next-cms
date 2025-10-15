import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; revisionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const permissions = (session.user as any).permissions || {};

    // Check if post exists
    const [existingPost] = await db.query<RowDataPacket[]>(
      'SELECT * FROM posts WHERE id = ?',
      [params.id]
    );

    if (existingPost.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const post = existingPost[0];
    const isOwner = post.author_id === parseInt(userId);
    const canManageOthers = permissions.manage_others_posts === true;

    // Check if user can edit this post
    if (!isOwner && !canManageOthers) {
      return NextResponse.json({ error: 'You can only restore revisions of your own posts' }, { status: 403 });
    }

    // Get the revision
    const [revisionResult] = await db.query<RowDataPacket[]>(
      'SELECT * FROM post_revisions WHERE id = ? AND post_id = ?',
      [params.revisionId, params.id]
    );

    if (revisionResult.length === 0) {
      return NextResponse.json({ error: 'Revision not found' }, { status: 404 });
    }

    const revision = revisionResult[0];

    // Save current state as a revision before restoring
    const [settingsResult] = await db.query<RowDataPacket[]>(
      'SELECT setting_value FROM settings WHERE setting_key = ?',
      ['max_revisions']
    );
    const maxRevisions = settingsResult.length > 0 ? parseInt(settingsResult[0].setting_value) : 10;

    if (maxRevisions > 0) {
      // Get current custom fields for the revision
      const [currentMeta] = await db.query<RowDataPacket[]>(
        'SELECT meta_key, meta_value FROM post_meta WHERE post_id = ?',
        [params.id]
      );
      
      const customFieldsObj: Record<string, string> = {};
      currentMeta.forEach((meta: any) => {
        customFieldsObj[meta.meta_key] = meta.meta_value;
      });

      await db.query<ResultSetHeader>(
        'INSERT INTO post_revisions (post_id, title, content, excerpt, custom_fields, author_id) VALUES (?, ?, ?, ?, ?, ?)',
        [params.id, post.title, post.content, post.excerpt, JSON.stringify(customFieldsObj), userId]
      );
    }

    // Restore the revision
    await db.query<ResultSetHeader>(
      'UPDATE posts SET title = ?, content = ?, excerpt = ? WHERE id = ?',
      [revision.title, revision.content, revision.excerpt, params.id]
    );

    // Restore custom fields from revision
    if (revision.custom_fields) {
      // Delete existing custom fields
      await db.query<ResultSetHeader>(
        'DELETE FROM post_meta WHERE post_id = ?',
        [params.id]
      );

      // Parse and restore custom fields
      const customFields = typeof revision.custom_fields === 'string' 
        ? JSON.parse(revision.custom_fields) 
        : revision.custom_fields;

      if (customFields && Object.keys(customFields).length > 0) {
        const values = Object.entries(customFields).map(([key, value]) => [params.id, key, value]);
        await db.query<ResultSetHeader>(
          'INSERT INTO post_meta (post_id, meta_key, meta_value) VALUES ?',
          [values]
        );
      }
    }

    // Get updated post
    const [updatedPost] = await db.query<RowDataPacket[]>(
      'SELECT * FROM posts WHERE id = ?',
      [params.id]
    );

    return NextResponse.json({ post: updatedPost[0], message: 'Revision restored successfully' });
  } catch (error) {
    console.error('Error restoring revision:', error);
    return NextResponse.json({ error: 'Failed to restore revision' }, { status: 500 });
  }
}

