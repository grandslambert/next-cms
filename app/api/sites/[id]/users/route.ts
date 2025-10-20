import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import connectDB from '@/lib/mongodb';
import { SiteUser, User, Role, Site } from '@/lib/models';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';
import mongoose from 'mongoose';

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

    const isSuperAdmin = (session.user as any)?.isSuperAdmin;
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 });
    }

    // Validate site ID
    if (!params.id || !/^[0-9a-fA-F]{24}$/.test(params.id)) {
      return NextResponse.json({ error: 'Invalid site ID' }, { status: 400 });
    }

    // Get all users assigned to this site with their roles
    const siteUsers = await SiteUser.find({ site_id: params.id })
      .populate({
        path: 'user_id',
        select: 'username email first_name last_name'
      })
      .populate({
        path: 'role_id',
        select: 'name label'
      })
      .sort({ 'user_id.username': 1 })
      .lean();

    // Format for the UI
    const formattedUsers = siteUsers.map((su: any) => ({
      id: su._id.toString(),
      user_id: su.user_id?._id?.toString(),
      role_id: su.role_id?._id?.toString(),
      username: su.user_id?.username,
      email: su.user_id?.email,
      first_name: su.user_id?.first_name,
      last_name: su.user_id?.last_name,
      role_name: su.role_id?.name,
      role_display_name: su.role_id?.label,
      created_at: su.assigned_at,
    }));

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
    await connectDB();
    
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
    if (!/^[0-9a-fA-F]{24}$/.test(params.id) || !/^[0-9a-fA-F]{24}$/.test(user_id) || !/^[0-9a-fA-F]{24}$/.test(role_id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    // Check if site exists
    const site = await Site.findById(params.id);
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
      site_id: params.id, 
      user_id: user_id 
    });

    if (existing) {
      return NextResponse.json({ error: 'User is already assigned to this site' }, { status: 409 });
    }

    // Add user to site
    const siteUser = await SiteUser.create({
      site_id: params.id,
      user_id: user_id,
      role_id: role_id,
    });

    // Log activity
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'site_user_added' as any,
      entityType: 'site' as any,
      entityId: params.id,
      entityName: site.display_name,
      details: `Added user ${user.username} to site ${site.display_name} as ${role.label}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId: params.id,
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

