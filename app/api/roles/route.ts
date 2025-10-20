import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import connectDB from '@/lib/mongodb';
import { Role } from '@/lib/models';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';

export async function GET() {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = (session.user as any)?.isSuperAdmin || false;
    
    // Get all roles (in MongoDB, all roles are global)
    const roles = await Role.find()
      .sort({ name: 1 });

    // Format roles for the UI - convert _id to id and Map to object
    const formattedRoles = roles.map(role => {
      const roleObj = role.toObject();
      
      // Convert Map to plain object for permissions
      const permissionsObj = roleObj.permissions instanceof Map 
        ? Object.fromEntries(roleObj.permissions)
        : (roleObj.permissions || {});
      
      return {
        id: roleObj._id.toString(),
        name: roleObj.name,
        label: roleObj.label,
        display_name: roleObj.label, // For UI compatibility
        permissions: permissionsObj,
        is_system: true, // All default roles are system roles
        created_at: roleObj.created_at,
        updated_at: roleObj.updated_at,
      };
    });

    return NextResponse.json({ roles: formattedRoles });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, label, description, permissions } = body;

    if (!name || !label || !permissions) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const isSuperAdmin = (session.user as any)?.isSuperAdmin || false;
    
    // Only super admins can create roles
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 });
    }

    // Check if role name already exists
    const existing = await Role.findOne({ name });
    if (existing) {
      return NextResponse.json({ error: 'Role with this name already exists' }, { status: 400 });
    }

    // Convert permissions object to Map
    const permissionsMap = new Map(Object.entries(permissions));

    const newRole = await Role.create({
      name,
      label,
      description: description || '',
      permissions: permissionsMap,
    });

    // Log activity
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'role_created',
      entityType: 'role',
      entityId: newRole._id.toString(),
      entityName: label,
      details: `Created role: ${label} (${name})`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    const roleObj = newRole.toObject();
    return NextResponse.json({ 
      id: newRole._id.toString(),
      name: newRole.name,
      label: newRole.label,
      description: roleObj.description || '',
      permissions: roleObj.permissions instanceof Map 
        ? Object.fromEntries(roleObj.permissions)
        : (roleObj.permissions || {}),
      is_system: false,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating role:', error);
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
  }
}
