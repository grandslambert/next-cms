import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { GlobalModels } from '@/lib/model-factory';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const Site = await GlobalModels.Site();
    const User = await GlobalModels.User();
    const Role = await GlobalModels.Role();
    const SiteUser = await GlobalModels.SiteUser();
    
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
    const siteId = parseInt(params.id);
    if (!siteId || isNaN(siteId) || !/^[0-9a-fA-F]{24}$/.test(params.userId) || !/^[0-9a-fA-F]{24}$/.test(role_id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    // Get site and user info for logging
    const site = await Site.findOne({ id: siteId });
    const user = await User.findById(params.userId);
    
    const siteUser = await SiteUser.findOne({ 
      site_id: siteId, 
      user_id: params.userId 
    }).lean();
    
    const newRole = await Role.findById(role_id);

    if (!site || !user || !siteUser || !newRole) {
      return NextResponse.json({ error: 'Site, user, or role not found' }, { status: 404 });
    }

    // Manually fetch old role
    const oldRole = await Role.findById(siteUser.role_id);
    const oldRoleName = oldRole?.label || 'unknown';

    // Update user role for site
    await SiteUser.findOneAndUpdate(
      { site_id: siteId, user_id: params.userId },
      { role_id }
    );

    // Log activity
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'site_user_updated' as any,
      entityType: 'site' as any,
      entityId: siteId.toString(),
      entityName: site.display_name,
      details: `Changed role for ${user.username} from ${oldRoleName} to ${newRole.label}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId: siteId,
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
    const Site = await GlobalModels.Site();
    const User = await GlobalModels.User();
    const SiteUser = await GlobalModels.SiteUser();
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = (session.user as any)?.isSuperAdmin;
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 });
    }

    // Validate IDs
    const siteId = parseInt(params.id);
    if (!siteId || isNaN(siteId) || !/^[0-9a-fA-F]{24}$/.test(params.userId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    // Get site and user info for logging
    const site = await Site.findOne({ id: siteId });
    const user = await User.findById(params.userId);

    // Remove user from site
    await SiteUser.deleteOne({ 
      site_id: siteId, 
      user_id: params.userId 
    });

    // Log activity
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'site_user_removed' as any,
      entityType: 'site' as any,
      entityId: siteId.toString(),
      entityName: site?.display_name || 'Unknown Site',
      details: `Removed user ${user?.username || 'user'} from site`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId: siteId,
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
