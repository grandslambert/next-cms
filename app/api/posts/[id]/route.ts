import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import connectDB from '@/lib/mongodb';
import { Post, User, Setting } from '@/lib/models';
import { slugify } from '@/lib/utils';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    
    // Validate ID format
    if (!/^[0-9a-fA-F]{24}$/.test(params.id)) {
      return NextResponse.json({ error: 'Invalid post ID format' }, { status: 400 });
    }

    const siteId = (session?.user as any)?.currentSiteId;
    
    const post = await Post.findOne({
      _id: params.id,
      site_id: siteId,
    }).lean();

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Get author name
    let authorName = 'Unknown';
    if (post.author_id) {
      const author = await User.findById(post.author_id).select('first_name last_name').lean();
      if (author) {
        authorName = `${author.first_name} ${author.last_name}`;
      }
    }

    return NextResponse.json({ 
      post: {
        id: post._id.toString(),
        ...post,
        author_name: authorName,
        _id: undefined,
      }
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate ID format
    if (!/^[0-9a-fA-F]{24}$/.test(params.id)) {
      return NextResponse.json({ error: 'Invalid post ID format' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const permissions = (session.user as any).permissions || {};
    const siteId = (session.user as any).currentSiteId;

    // Check if post exists and get current content
    const existingPost = await Post.findOne({
      _id: params.id,
      site_id: siteId,
    });

    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const isOwner = existingPost.author_id?.toString() === userId;
    const canManageOthers = permissions.manage_others_posts === true;

    // Check if user can edit this post
    if (!isOwner && !canManageOthers) {
      return NextResponse.json({ error: 'You can only edit your own posts' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      title, 
      slug: customSlug, 
      content, 
      excerpt, 
      featured_image_id, 
      status, 
      parent_id, 
      menu_order, 
      author_id, 
      scheduled_publish_at,
      visibility,
      password,
      allow_comments,
      custom_fields,
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Check if user can publish (required for both immediate and scheduled publishing)
    if ((status === 'published' || status === 'scheduled') && !permissions.can_publish) {
      return NextResponse.json({ error: 'You do not have permission to publish posts' }, { status: 403 });
    }

    // Check if user can reassign author
    if (author_id && author_id !== existingPost.author_id?.toString()) {
      if (!permissions.can_reassign) {
        return NextResponse.json({ error: 'You do not have permission to reassign posts' }, { status: 403 });
      }
    }

    // Use custom slug if provided, otherwise generate from title
    const slug = customSlug || slugify(title);
    
    // Check for duplicate slug (excluding current post)
    const duplicatePost = await Post.findOne({
      site_id: siteId,
      slug,
      _id: { $ne: params.id },
    });

    if (duplicatePost) {
      return NextResponse.json({ error: 'A post with this slug already exists' }, { status: 409 });
    }

    // Handle published_at and scheduled_publish_at based on status
    let publishedAt = existingPost.published_at;
    let scheduledPublishAt = existingPost.scheduled_publish_at;
    
    if (status === 'published' && existingPost.status !== 'published') {
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

    // TODO: Add revision support in future update
    // For now, we'll skip revisions to keep the conversion simpler

    // Prepare update data
    const updateData: any = {
      title,
      slug,
      content: content !== undefined ? content : existingPost.content,
      excerpt: excerpt !== undefined ? excerpt : existingPost.excerpt,
      featured_image_id: featured_image_id !== undefined ? featured_image_id : existingPost.featured_image_id,
      parent_id: (parent_id && /^[0-9a-fA-F]{24}$/.test(parent_id)) ? parent_id : (parent_id === null ? null : existingPost.parent_id),
      menu_order: menu_order !== undefined ? menu_order : existingPost.menu_order,
      status: status || existingPost.status,
      published_at: publishedAt,
      scheduled_publish_at: scheduledPublishAt,
      visibility: visibility !== undefined ? visibility : existingPost.visibility,
      password: password !== undefined ? password : existingPost.password,
      allow_comments: allow_comments !== undefined ? allow_comments : existingPost.allow_comments,
      custom_fields: custom_fields !== undefined ? custom_fields : existingPost.custom_fields,
    };

    // Add author_id to update if provided and user has permission
    if (author_id && permissions.can_reassign && /^[0-9a-fA-F]{24}$/.test(author_id)) {
      updateData.author_id = author_id;
    }

    // Update post
    const updatedPost = await Post.findOneAndUpdate(
      { _id: params.id, site_id: siteId },
      { $set: updateData },
      { new: true }
    );

    if (!updatedPost) {
      return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
    }

    // Log activity
    const action = status === 'published' && existingPost.status !== 'published' 
      ? 'post_published' 
      : status === 'scheduled' 
      ? 'post_scheduled' 
      : 'post_updated';
    
    await logActivity({
      userId,
      action,
      entityType: 'post',
      entityId: params.id,
      entityName: title || existingPost.title,
      details: `Updated ${existingPost.post_type}: "${title || existingPost.title}"`,
      changesBefore: {
        title: existingPost.title,
        content: existingPost.content,
        excerpt: existingPost.excerpt,
        status: existingPost.status,
        featured_image_id: existingPost.featured_image_id,
        parent_id: existingPost.parent_id?.toString() || null,
        menu_order: existingPost.menu_order,
      },
      changesAfter: {
        title: updateData.title,
        content: updateData.content,
        excerpt: updateData.excerpt,
        status: updateData.status,
        featured_image_id: updateData.featured_image_id,
        parent_id: updateData.parent_id?.toString() || null,
        menu_order: updateData.menu_order,
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    return NextResponse.json({ 
      post: {
        id: updatedPost._id.toString(),
        ...updatedPost.toObject(),
        _id: undefined,
      }
    });
  } catch (error: any) {
    console.error('Error updating post:', error);
    if (error.code === 11000) {
      return NextResponse.json({ error: 'A post with this slug already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate ID format
    if (!/^[0-9a-fA-F]{24}$/.test(params.id)) {
      return NextResponse.json({ error: 'Invalid post ID format' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const permissions = (session.user as any).permissions || {};
    const siteId = (session.user as any).currentSiteId;

    // Check if post exists and get author
    const existingPost = await Post.findOne({
      _id: params.id,
      site_id: siteId,
    });

    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const isOwner = existingPost.author_id?.toString() === userId;
    const canDelete = permissions.can_delete === true;
    const canDeleteOthers = permissions.can_delete_others === true;

    // Check if user can delete this post
    if (isOwner && !canDelete) {
      return NextResponse.json({ error: 'You do not have permission to delete posts' }, { status: 403 });
    }
    
    if (!isOwner && !canDeleteOthers) {
      return NextResponse.json({ error: 'You do not have permission to delete others\' posts' }, { status: 403 });
    }

    // Move post to trash instead of permanently deleting
    await Post.findOneAndUpdate(
      { _id: params.id, site_id: siteId },
      { $set: { status: 'trash' } }
    );

    // Log activity
    await logActivity({
      userId,
      action: 'post_trashed',
      entityType: 'post',
      entityId: params.id,
      entityName: existingPost.title,
      details: `Moved ${existingPost.post_type} to trash: "${existingPost.title}"`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    return NextResponse.json({ success: true, message: 'Post moved to trash' });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
