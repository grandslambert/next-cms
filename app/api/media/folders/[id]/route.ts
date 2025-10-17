import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db, { getSiteTable } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { unlink } from 'node:fs/promises';
import path from 'node:path';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT * FROM ${mediaFoldersTable} WHERE id = ?`,
      [params.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json({ folder: rows[0] });
  } catch (error) {
    console.error('Error fetching folder:', error);
    return NextResponse.json({ error: 'Failed to fetch folder' }, { status: 500 });
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

    const permissions = (session.user as any).permissions || {};
    const siteId = (session.user as any).currentSiteId || 1;
    const mediaFoldersTable = getSiteTable(siteId, 'media_folders');
    
    if (!permissions.manage_media) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, parent_id } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
    }

    // Check if folder exists
    const [existing] = await db.query<RowDataPacket[]>(
      `SELECT * FROM ${mediaFoldersTable} WHERE id = ?`,
      [params.id]
    );

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Prevent circular references
    if (parent_id && parent_id === Number.parseInt(params.id)) {
      return NextResponse.json({ error: 'A folder cannot be its own parent' }, { status: 400 });
    }

    await db.execute<ResultSetHeader>(
      `UPDATE ${mediaFoldersTable} SET name = ?, parent_id = ? WHERE id = ?`,
      [name.trim(), parent_id || null, params.id]
    );

    const [updated] = await db.query<RowDataPacket[]>(
      `SELECT * FROM ${mediaFoldersTable} WHERE id = ?`,
      [params.id]
    );

    return NextResponse.json({ folder: updated[0] });
  } catch (error) {
    console.error('Error updating folder:', error);
    return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 });
  }
}

// Helper function to recursively get all folder IDs in a tree
async function getAllFolderIds(folderId: number, siteId: number): Promise<number[]> {
  const mediaFoldersTable = getSiteTable(siteId, 'media_folders');
  const folderIds = [folderId];
  
  const [subfolders] = await db.query<RowDataPacket[]>(
    `SELECT id FROM ${mediaFoldersTable} WHERE parent_id = ?`,
    [folderId]
  );
  
  for (const subfolder of subfolders) {
    const childIds = await getAllFolderIds(subfolder.id, siteId);
    folderIds.push(...childIds);
  }
  
  return folderIds;
}

// Helper function to delete media files from filesystem
async function deleteMediaFiles(media: any) {
  if (media.sizes) {
    try {
      const sizes = JSON.parse(media.sizes);
      for (const [, sizeData] of Object.entries(sizes)) {
        const sizeUrl = (sizeData as any).url;
        const filepath = path.join(process.cwd(), 'public', sizeUrl);
        try {
          await unlink(filepath);
        } catch (error) {
          // File might not exist, continue
        }
      }
    } catch (error) {
      console.error('Error deleting sized files:', error);
    }
  } else {
    // Old format - just delete main file
    const filepath = path.join(process.cwd(), 'public', media.url);
    try {
      await unlink(filepath);
    } catch (error) {
      console.error('Error deleting file:', error);
    }
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
    const siteId = (session.user as any).currentSiteId || 1;
    const mediaFoldersTable = getSiteTable(siteId, 'media_folders');
    const mediaTable = getSiteTable(siteId, 'media');
    
    if (!permissions.manage_media) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get action from query params
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action'); // 'move' or 'delete'
    const targetFolderId = searchParams.get('target_folder_id'); // null or folder ID for move action

    // Get all folder IDs in the tree (including this folder and all subfolders)
    const allFolderIds = await getAllFolderIds(Number.parseInt(params.id), siteId);

    // Check if any folders in the tree have media files
    const placeholders = allFolderIds.map(() => '?').join(',');
    const [mediaFiles] = await db.query<RowDataPacket[]>(
      `SELECT id, url, sizes, folder_id FROM ${mediaTable} WHERE folder_id IN (${placeholders})`,
      allFolderIds
    );

    // Count subfolders
    const subfolderCount = allFolderIds.length - 1; // Exclude the main folder

    // If folder tree has media files and no action specified, return counts for confirmation
    if (mediaFiles.length > 0 && !action) {
      return NextResponse.json(
        { 
          error: 'Folder contains media files',
          requires_action: true,
          media_count: mediaFiles.length,
          subfolder_count: subfolderCount
        },
        { status: 400 }
      );
    }

    // Handle media files based on action
    if (mediaFiles.length > 0 && action === 'move') {
      // Move all media to target folder (or root if null)
      const targetId = targetFolderId === 'null' ? null : Number.parseInt(targetFolderId || '0');
      await db.execute<ResultSetHeader>(
        `UPDATE ${mediaTable} SET folder_id = ? WHERE folder_id IN (${placeholders})`,
        [targetId, ...allFolderIds]
      );
    } else if (mediaFiles.length > 0 && action === 'delete') {
      // Delete all media files (from database and filesystem)
      for (const media of mediaFiles) {
        await deleteMediaFiles(media);
      }
      
      // Delete media records from database
      await db.execute<ResultSetHeader>(
        `DELETE FROM ${mediaTable} WHERE folder_id IN (${placeholders})`,
        allFolderIds
      );
    }

    // Delete all folders in the tree (in reverse order to handle foreign key constraints)
    // Children first, then parent
    for (let i = allFolderIds.length - 1; i >= 0; i--) {
      await db.execute<ResultSetHeader>(
        `DELETE FROM ${mediaFoldersTable} WHERE id = ?`,
        [allFolderIds[i]]
      );
    }

    return NextResponse.json({ 
      message: 'Folder deleted successfully',
      folders_deleted: allFolderIds.length,
      media_moved: action === 'move' ? mediaFiles.length : 0,
      media_deleted: action === 'delete' ? mediaFiles.length : 0
    });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
  }
}

