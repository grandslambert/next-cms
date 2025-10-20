import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import db, { getSiteTable } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

// Helper function to build folder tree
function buildFolderTree(folders: any[]): any[] {
  const folderMap = new Map();
  const roots: any[] = [];

  // First pass: create all folder objects
  folders.forEach(folder => {
    folderMap.set(folder.id, { ...folder, children: [] });
  });

  // Second pass: link children to parents
  folders.forEach(folder => {
    const folderObj = folderMap.get(folder.id);
    if (folder.parent_id === null) {
      roots.push(folderObj);
    } else {
      const parent = folderMap.get(folder.parent_id);
      if (parent) {
        parent.children.push(folderObj);
      }
    }
  });

  return roots;
}

// Helper function to flatten tree with indentation
function flattenTree(folders: any[], level: number = 0): any[] {
  const result: any[] = [];
  
  folders.forEach(folder => {
    result.push({
      id: folder.id,
      name: folder.name,
      parent_id: folder.parent_id,
      level: level,
      display_name: '—'.repeat(level) + (level > 0 ? ' ' : '') + folder.name
    });
    
    if (folder.children && folder.children.length > 0) {
      result.push(...flattenTree(folder.children, level + 1));
    }
  });
  
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = (session.user as any).permissions || {};
    const siteId = (session.user as any).currentSiteId || 1;
    const mediaFoldersTable = getSiteTable(siteId, 'media_folders');
    
    if (!permissions.manage_media) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get ALL folders for this site
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT id, name, parent_id FROM ${mediaFoldersTable} ORDER BY name ASC`
    );

    // Build tree structure
    const tree = buildFolderTree(rows);
    
    // Flatten with hierarchy
    const flatFolders = flattenTree(tree);

    return NextResponse.json({ folders: flatFolders });
  } catch (error) {
    console.error('Error fetching all folders:', error);
    return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 });
  }
}

