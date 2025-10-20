import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import connectDB from '@/lib/mongodb';
import { User, Role, SiteUser } from '@/lib/models';
import bcrypt from 'bcryptjs';
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

    const user = await User.findById(params.id)
      .populate('role', 'name label permissions')
      .select('-password')
      .lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get site assignments
    const siteAssignments = await SiteUser.find({ user_id: params.id })
      .populate('site_id', 'name display_name')
      .populate('role_id', 'name label')
      .lean();
    
    // Add id field and format response for compatibility
    const responseUser = {
      ...user,
      id: user._id.toString(),
      role_name: (user.role as any)?.name,
      role_display_name: (user.role as any)?.label,
      sites: siteAssignments.map(sa => ({
        id: (sa.site_id as any)?._id?.toString(),
        name: (sa.site_id as any)?.name,
        display_name: (sa.site_id as any)?.display_name,
        role_id: (sa.role_id as any)?._id?.toString(),
        role_display_name: (sa.role_id as any)?.label,
      }))
    };

    return NextResponse.json({ user: responseUser });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    const isSuperAdmin = (session?.user as any)?.isSuperAdmin || false;
    const hasPermission = (session?.user as any)?.permissions?.manage_users || false;
    const currentUserId = (session?.user as any)?.id;
    
    // Users can edit their own profile OR must have manage_users permission
    const isSelfEdit = currentUserId === params.id;
    
    if (!session?.user || (!isSuperAdmin && !hasPermission && !isSelfEdit)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user details BEFORE update for logging
    const userBefore = await User.findById(params.id).lean();
    if (!userBefore) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { username, first_name, last_name, email, password, role_id, sites } = body;

    if (!username || !first_name || !email) {
      return NextResponse.json({ 
        error: 'Username, first name, and email are required' 
      }, { status: 400 });
    }

    // Check for duplicate username/email (excluding current user)
    const duplicate = await User.findOne({
      _id: { $ne: params.id },
      $or: [{ username }, { email }]
    });

    if (duplicate) {
      return NextResponse.json({ 
        error: duplicate.username === username 
          ? 'Username already exists' 
          : 'Email already exists' 
      }, { status: 400 });
    }

    // Prepare update data
    const updateData: any = {
      username,
      first_name,
      last_name,
      email,
    };

    // Only admins can change roles (users can't change their own role)
    if (role_id && !isSelfEdit && (isSuperAdmin || hasPermission)) {
      updateData.role = role_id;
    }

    // Handle password update
    if (password?.trim()) {
      // Basic password validation
      if (password.length < 8) {
        return NextResponse.json({ 
          error: 'Password must be at least 8 characters long' 
        }, { status: 400 });
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    )
      .populate('role', 'name label permissions')
      .select('-password')
      .lean();

    // Update site assignments (only for admins, not self-edit)
    if (sites && !isSelfEdit && (isSuperAdmin || hasPermission)) {
      // Remove existing site assignments
      await SiteUser.deleteMany({ user_id: params.id });
      
      // Add new site assignments
      for (const siteAssignment of sites) {
        await SiteUser.create({
          site_id: siteAssignment.site_id,
          user_id: params.id,
          role_id: siteAssignment.role_id || role_id,
        });
      }
    }

    // Log activity
    const siteId = (session.user as any).currentSiteId || 1;
    await logActivity({
      userId: currentUserId,
      action: 'user_updated',
      entityType: 'user',
      entityId: params.id,
      entityName: username,
      details: `Updated user: ${username}`,
      changesBefore: {
        username: userBefore.username,
        email: userBefore.email,
        first_name: userBefore.first_name,
        last_name: userBefore.last_name,
      },
      changesAfter: {
        username: updatedUser?.username,
        email: updatedUser?.email,
        first_name: updatedUser?.first_name,
        last_name: updatedUser?.last_name,
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    // Format response with id field for compatibility
    const responseUser = {
      ...updatedUser,
      id: updatedUser?._id.toString(),
      role_name: (updatedUser?.role as any)?.name,
      role_display_name: (updatedUser?.role as any)?.label,
    };

    return NextResponse.json({ user: responseUser });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    const isSuperAdmin = (session?.user as any)?.isSuperAdmin || false;
    const hasPermission = (session?.user as any)?.permissions?.manage_users || false;
    const currentUserId = (session?.user as any)?.id;
    
    if (!session?.user || (!isSuperAdmin && !hasPermission)) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    // Prevent self-deletion
    if (currentUserId === params.id) {
      return NextResponse.json({ 
        error: 'You cannot delete your own account' 
      }, { status: 403 });
    }

    // Get user before deletion for logging
    const user = await User.findById(params.id).lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete user and their site assignments
    await User.findByIdAndDelete(params.id);
    await SiteUser.deleteMany({ user_id: params.id });

    // Log activity
    const siteId = (session.user as any).currentSiteId || 1;
    await logActivity({
      userId: currentUserId,
      action: 'user_deleted',
      entityType: 'user',
      entityId: params.id,
      entityName: user.username,
      details: `Deleted user: ${user.username}`,
      changesBefore: {
        username: user.username,
        email: user.email,
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId,
    });

    return NextResponse.json({ 
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
