import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import connectDB from '@/lib/mongodb';
import { User, Role, SiteUser, Site } from '@/lib/models';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

// Switch to another user
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = (session.user as any)?.isSuperAdmin || false;
    const userRole = (session.user as any)?.role;
    
    // Only super admins and admins can switch users
    if (!isSuperAdmin && userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const { targetUserId } = await request.json();

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
    }

    // Validate ID format
    if (!/^[0-9a-fA-F]{24}$/.test(targetUserId)) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
    }

    // Get target user details
    const targetUser = await User.findById(targetUserId).populate('role').lean();

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    const targetRole = targetUser.role as any;
    const targetRoleName = targetRole?.name || 'author';

    // Prevent switching to another super admin (for security)
    if (targetRoleName === 'super_admin' && !isSuperAdmin) {
      return NextResponse.json({ error: 'Cannot switch to super admin' }, { status: 403 });
    }

    // Check if target is super admin
    const targetIsSuperAdmin = targetRoleName === 'super_admin';

    // Check if non-super-admin user has any active site assignments
    if (!targetIsSuperAdmin) {
      const siteAssignments = await SiteUser.find({ user_id: targetUserId }).lean();
      
      if (siteAssignments.length === 0) {
        return NextResponse.json({ 
          error: 'Cannot switch to user with no site assignments' 
        }, { status: 400 });
      }

      // Check if any assigned sites are active
      const siteIds = siteAssignments.map(sa => sa.site_id);
      const activeSites = await Site.countDocuments({ 
        _id: { $in: siteIds },
        is_active: true 
      });

      if (activeSites === 0) {
        return NextResponse.json({ 
          error: 'Cannot switch to user with no active site assignments' 
        }, { status: 400 });
      }
    }

    // Parse permissions
    let permissions = targetRole?.permissions || {};
    
    // Convert Map to object if needed
    if (permissions instanceof Map) {
      permissions = Object.fromEntries(permissions);
    }

    if (targetIsSuperAdmin) {
      permissions = new Proxy({ is_super_admin: true }, {
        get: () => true
      });
    }

    // Get target user's first assigned site
    let defaultSiteId = null;
    if (!targetIsSuperAdmin) {
      const siteAssignment = await SiteUser.findOne({ user_id: targetUserId })
        .sort({ site_id: 1 })
        .lean();
      
      if (siteAssignment) {
        defaultSiteId = siteAssignment.site_id.toString();
      }
    }

    // Log the switch activity
    const originalUserId = (session.user as any).id;
    await logActivity({
      userId: originalUserId,
      action: 'user_switched' as any,
      entityType: 'user' as any,
      entityId: targetUser._id.toString(),
      entityName: `${targetUser.first_name} ${targetUser.last_name}`.trim() || targetUser.username,
      details: `Switched to user: ${targetUser.username}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ 
      success: true,
      switchData: {
        id: targetUser._id.toString(),
        email: targetUser.email,
        name: `${targetUser.first_name} ${targetUser.last_name}`.trim() || targetUser.username,
        role: targetRoleName,
        roleId: targetRole?._id?.toString(),
        permissions,
        isSuperAdmin: targetIsSuperAdmin,
        currentSiteId: defaultSiteId,
        originalUserId, // Store original user ID to switch back
        isSwitched: true, // Flag to indicate this is a switched session
      }
    });
  } catch (error) {
    console.error('Error switching user:', error);
    return NextResponse.json({ error: 'Failed to switch user' }, { status: 500 });
  }
}

// Switch back to original user
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const originalUserId = (session.user as any)?.originalUserId;
    const isSwitched = (session.user as any)?.isSwitched;

    if (!isSwitched || !originalUserId) {
      return NextResponse.json({ error: 'Not in switched mode' }, { status: 400 });
    }

    // Validate ID format
    if (!/^[0-9a-fA-F]{24}$/.test(originalUserId)) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
    }

    // Get original user details
    const originalUser = await User.findById(originalUserId).populate('role').lean();

    if (!originalUser) {
      return NextResponse.json({ error: 'Original user not found' }, { status: 404 });
    }

    const originalRole = originalUser.role as any;
    const originalRoleName = originalRole?.name || 'author';

    // Parse permissions
    let permissions = originalRole?.permissions || {};
    
    // Convert Map to object if needed
    if (permissions instanceof Map) {
      permissions = Object.fromEntries(permissions);
    }

    const isSuperAdmin = originalRoleName === 'super_admin';
    if (isSuperAdmin) {
      permissions = new Proxy({ is_super_admin: true }, {
        get: () => true
      });
    }

    // Get original user's site
    let defaultSiteId = null;
    if (!isSuperAdmin) {
      const siteAssignment = await SiteUser.findOne({ user_id: originalUserId })
        .sort({ site_id: 1 })
        .lean();
      
      if (siteAssignment) {
        defaultSiteId = siteAssignment.site_id.toString();
      }
    }

    // Log the switch back
    await logActivity({
      userId: originalUserId,
      action: 'user_switch_back' as any,
      entityType: 'user' as any,
      entityId: originalUser._id.toString(),
      entityName: `${originalUser.first_name} ${originalUser.last_name}`.trim() || originalUser.username,
      details: `Switched back to original user: ${originalUser.username}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ 
      success: true,
      switchData: {
        id: originalUser._id.toString(),
        email: originalUser.email,
        name: `${originalUser.first_name} ${originalUser.last_name}`.trim() || originalUser.username,
        role: originalRoleName,
        roleId: originalRole?._id?.toString(),
        permissions,
        isSuperAdmin,
        currentSiteId: defaultSiteId,
        originalUserId: null,
        isSwitched: false,
      }
    });
  } catch (error) {
    console.error('Error switching back:', error);
    return NextResponse.json({ error: 'Failed to switch back' }, { status: 500 });
  }
}
