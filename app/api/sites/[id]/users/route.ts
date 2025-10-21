import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { GlobalModels } from '@/lib/model-factory';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const SiteUser = await GlobalModels.SiteUser();
    const User = await GlobalModels.User();
    const Role = await GlobalModels.Role();
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = (session.user as any)?.isSuperAdmin;
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 });
    }

    // Validate site ID
    const siteId = parseInt(params.id);
    if (!siteId || isNaN(siteId)) {
      return NextResponse.json({ error: 'Invalid site ID' }, { status: 400 });
    }

    // Get all users assigned to this site
    const siteUsers = await SiteUser.find({ site_id: siteId }).lean();

    // Fetch related users and roles
    const userIds = siteUsers.map(su => su.user_id);
    const roleIds = siteUsers.map(su => su.role_id);
    
    const users = await User.find({ _id: { $in: userIds } })
      .select('username email first_name last_name')
      .lean();
    const roles = await Role.find({ _id: { $in: roleIds } })
      .select('name label')
      .lean();
    
    // Map by ID for quick lookup
    const usersById = new Map(users.map(u => [u._id.toString(), u]));
    const rolesById = new Map(roles.map(r => [r._id.toString(), r]));

    // Format for the UI
    const formattedUsers = siteUsers.map((su: any) => {
      const user = usersById.get(su.user_id.toString());
      const role = rolesById.get(su.role_id.toString());
      
      return {
        id: su._id.toString(),
        user_id: user?._id?.toString() || '',
        role_id: role?._id?.toString() || '',
        username: user?.username || 'Unknown',
        email: user?.email || '',
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        role_name: role?.name || 'Unknown',
        role_display_name: role?.label || 'Unknown',
        created_at: su.assigned_at,
      };
    });

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error('Error fetching site users:', error);
    return NextResponse.json({ error: 'Failed to fetch site users' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { user_id, role_id } = await request.json();

    if (!user_id || role_id === undefined || role_id === null) {
      return NextResponse.json({ error: 'User ID and role ID are required' }, { status: 400 });
    }

    // Validate IDs
    const siteId = parseInt(params.id);
    if (!siteId || isNaN(siteId) || !/^[0-9a-fA-F]{24}$/.test(user_id) || !/^[0-9a-fA-F]{24}$/.test(role_id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    // Check if site exists
    const site = await Site.findOne({ id: siteId });
    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Check if user exists
    const user = await User.findById(user_id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if role exists
    const role = await Role.findById(role_id);
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Check if user is already assigned to this site
    const existing = await SiteUser.findOne({ 
      site_id: siteId, 
      user_id: user_id 
    });

    if (existing) {
      return NextResponse.json({ error: 'User is already assigned to this site' }, { status: 409 });
    }

    // Add user to site
    const siteUser = await SiteUser.create({
      site_id: siteId,
      user_id: user_id,
      role_id: role_id,
    });

    // Log activity
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'site_user_added' as any,
      entityType: 'site' as any,
      entityId: siteId.toString(),
      entityName: site.display_name,
      details: `Added user ${user.username} to site ${site.display_name} as ${role.label}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId: siteId,
    });

    return NextResponse.json({ 
      success: true,
      id: siteUser._id.toString(),
      message: 'User added to site successfully'
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding user to site:', error);
    if (error.code === 11000) { // MongoDB duplicate key error
      return NextResponse.json({ error: 'User is already assigned to this site' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to add user to site' }, { status: 500 });
  }
}

