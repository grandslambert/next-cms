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
      terms: [],
      total: 0,
    };

    // Check posts (includes all post types: posts, pages, custom types)
    const [posts] = await db.query<RowDataPacket[]>(
      'SELECT id, title, post_type FROM posts WHERE featured_image_id = ?',
      [params.id]
    );
    usage.posts = posts;

    // Check taxonomy terms
    const [terms] = await db.query<RowDataPacket[]>(
      'SELECT t.id, t.name, tax.label as taxonomy_label FROM terms t LEFT JOIN taxonomies tax ON t.taxonomy_id = tax.id WHERE t.image_id = ?',
      [params.id]
    );
    usage.terms = terms;

    usage.total = usage.posts.length + usage.terms.length;

    return NextResponse.json({ usage });
  } catch (error) {
    console.error('Error checking media usage:', error);
    return NextResponse.json({ error: 'Failed to check usage' }, { status: 500 });
  }
}

