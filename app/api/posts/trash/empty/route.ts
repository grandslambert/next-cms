import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db, { getSiteTable } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const permissions = (session.user as any).permissions || {};
    const isSuperAdmin = (session.user as any)?.isSuperAdmin || false;
    const siteId = (session.user as any).currentSiteId || 1;
    
    // Get site-prefixed table names
    const postsTable = getSiteTable(siteId, 'posts');
    const postMetaTable = getSiteTable(siteId, 'post_meta');
    const postRevisionsTable = getSiteTable(siteId, 'post_revisions');
    const termRelationshipsTable = getSiteTable(siteId, 'term_relationships');

    const canDelete = isSuperAdmin || permissions.can_delete === true;
    const canDeleteOthers = isSuperAdmin || permissions.can_delete_others === true;

    if (!canDelete) {
      return NextResponse.json({ error: 'You do not have permission to empty trash' }, { status: 403 });
    }

    // First, get IDs of posts to be deleted (for cascading deletes)
    let selectQuery = `SELECT id FROM ${postsTable} WHERE status = ?`;
    let params: any[] = ['trash'];

    if (!canDeleteOthers) {
      selectQuery += ' AND author_id = ?';
      params.push(userId);
    }

    const [postsToDelete] = await db.query<RowDataPacket[]>(selectQuery, params);
    const postIds = postsToDelete.map(p => p.id);

    if (postIds.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No posts in trash',
        deleted_count: 0
      });
    }

    // Delete all related data for these posts
    const idPlaceholders = postIds.map(() => '?').join(',');
    await db.query<ResultSetHeader>(`DELETE FROM ${postMetaTable} WHERE post_id IN (${idPlaceholders})`, postIds);
    await db.query<ResultSetHeader>(`DELETE FROM ${postRevisionsTable} WHERE post_id IN (${idPlaceholders})`, postIds);
    await db.query<ResultSetHeader>(`DELETE FROM ${termRelationshipsTable} WHERE post_id IN (${idPlaceholders})`, postIds);

    // Now delete the posts themselves
    let query = `DELETE FROM ${postsTable} WHERE status = ?`;
    params = ['trash'];

    if (!canDeleteOthers) {
      query += ' AND author_id = ?';
      params.push(userId);
    }

    const [result] = await db.query<ResultSetHeader>(query, params);

    return NextResponse.json({ 
      success: true, 
      message: 'Trash emptied successfully',
      deleted_count: result.affectedRows
    });
  } catch (error) {
    console.error('Error emptying trash:', error);
    return NextResponse.json({ error: 'Failed to empty trash' }, { status: 500 });
  }
}

