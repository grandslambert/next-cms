import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = (session.user as any).permissions || {};
    
    // Only admins can view activity logs (or users with manage_users permission)
    if (!permissions.manage_users) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Number.parseInt(searchParams.get('page') || '1');
    const limit = Number.parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    const userId = searchParams.get('user_id');
    const action = searchParams.get('action');
    const entityType = searchParams.get('entity_type');
    const search = searchParams.get('search');

    let whereConditions = [];
    let params: any[] = [];

    if (userId) {
      whereConditions.push('al.user_id = ?');
      params.push(userId);
    }

    if (action) {
      whereConditions.push('al.action = ?');
      params.push(action);
    }

    if (entityType) {
      whereConditions.push('al.entity_type = ?');
      params.push(entityType);
    }

    if (search) {
      whereConditions.push('(al.entity_name LIKE ? OR al.details LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Get total count
    const [countResult] = await db.query<any[]>(
      `SELECT COUNT(*) as total FROM activity_log al ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get logs with user info
    const [logs] = await db.query<any[]>(
      `SELECT 
        al.*,
        u.username,
        u.first_name,
        u.last_name
       FROM activity_log al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}

