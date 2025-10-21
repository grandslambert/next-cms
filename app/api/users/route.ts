import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-mongo';
import { GlobalModels } from '@/lib/model-factory';
import bcrypt from 'bcryptjs';
import { logActivity, getClientIp, getUserAgent } from '@/lib/activity-logger';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const User = await GlobalModels.User();
    const SiteUser = await GlobalModels.SiteUser();
    
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
      const Role = await GlobalModels.Role();
      const Site = await GlobalModels.Site();
      
      users = await User.find()
        .select('-password')
        .sort({ created_at: -1 })
        .lean();
      
      // Get all roles for lookup
      const allRoles = await Role.find().lean();
      const rolesById = new Map(allRoles.map(r => [r._id.toString(), r]));
      
      // Fetch site assignments for each user and map _id to id
      for (const user of users) {
        try {
          const siteAssignments = await SiteUser.find({ user_id: user._id }).lean();
          
          // Get unique site and role IDs from assignments
          const siteIds = siteAssignments.map(sa => sa.site_id);
          const assignmentRoleIds = siteAssignments.map(sa => sa.role_id);
          
          // Fetch related sites and roles
          const relatedSites = await Site.find({ id: { $in: siteIds } }).lean() as any[];
          const assignmentRoles = await Role.find({ _id: { $in: assignmentRoleIds } }).lean() as any[];
          
          // Map by ID
          const sitesById = new Map(relatedSites.map(s => [s.id.toString(), s]));
          const assignmentRolesById = new Map(assignmentRoles.map(r => [r._id.toString(), r]));
          
          const userRole = rolesById.get(user.role.toString());
          
          (user as any).id = user._id.toString();
          (user as any).role_name = userRole?.name || 'Unknown';
          (user as any).role_display_name = userRole?.label || 'Unknown';
          (user as any).sites = siteAssignments.map(sa => {
            const site = sitesById.get(sa.site_id.toString());
            const role = assignmentRolesById.get(sa.role_id.toString());
            
            return {
              id: site?.id || '',
              name: site?.name || 'Unknown',
              display_name: site?.display_name || 'Unknown',
              role_id: role?._id?.toString() || '',
              role_display_name: role?.label || 'Unknown',
            };
          });
        } catch (error) {
          console.error('Error fetching site assignments for user:', user._id, error);
          const userRole = rolesById.get(user.role.toString());
          (user as any).id = user._id.toString();
          (user as any).role_name = userRole?.name || 'Unknown';
          (user as any).role_display_name = userRole?.label || 'Unknown';
          (user as any).sites = [];
        }
      }
    } else {
      // Site admins only see users assigned to their current site
      if (!currentSiteId) {
        return NextResponse.json({ users: [] });
      }
      
      const Role = await GlobalModels.Role();
      const siteAssignments = await SiteUser.find({ site_id: currentSiteId }).lean();
      
      // Get all user IDs and role IDs
      const userIds = siteAssignments.map(sa => sa.user_id);
      const assignmentRoleIds = siteAssignments.map(sa => sa.role_id);
      
      // Fetch users and roles
      const relatedUsers = await User.find({ _id: { $in: userIds } }).select('-password').lean();
      const assignmentRoles = await Role.find({ _id: { $in: assignmentRoleIds } }).lean();
      
      // Get user role IDs for their global roles
      const userRoleIds = relatedUsers.map(u => u.role);
      const userRoles = await Role.find({ _id: { $in: userRoleIds } }).lean();
      
      // Map by ID
      const usersById = new Map(relatedUsers.map(u => [u._id.toString(), u]));
      const rolesById = new Map(userRoles.map(r => [r._id.toString(), r]));
      const assignmentRolesById = new Map(assignmentRoles.map(r => [r._id.toString(), r]));
      
      users = siteAssignments.map(sa => {
        const user = usersById.get(sa.user_id.toString());
        if (!user) return null;
        
        const userRole = rolesById.get(user.role.toString());
        const assignmentRole = assignmentRolesById.get(sa.role_id.toString());
        
        return {
          ...user,
          id: user._id.toString(),
          role_name: userRole?.name || 'Unknown',
          role_display_name: userRole?.label || 'Unknown',
          sites: [{
            id: currentSiteId.toString(),
            role_id: assignmentRole?._id?.toString() || '',
            role_display_name: assignmentRole?.label || 'Unknown',
          }]
        };
      }).filter(u => u !== null);
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const User = await GlobalModels.User();
    const SiteUser = await GlobalModels.SiteUser();
    
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
    const Role = await GlobalModels.Role();
    const role = await Role.findById(role_id);
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
        // site_id is now a number (site.id), not ObjectId
        const assignmentSiteId = parseInt(siteAssignment.site_id);
        
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

    // Log activity (NO siteId - user creation is a global action)
    const userId = (session.user as any).id;
    await logActivity({
      userId,
      action: 'user_created',
      entityType: 'user',
      entityId: newUser._id.toString(),
      entityName: username,
      details: `Created user: ${username} (${email})`,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      // NO siteId - this logs to global database
    });

    // Return user without password
    const userResponse = await User.findById(newUser._id)
      .select('-password')
      .lean();

    // Manually fetch role (Role already declared above)
    const userRole = await Role.findById(userResponse?.role);

    // Add id field for compatibility
    const responseUser = {
      ...userResponse,
      id: userResponse?._id.toString(),
      role_name: userRole?.name || 'Unknown',
      role_display_name: userRole?.label || 'Unknown',
    };

    return NextResponse.json({ user: responseUser }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
