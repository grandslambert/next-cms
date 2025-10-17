import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { ResultSetHeader } from 'mysql2';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const siteId = (session.user as any).currentSiteId || 1;
    const body = await request.json();
    const { 
      post_id, 
      post_type, 
      title, 
      content, 
      excerpt,
      custom_fields,
      parent_id,
      menu_order,
      author_id,
      featured_image_id,
      featured_image_url,
      selected_terms,
      seo_title,
      seo_description,
      seo_keywords
    } = body;

    // Create a unique key for this autosave
    const autosaveKey = post_id 
      ? `autosave_post_${post_id}_user_${userId}`
      : `autosave_new_${post_type}_user_${userId}`;

    // Store autosave in user_meta
    await db.execute<ResultSetHeader>(
      `INSERT INTO user_meta (user_id, site_id, meta_key, meta_value, updated_at) 
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value), updated_at = NOW()`,
      [
        userId,
        siteId,
        autosaveKey,
        JSON.stringify({
          title,
          content,
          excerpt,
          custom_fields,
          parent_id,
          menu_order,
          author_id,
          featured_image_id,
          featured_image_url,
          selected_terms,
          seo_title,
          seo_description,
          seo_keywords,
          saved_at: new Date().toISOString()
        })
      ]
    );

    return NextResponse.json({ 
      success: true,
      saved_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error autosaving:', error);
    return NextResponse.json({ error: 'Failed to autosave' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const siteId = (session.user as any).currentSiteId || 1;
    const searchParams = request.nextUrl.searchParams;
    const postId = searchParams.get('post_id');
    const postType = searchParams.get('post_type');

    const autosaveKey = postId 
      ? `autosave_post_${postId}_user_${userId}`
      : `autosave_new_${postType}_user_${userId}`;

    const [rows] = await db.query<any[]>(
      'SELECT meta_value FROM user_meta WHERE user_id = ? AND site_id = ? AND meta_key = ?',
      [userId, siteId, autosaveKey]
    );

    if (rows.length === 0) {
      return NextResponse.json({ autosave: null });
    }

    try {
      const autosaveData = JSON.parse(rows[0].meta_value);
      return NextResponse.json({ autosave: autosaveData });
    } catch (error) {
      return NextResponse.json({ autosave: null });
    }
  } catch (error) {
    console.error('Error fetching autosave:', error);
    return NextResponse.json({ error: 'Failed to fetch autosave' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const siteId = (session.user as any).currentSiteId || 1;
    const searchParams = request.nextUrl.searchParams;
    const postId = searchParams.get('post_id');
    const postType = searchParams.get('post_type');

    const autosaveKey = postId 
      ? `autosave_post_${postId}_user_${userId}`
      : `autosave_new_${postType}_user_${userId}`;

    await db.execute<ResultSetHeader>(
      'DELETE FROM user_meta WHERE user_id = ? AND site_id = ? AND meta_key = ?',
      [userId, siteId, autosaveKey]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting autosave:', error);
    return NextResponse.json({ error: 'Failed to delete autosave' }, { status: 500 });
  }
}

