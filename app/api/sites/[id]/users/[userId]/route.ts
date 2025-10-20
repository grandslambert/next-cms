import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import connectDB from '@/lib/mongodb';
import { SiteUser, User, Role, Site } from '@/lib/models';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = (session.user as any)?.isSuperAdmin;
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 });
    }

    const { role_id } = await request.json();

    if (role_id === undefined || role_id === null) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 });
    }

    // Validate IDs
    if (!/^[0-9a-fA-F]{24}$/.test(params.id) || !/^[0-9a-fA-F]{24}$/.test(params.userId) || !/^[0-9a-fA-F]{24}$/.test(role_id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    // Get site and user info for logging
    const site = await Site.findById(params.id);
    const user = await User.findById(params.userId);
    
    const siteUser = await SiteUser.findOne({ 
      site_id: params.id, 
      user_id: params.userId 
    }).populate('role_id', 'label');
    
    const newRole = await Role.findById(role_id);

    if (!site || !user || !siteUser || !newRole) {
      return NextResponse.json({ error: 'Site, user, or role not found' }, { status: 404 });
    }

    const oldRoleName = (siteUser.role_id as any)?.label || 'unknown';

    // Update user role for site
    siteUser.role_id = role_id as any;
    await siteUser.save();

    // Log activity
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'site_user_updated' as any,
      entityType: 'site' as any,
      entityId: params.id,
      entityName: site.display_name,
      details: `Changed role for ${user.username} from ${oldRoleName} to ${newRole.label}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId: params.id,
    });

    return NextResponse.json({ 
      success: true,
      message: 'User role updated successfully'
    });
  } catch (error) {
    console.error('Error updating site user:', error);
    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = (session.user as any)?.isSuperAdmin;
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 });
    }

    // Validate IDs
    if (!/^[0-9a-fA-F]{24}$/.test(params.id) || !/^[0-9a-fA-F]{24}$/.test(params.userId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    // Get site and user info for logging
    const site = await Site.findById(params.id);
    const user = await User.findById(params.userId);

    // Remove user from site
    await SiteUser.deleteOne({ 
      site_id: params.id, 
      user_id: params.userId 
    });

    // Log activity
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'site_user_removed' as any,
      entityType: 'site' as any,
      entityId: params.id,
      entityName: site?.display_name || 'Unknown Site',
      details: `Removed user ${user?.username || 'user'} from site`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId: params.id,
    });

    return NextResponse.json({ 
      success: true,
      message: 'User removed from site successfully'
    });
  } catch (error) {
    console.error('Error removing user from site:', error);
    return NextResponse.json({ error: 'Failed to remove user from site' }, { status: 500 });
  }
}
