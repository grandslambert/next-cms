import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import db, { getSiteTable } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const siteId = (session?.user as any)?.currentSiteId || 1;
    const mediaTable = getSiteTable(siteId, 'media');
    
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT * FROM ${mediaTable} WHERE id = ?`,
      [params.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    return NextResponse.json({ media: rows[0] });
  } catch (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
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
    const siteId = (session.user as any).currentSiteId || 1;
    const mediaTable = getSiteTable(siteId, 'media');

    const body = await request.json();
    const { title, alt_text } = body;

    // Get current values before update
    const [current] = await db.query<RowDataPacket[]>(
      `SELECT * FROM ${mediaTable} WHERE id = ?`,
      [params.id]
    );

    if (current.length === 0) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    const before = {
      title: current[0].title || null,
      alt_text: current[0].alt_text || null,
    };

    const after = {
      title: title || null,
      alt_text: alt_text || null,
    };

    await db.query<ResultSetHeader>(
      `UPDATE ${mediaTable} SET title = ?, alt_text = ? WHERE id = ?`,
      [title || null, alt_text || null, params.id]
    );

    const [updated] = await db.query<RowDataPacket[]>(
      `SELECT * FROM ${mediaTable} WHERE id = ?`,
      [params.id]
    );

    // Log activity with before/after values
    await logActivity({
      userId,
      action: 'media_updated',
      entityType: 'media',
      entityId: Number.parseInt(params.id),
      entityName: updated[0].original_name || updated[0].filename,
      details: `Updated media: ${updated[0].original_name || updated[0].filename}`,
      changesBefore: before,
      changesAfter: after,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    return NextResponse.json({ media: updated[0] });
  } catch (error) {
    console.error('Error updating media:', error);
    return NextResponse.json({ error: 'Failed to update media' }, { status: 500 });
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
    const userId = (session.user as any).id;
    const siteId = (session.user as any).currentSiteId || 1;
    const mediaTable = getSiteTable(siteId, 'media');
    
    if (!permissions.manage_media) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get media info before deleting
    const [media] = await db.query<RowDataPacket[]>(
      `SELECT * FROM ${mediaTable} WHERE id = ?`,
      [params.id]
    );

    if (media.length === 0) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    // Soft delete - move to trash
    await db.execute<ResultSetHeader>(
      `UPDATE ${mediaTable} SET deleted_at = NOW() WHERE id = ?`,
      [params.id]
    );

    // Log activity
    await logActivity({
      userId,
      action: 'media_trashed',
      entityType: 'media',
      entityId: Number.parseInt(params.id),
      entityName: media[0].original_name || media[0].filename,
      details: `Moved media to trash: ${media[0].original_name || media[0].filename}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    return NextResponse.json({ message: 'Media moved to trash successfully' });
  } catch (error) {
    console.error('Error deleting media:', error);
    return NextResponse.json({ error: 'Failed to delete media' }, { status: 500 });
  }
}

