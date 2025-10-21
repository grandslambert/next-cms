import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { SiteModels, GlobalModels } from '@/lib/model-factory';
import { slugify } from '@/lib/utils';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const postType = searchParams.get('post_type') || 'post';
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    const userId = session ? (session.user as any).id : null;
    const permissions = session ? (session.user as any).permissions || {} : {};
    const canViewOthers = permissions.view_others_posts === true;
    
    // Get site context
    const siteId = (session?.user as any)?.currentSiteId;
    
    if (!siteId) {
      return NextResponse.json({ error: 'No site context' }, { status: 400 });
    }
    
    const Post = await SiteModels.Post(siteId);
    const User = await GlobalModels.User();
    const Media = await SiteModels.Media(siteId);

    // Build query (no site_id needed - we're in the site database)
    const query: any = {};
    
    // Only filter by post_type if it's not 'all'
    if (postType !== 'all') {
      query.post_type = postType;
    }

    // Filter by author if user can't view others' posts
    if (userId && !canViewOthers) {
      query.author_id = userId;
    }

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    } else if (!status || status === 'all') {
      // Exclude trash from default queries
      query.status = { $ne: 'trash' };
    }

    // Add search filter
    if (search && search.trim() !== '') {
      const searchTerm = search.trim();
      query.$or = [
        { title: { $regex: searchTerm, $options: 'i' } },
        { content: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    // Get posts with pagination
    const posts = await Post.find(query)
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    // Get total count
    const total = await Post.countDocuments(query);

    // Get author names
    const authorIds = Array.from(new Set(posts.map((p: any) => p.author_id?.toString()).filter(Boolean)));
    const authors = await User.find({ _id: { $in: authorIds } }).select('_id first_name last_name').lean() as any[];
    const authorMap = new Map(authors.map((a: any) => [a._id.toString(), `${a.first_name} ${a.last_name}`]));

    // Get featured image URLs
    const mediaIds = Array.from(new Set(posts.map((p: any) => p.featured_image_id?.toString()).filter(Boolean)));
    const mediaItems = await Media.find({ _id: { $in: mediaIds } }).select('_id filepath').lean() as any[];
    const mediaMap = new Map(mediaItems.map((m: any) => [m._id.toString(), m.filepath]));

    // Format for UI
    const formattedPosts = posts.map((post: any) => ({
      ...post,
      id: post._id.toString(),
      author_name: authorMap.get(post.author_id?.toString()) || 'Unknown',
      featured_image_url: post.featured_image_id ? mediaMap.get(post.featured_image_id.toString()) || '' : '',
      _id: undefined,
    }));

    return NextResponse.json({ posts: formattedPosts, total });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      title, 
      slug: customSlug, 
      content, 
      excerpt, 
      featured_image_id, 
      status, 
      post_type, 
      parent_id, 
      menu_order, 
      scheduled_publish_at,
      visibility,
      password,
      allow_comments,
      custom_fields,
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const permissions = (session.user as any).permissions || {};
    const userId = (session.user as any).id;
    const siteId = (session.user as any).currentSiteId;
    
    if (!siteId) {
      return NextResponse.json({ error: 'No site context' }, { status: 400 });
    }
    
    const Post = await SiteModels.Post(siteId);

    // Check if user can publish (required for both immediate and scheduled publishing)
    if ((status === 'published' || status === 'scheduled') && !permissions.can_publish) {
      return NextResponse.json({ error: 'You do not have permission to publish posts' }, { status: 403 });
    }

    // Use custom slug if provided, otherwise generate from title
    const slug = customSlug || slugify(title);
    
    // Handle published_at and scheduled_publish_at based on status
    let publishedAt = null;
    let scheduledPublishAt = null;
    
    if (status === 'published') {
      publishedAt = new Date();
    } else if (status === 'scheduled') {
      scheduledPublishAt = scheduled_publish_at ? new Date(scheduled_publish_at) : null;
      if (!scheduledPublishAt || scheduledPublishAt <= new Date()) {
        return NextResponse.json({ error: 'Scheduled publish date must be in the future' }, { status: 400 });
      }
    }

    // Validate parent_id if provided
    if (parent_id && /^[0-9a-fA-F]{24}$/.test(parent_id)) {
      const parentExists = await Post.findById(parent_id);
      if (!parentExists) {
        return NextResponse.json({ error: 'Invalid parent post' }, { status: 400 });
      }
    }

    // Check for duplicate slug
    const existingPost = await Post.findOne({
      slug,
    });

    if (existingPost) {
      return NextResponse.json({ error: 'A post with this slug already exists' }, { status: 409 });
    }

    // Create post
    const newPost = await Post.create({
      post_type: post_type || 'post',
      title,
      slug,
      content: content || '',
      excerpt: excerpt || '',
      featured_image_id: featured_image_id || null,
      parent_id: (parent_id && /^[0-9a-fA-F]{24}$/.test(parent_id)) ? parent_id : null,
      menu_order: menu_order || 0,
      status: status || 'draft',
      visibility: visibility || 'public',
      password: password || null,
      author_id: userId,
      published_at: publishedAt,
      scheduled_publish_at: scheduledPublishAt,
      allow_comments: allow_comments !== false,
      custom_fields: custom_fields || {},
    });

    // Log activity
    await logActivity({
      userId,
      action: status === 'published' ? 'post_published' : 'post_created',
      entityType: 'post',
      entityId: newPost._id.toString(),
      entityName: title,
      details: `Created ${post_type || 'post'}: "${title}" with status: ${status || 'draft'}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    return NextResponse.json({ 
      post: {
        id: newPost._id.toString(),
        ...newPost.toObject(),
        _id: undefined,
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating post:', error);
    if (error.code === 11000) {
      return NextResponse.json({ error: 'A post with this slug already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
