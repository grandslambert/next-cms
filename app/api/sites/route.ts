import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = (session.user as any)?.isSuperAdmin;
    const userId = (session.user as any)?.id;

    let query: string;
    let params: any[];

    // Super admins see all sites, others only see sites they're assigned to
    if (isSuperAdmin) {
      query = `
        SELECT s.*, 
          (SELECT COUNT(*) FROM site_users su WHERE su.site_id = s.id) as user_count
        FROM sites s
        ORDER BY s.created_at DESC
      `;
      params = [];
    } else {
      query = `
        SELECT s.*,
          su.role_id as user_role_id,
          r.name as user_role_name
        FROM sites s
        INNER JOIN site_users su ON s.id = su.site_id
        LEFT JOIN roles r ON su.role_id = r.id
        WHERE su.user_id = ? AND s.is_active = TRUE
        ORDER BY s.created_at DESC
      `;
      params = [userId];
    }

    const [rows] = await db.query<RowDataPacket[]>(query, params);

    return NextResponse.json({ sites: rows });
  } catch (error) {
    console.error('Error fetching sites:', error);
    return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const isSuperAdmin = (session?.user as any)?.isSuperAdmin;

    // Only super admins can create sites
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 });
    }

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

    // Check if name already exists
    const [existing] = await db.query<RowDataPacket[]>(
      'SELECT id FROM sites WHERE name = ?',
      [name]
    );

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Site name already exists' }, { status: 400 });
    }

    // Create site
    const [result] = await db.query<ResultSetHeader>(
      'INSERT INTO sites (name, display_name, domain, description, is_active) VALUES (?, ?, ?, ?, ?)',
      [name, display_name, domain || null, description || null, is_active !== false]
    );

    const siteId = result.insertId;

    // Create site tables using the template
    try {
      const templatePath = path.join(process.cwd(), 'database', 'site-tables-template.sql');
      const template = await fs.readFile(templatePath, 'utf-8');
      
      // Replace {PREFIX} with site_<id>_
      const prefix = `site_${siteId}_`;
      const sql = template.replace(/\{PREFIX\}/g, prefix);
      
      // Split by semicolons and execute each statement
      // Filter out comments and empty statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => {
          // Remove empty lines and comment-only lines
          if (s.length === 0) return false;
          const lines = s.split('\n').filter(line => {
            const trimmed = line.trim();
            return trimmed.length > 0 && !trimmed.startsWith('--');
          });
          return lines.length > 0;
        });
      
      console.log(`Creating ${statements.length} statements for site ${siteId}...`);
      
      let createdCount = 0;
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        try {
          // Remove comment lines from the statement
          const cleanStatement = statement
            .split('\n')
            .filter(line => !line.trim().startsWith('--'))
            .join('\n')
            .trim();
          
          if (cleanStatement.length > 0) {
            await db.query(cleanStatement);
            createdCount++;
          }
        } catch (stmtError: any) {
          console.error(`Error executing statement ${i + 1}:`, stmtError.message);
          console.error('Statement:', statement.substring(0, 200));
          throw stmtError;
        }
      }
      
      console.log(`✓ Created ${createdCount} tables/inserts for site ${siteId} (${prefix}*)`);
    } catch (execError) {
      console.error('Error creating site tables:', execError);
      // Rollback site creation if table creation fails
      await db.query('DELETE FROM sites WHERE id = ?', [siteId]);
      return NextResponse.json({ 
        error: 'Failed to create site tables. Site creation rolled back.',
        details: execError instanceof Error ? execError.message : String(execError)
      }, { status: 500 });
    }

    // Log activity
    const userId = (session?.user as any)?.id;
    await logActivity({
      userId,
      action: 'site_created',
      entityType: 'site',
      entityId: siteId,
      entityName: display_name,
      details: `Created site: ${display_name} (${name})`,
      changesAfter: { name, display_name, domain, description, is_active },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ 
      success: true, 
      site: { id: siteId, name, display_name, domain, description, is_active }
    });
  } catch (error) {
    console.error('Error creating site:', error);
    return NextResponse.json({ error: 'Failed to create site' }, { status: 500 });
  }
}

