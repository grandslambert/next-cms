import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const usage: any = {
      posts: [],
      pages: [],
      categories: [],
      total: 0,
    };

    // Check posts
    const [posts] = await db.query<RowDataPacket[]>(
      'SELECT id, title FROM posts WHERE featured_image_id = ?',
      [params.id]
    );
    usage.posts = posts;

    // Check pages
    const [pages] = await db.query<RowDataPacket[]>(
      'SELECT id, title FROM pages WHERE featured_image_id = ?',
      [params.id]
    );
    usage.pages = pages;

    // Check categories
    const [categories] = await db.query<RowDataPacket[]>(
      'SELECT id, name FROM categories WHERE image_id = ?',
      [params.id]
    );
    usage.categories = categories;

    usage.total = usage.posts.length + usage.pages.length + usage.categories.length;

    return NextResponse.json({ usage });
  } catch (error) {
    console.error('Error checking media usage:', error);
    return NextResponse.json({ error: 'Failed to check usage' }, { status: 500 });
  }
}

