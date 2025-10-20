import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { connectDB } from '@/lib/db';
import { Role, User } from '@/lib/models';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = (session.user as any)?.isSuperAdmin || false;
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid role ID' }, { status: 400 });
    }

    await connectDB();

    const role = await Role.findById(params.id);

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Convert to plain object and format permissions
    const roleObj = role.toObject();
    const formattedRole = {
      ...roleObj,
      id: roleObj._id.toString(),
      permissions: roleObj.permissions ? Object.fromEntries(roleObj.permissions) : {},
    };

    return NextResponse.json({ role: formattedRole });
  } catch (error) {
    console.error('Error fetching role:', error);
    return NextResponse.json({ error: 'Failed to fetch role' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = (session.user as any)?.isSuperAdmin || false;
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid role ID' }, { status: 400 });
    }

    const body = await request.json();
    const { display_name, description, permissions } = body;

    if (!display_name) {
      return NextResponse.json({ error: 'display_name is required' }, { status: 400 });
    }

    await connectDB();

    // Get current role for logging
    const currentRole = await Role.findById(params.id).lean();

    if (!currentRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Update role
    const updatedRole = await Role.findByIdAndUpdate(
      params.id,
      {
        display_name,
        description: description || '',
        permissions: permissions ? new Map(Object.entries(permissions)) : new Map(),
      },
      { new: true }
    );

    // Log activity
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'role_updated' as any,
      entityType: 'role' as any,
      entityId: params.id,
      entityName: display_name,
      details: `Updated role: ${display_name}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId: null,
    });

    // Format response
    const roleObj = updatedRole?.toObject();
    const formattedRole = {
      ...roleObj,
      id: roleObj?._id.toString(),
      permissions: roleObj?.permissions ? Object.fromEntries(roleObj.permissions) : {},
    };

    return NextResponse.json({ role: formattedRole });
  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = (session.user as any)?.isSuperAdmin || false;
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid role ID' }, { status: 400 });
    }

    await connectDB();

    const role = await Role.findById(params.id).lean();

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Check if role is built-in
    if (role.is_builtin) {
      return NextResponse.json(
        { error: 'Cannot delete built-in role' },
        { status: 400 }
      );
    }

    // Check if any users have this role
    const userCount = await User.countDocuments({ role: new mongoose.Types.ObjectId(params.id) });

    if (userCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete role with assigned users' },
        { status: 400 }
      );
    }

    // Log activity before deleting
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'role_deleted' as any,
      entityType: 'role' as any,
      entityId: params.id,
      entityName: role.display_name,
      details: `Deleted role: ${role.display_name}`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId: null,
    });

    await Role.findByIdAndDelete(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting role:', error);
    return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
  }
}
