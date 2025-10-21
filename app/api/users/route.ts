import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import connectDB from '@/lib/mongodb';
import { User, SiteUser } from '@/lib/models';
import bcrypt from 'bcryptjs';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = (session.user as any)?.isSuperAdmin || false;
    const currentSiteIdStr = (session.user as any)?.currentSiteId;
    
    // Convert string ID to ObjectId if it's a valid 24-character hex string
    let currentSiteId = null;
    if (currentSiteIdStr && typeof currentSiteIdStr === 'string' && /^[0-9a-fA-F]{24}$/.test(currentSiteIdStr)) {
      currentSiteId = mongoose.Types.ObjectId.createFromHexString(currentSiteIdStr);
    }

    let users;

    if (isSuperAdmin) {
      // Super admin sees all users with their site assignments
      users = await User.find()
        .populate('role', 'name label permissions')
        .select('-password')
        .sort({ created_at: -1 })
        .lean();
      
      // Fetch site assignments for each user and map _id to id
      for (const user of users) {
        try {
          const siteAssignments = await SiteUser.find({ user_id: user._id })
            .populate('site_id', 'name display_name')
            .populate('role_id', 'name label')
            .lean();
          
          (user as any).id = user._id.toString(); // Add id field for compatibility
          (user as any).role_name = (user.role as any)?.name;
          (user as any).role_display_name = (user.role as any)?.label;
          (user as any).sites = siteAssignments.map(sa => ({
            id: (sa.site_id as any)?._id?.toString(),
            name: (sa.site_id as any)?.name,
            display_name: (sa.site_id as any)?.display_name,
            role_id: (sa.role_id as any)?._id?.toString(),
            role_display_name: (sa.role_id as any)?.label,
          }));
        } catch (error) {
          console.error('Error fetching site assignments for user:', user._id, error);
          (user as any).id = user._id.toString();
          (user as any).role_name = (user.role as any)?.name;
          (user as any).role_display_name = (user.role as any)?.label;
          (user as any).sites = [];
        }
      }
    } else {
      // Site admins only see users assigned to their current site
      if (!currentSiteId) {
        return NextResponse.json({ users: [] });
      }
      const siteAssignments = await SiteUser.find({ site_id: currentSiteId })
        .populate({
          path: 'user_id',
          populate: { path: 'role', select: 'name label permissions' }
        })
        .populate('role_id', 'name label')
        .lean();
      
      users = siteAssignments.map(sa => {
        const user = sa.user_id as any;
        return {
          ...user,
          id: user._id.toString(),
          role_name: user.role?.name,
          role_display_name: user.role?.label,
          sites: [{
            id: currentSiteId.toString(),
            role_id: (sa.role_id as any)?._id?.toString(),
            role_display_name: (sa.role_id as any)?.label,
          }]
        };
      });
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    const isSuperAdmin = (session?.user as any)?.isSuperAdmin || false;
    const hasPermission = (session?.user as any)?.permissions?.manage_users || false;
    
    if (!session?.user || (!isSuperAdmin && !hasPermission)) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const body = await request.json();
    const { username, first_name, last_name, email, password, role_id, sites } = body;

    if (!username || !first_name || !email || !password || !role_id) {
      return NextResponse.json({ 
        error: 'Username, first name, email, password, and role are required' 
      }, { status: 400 });
    }

    // Validate password (basic validation)
    if (password.length < 8) {
      return NextResponse.json({ 
        error: 'Password must be at least 8 characters long' 
      }, { status: 400 });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }] 
    });
    
    if (existingUser) {
      return NextResponse.json({ 
        error: existingUser.username === username 
          ? 'Username already exists' 
          : 'Email already exists' 
      }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Validate and convert role_id to ObjectId BEFORE using it
    if (!role_id || !/^[0-9a-fA-F]{24}$/.test(role_id)) {
      return NextResponse.json({ error: 'Invalid role ID format' }, { status: 400 });
    }

    // Validate role exists
    const role = await mongoose.model('Role').findById(role_id);
    if (!role) {
      return NextResponse.json({ 
        error: 'Invalid role selected' 
      }, { status: 400 });
    }

    // Check if this is a super admin role
    const isSuperAdminRole = (role as any).name === 'super_admin';

    // Create user
    const newUser = await User.create({
      username,
      first_name,
      last_name,
      email,
      password: hashedPassword,
      role: mongoose.Types.ObjectId.createFromHexString(role_id),
      is_super_admin: isSuperAdminRole,
      status: 'active',
    });

    // Site assignment logic
    // Users are ONLY assigned to sites if explicitly specified in the sites array
    // NO automatic site assignments - not even for current site
    const sitesToAssign: any[] = sites && sites.length > 0 ? sites : [];
    
    console.log('Sites to assign:', sitesToAssign);

    for (const siteAssignment of sitesToAssign) {
      try {
        // Convert IDs to ObjectIds if they're valid hex strings
        let assignmentSiteId = siteAssignment.site_id;
        if (typeof siteAssignment.site_id === 'string' && /^[0-9a-fA-F]{24}$/.test(siteAssignment.site_id)) {
          assignmentSiteId = mongoose.Types.ObjectId.createFromHexString(siteAssignment.site_id);
        }
        
        const assignmentRoleId = siteAssignment.role_id || role_id;
        let assignmentRoleObjId = assignmentRoleId;
        if (typeof assignmentRoleId === 'string' && /^[0-9a-fA-F]{24}$/.test(assignmentRoleId)) {
          assignmentRoleObjId = mongoose.Types.ObjectId.createFromHexString(assignmentRoleId);
        }
          
        await SiteUser.create({
          site_id: assignmentSiteId,
          user_id: newUser._id,
          role_id: assignmentRoleObjId,
        });
      } catch (siteError: any) {
        console.error('Failed to add user to site:', siteError);
        // Delete the user we just created since site assignment failed
        await User.findByIdAndDelete(newUser._id);
        return NextResponse.json({ 
          error: 'Failed to add user to site: ' + (siteError.message || 'Unknown error')
        }, { status: 500 });
      }
    }

    // Log activity
    const userId = (session.user as any).id;
    const currentSiteId = (session.user as any).currentSiteId;
    await logActivity({
      userId,
      action: 'user_created',
      entityType: 'user',
      entityId: newUser._id.toString(),
      entityName: username,
      details: `Created user: ${username} (${email})`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      siteId: currentSiteId || undefined,
    });

    // Return user without password
    const userResponse = await User.findById(newUser._id)
      .populate('role', 'name label permissions')
      .select('-password')
      .lean();

    // Add id field for compatibility
    const responseUser = {
      ...userResponse,
      id: userResponse?._id.toString(),
      role_name: (userResponse?.role as any)?.name,
      role_display_name: (userResponse?.role as any)?.label,
    };

    return NextResponse.json({ user: responseUser }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
