import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import connectDB from '@/lib/mongodb';
import { SiteModels } from '@/lib/model-factory';
import { slugify } from '@/lib/utils';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function GET(
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
      return NextResponse.json({ error: 'Invalid term ID format' }, { status: 400 });
    }

    const siteId = (session.user as any).currentSiteId;
    const Term = await SiteModels.Term(siteId);
    
    const term = await Term.findById(params.id).lean();

    if (!term) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 });
    }

    // Get image URL if term has an image
    let imageUrl = '';
    const imageId = (term as any).meta?.image_id;
    if (imageId && /^[0-9a-fA-F]{24}$/.test(imageId)) {
      const Media = await SiteModels.Media(siteId);
      const image = await Media.findById(imageId).select('filepath').lean();
      if (image) {
        imageUrl = (image as any).filepath || '';
      }
    }

    return NextResponse.json({ 
      term: {
        id: (term as any)._id.toString(),
        ...(term as any),
        taxonomy_name: (term as any).taxonomy,
        image_id: imageId || null,
        image_url: imageUrl,
        _id: undefined,
      }
    });
  } catch (error) {
    console.error('Error fetching term:', error);
    return NextResponse.json({ error: 'Failed to fetch term' }, { status: 500 });
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
      return NextResponse.json({ error: 'Invalid term ID format' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const siteId = (session.user as any).currentSiteId;
    const Term = await SiteModels.Term(siteId);

    const body = await request.json();
    const { name, description, parent_id, meta, image_id } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const slug = slugify(name);

    // Get current term BEFORE updating (for activity log)
    const currentTerm = await Term.findById(params.id);

    if (!currentTerm) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 });
    }

    // Check if new slug already exists for this taxonomy (excluding current term)
    const existing = await Term.findOne({
      taxonomy: currentTerm.taxonomy,
      slug,
      _id: { $ne: params.id },
    });

    if (existing) {
      return NextResponse.json({ 
        error: 'A term with this name already exists in this taxonomy' 
      }, { status: 409 });
    }

    // Validate parent_id if provided
    if (parent_id && /^[0-9a-fA-F]{24}$/.test(parent_id)) {
      const parentExists = await Term.findById(parent_id);
      if (!parentExists) {
        return NextResponse.json({ error: 'Invalid parent term' }, { status: 400 });
      }
    }

    // Prepare before/after changes
    const changesBefore = {
      name: currentTerm.name,
      slug: currentTerm.slug,
      description: currentTerm.description,
      parent_id: currentTerm.parent_id?.toString() || null,
      meta: currentTerm.meta,
    };

    // Build meta object
    const termMeta: any = currentTerm.meta ? JSON.parse(JSON.stringify(currentTerm.meta)) : {};
    if (meta && typeof meta === 'object') {
      Object.assign(termMeta, meta);
    }
    if (image_id !== undefined) {
      if (image_id) {
        termMeta.image_id = image_id;
      } else {
        delete termMeta.image_id;
      }
    }

    // Update term
    const updatedTerm = await Term.findByIdAndUpdate(
      params.id,
      { 
        $set: { 
          name,
          slug,
          description: description || '',
          parent_id: (parent_id && /^[0-9a-fA-F]{24}$/.test(parent_id)) ? parent_id : null,
          meta: termMeta,
        }
      },
      { new: true }
    );

    if (!updatedTerm) {
      return NextResponse.json({ error: 'Failed to update term' }, { status: 500 });
    }

    const changesAfter = {
      name: updatedTerm.name,
      slug: updatedTerm.slug,
      description: updatedTerm.description,
      parent_id: updatedTerm.parent_id?.toString() || null,
    };

    // Log activity
    await logActivity({
      userId,
      action: 'term_updated',
      entityType: 'term',
      entityId: params.id,
      entityName: name,
      details: `Updated term: ${name} in ${updatedTerm.taxonomy}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      changesBefore,
      changesAfter,
      siteId,
    });

    return NextResponse.json({ 
      term: {
        id: updatedTerm._id.toString(),
        ...updatedTerm.toObject(),
        taxonomy_name: updatedTerm.taxonomy,
        _id: undefined,
      }
    });
  } catch (error: any) {
    console.error('Error updating term:', error);
    return NextResponse.json({ error: 'Failed to update term' }, { status: 500 });
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
      return NextResponse.json({ error: 'Invalid term ID format' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const siteId = (session.user as any).currentSiteId;
    const Term = await SiteModels.Term(siteId);

    // Get term details for logging
    const term = await Term.findById(params.id);

    if (!term) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 });
    }

    // Check if term has children
    const childCount = await Term.countDocuments({
      parent_id: params.id,
    });

    if (childCount > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete term that has child terms. Delete children first.' 
      }, { status: 400 });
    }

    // Log activity before deleting
    await logActivity({
      userId,
      action: 'term_deleted',
      entityType: 'term',
      entityId: params.id,
      entityName: term.name,
      details: `Deleted term: ${term.name} from ${term.taxonomy}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    // Delete the term
    await Term.findByIdAndDelete(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting term:', error);
    return NextResponse.json({ error: 'Failed to delete term' }, { status: 500 });
  }
}
