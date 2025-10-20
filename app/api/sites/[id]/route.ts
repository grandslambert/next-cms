import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

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
      'SELECT * FROM sites WHERE id = ?',
      [params.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    return NextResponse.json({ site: rows[0] });
  } catch (error) {
    console.error('Error fetching site:', error);
    return NextResponse.json({ error: 'Failed to fetch site' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const isSuperAdmin = (session?.user as any)?.isSuperAdmin;

    // Only super admins can update sites
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 });
    }

    // Get site data before update
    const [beforeRows] = await db.query<RowDataPacket[]>(
      'SELECT * FROM sites WHERE id = ?',
      [params.id]
    );

    if (beforeRows.length === 0) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const beforeData = beforeRows[0];

    const body = await request.json();
    const { name, display_name, domain, description, is_active } = body;

    if (!name || !display_name) {
      return NextResponse.json({ error: 'Name and display name are required' }, { status: 400 });
    }

    // Validate name (alphanumeric and underscores only)
    if (!/^[a-z0-9_]+$/.test(name)) {
      return NextResponse.json({ 
        error: 'Name must contain only lowercase letters, numbers, and underscores' 
      }, { status: 400 });
    }

    // Check if name already exists (excluding current site)
    const [existing] = await db.query<RowDataPacket[]>(
      'SELECT id FROM sites WHERE name = ? AND id != ?',
      [name, params.id]
    );

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Site name already exists' }, { status: 400 });
    }

    // Update site
    await db.query<ResultSetHeader>(
      'UPDATE sites SET name = ?, display_name = ?, domain = ?, description = ?, is_active = ? WHERE id = ?',
      [name, display_name, domain || null, description || null, is_active !== false, params.id]
    );

    // Log activity
    const userId = (session?.user as any)?.id;
    await logActivity({
      userId,
      action: 'site_updated',
      entityType: 'site',
      entityId: Number.parseInt(params.id),
      entityName: display_name,
      details: `Updated site: ${display_name} (${name})`,
      changesBefore: { 
        name: beforeData.name, 
        display_name: beforeData.display_name,
        domain: beforeData.domain,
        description: beforeData.description,
        is_active: beforeData.is_active
      },
      changesAfter: { name, display_name, domain, description, is_active },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating site:', error);
    return NextResponse.json({ error: 'Failed to update site' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const isSuperAdmin = (session?.user as any)?.isSuperAdmin;

    // Only super admins can delete sites
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 });
    }

    // Get site data before deletion
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT * FROM sites WHERE id = ?',
      [params.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const site = rows[0];

    // Prevent deletion of site ID 1 (default site)
    if (Number.parseInt(params.id) === 1) {
      return NextResponse.json({ 
        error: 'Cannot delete the default site' 
      }, { status: 400 });
    }

    // Note: Site tables are NOT automatically deleted for safety
    // Super admin should manually drop site_<id>_* tables if needed

    // Delete site (this will cascade delete site_users entries)
    await db.query<ResultSetHeader>(
      'DELETE FROM sites WHERE id = ?',
      [params.id]
    );

    // Log activity
    const userId = (session?.user as any)?.id;
    await logActivity({
      userId,
      action: 'site_deleted',
      entityType: 'site',
      entityId: Number.parseInt(params.id),
      entityName: site.display_name,
      details: `Deleted site: ${site.display_name} (${site.name}). Note: Site tables (site_${site.id}_*) were not automatically deleted for safety.`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ 
      success: true,
      warning: `Site deleted. Tables (site_${site.id}_*) were not automatically deleted for safety. Drop them manually if needed.`
    });
  } catch (error) {
    console.error('Error deleting site:', error);
    return NextResponse.json({ error: 'Failed to delete site' }, { status: 500 });
  }
}

