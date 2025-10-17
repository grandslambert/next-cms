import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import db from './db';
import { RowDataPacket } from 'mysql2';

interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role_id: number;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Check if input is email or username
          const [rows] = await db.query<RowDataPacket[]>(
            `SELECT u.*, r.name as role_name, r.permissions 
             FROM users u 
             LEFT JOIN roles r ON u.role_id = r.id 
             WHERE u.email = ? OR u.username = ?`,
            [credentials.email, credentials.email]
          );

          if (rows.length === 0) {
            return null;
          }

          const user = rows[0] as User & { password: string; role_name: string; permissions: string | object };
          const isValid = await bcrypt.compare(credentials.password, user.password);

          if (!isValid) {
            return null;
          }

          // Parse permissions safely
          let permissions = {};
          if (user.permissions) {
            try {
              permissions = typeof user.permissions === 'string' 
                ? JSON.parse(user.permissions) 
                : user.permissions;
            } catch (e) {
              console.error('Failed to parse permissions:', e);
              permissions = {};
            }
          }

          // Super admin gets all permissions automatically
          const isSuperAdmin = user.role_name === 'super_admin';
          if (isSuperAdmin) {
            // Create a proxy that returns true for any permission check
            permissions = new Proxy({ is_super_admin: true }, {
              get: (target, prop) => {
                // Always return true for any permission check
                return true;
              }
            });
          }

          // Determine default site for user
          let defaultSiteId = 1;
          let siteRoleId = user.role_id;
          let siteRoleName = user.role_name;
          let sitePermissions = permissions;

          if (!isSuperAdmin) {
            // Regular users: Get their first assigned site from site_users
            try {
              const [siteAssignments] = await db.query<RowDataPacket[]>(
                `SELECT su.site_id, su.role_id, r.name as role_name, r.permissions
                 FROM site_users su
                 LEFT JOIN roles r ON su.role_id = r.id
                 WHERE su.user_id = ? 
                 ORDER BY su.site_id ASC 
                 LIMIT 1`,
                [user.id]
              );
              if (siteAssignments.length > 0) {
                defaultSiteId = siteAssignments[0].site_id;
                siteRoleId = siteAssignments[0].role_id;
                siteRoleName = siteAssignments[0].role_name;
                
                // Parse site role permissions
                let basePermissions = siteAssignments[0].permissions;
                try {
                  basePermissions = typeof basePermissions === 'string' 
                    ? JSON.parse(basePermissions) 
                    : basePermissions;
                } catch (e) {
                  console.error('Failed to parse site role permissions:', e);
                  basePermissions = {};
                }
                
                // Check for site-specific role override
                const [overrideRows] = await db.query<RowDataPacket[]>(
                  `SELECT permissions FROM site_role_overrides 
                   WHERE site_id = ? AND role_id = ?`,
                  [defaultSiteId, siteRoleId]
                );
                
                // Use override if exists, otherwise use base role permissions
                if (overrideRows.length > 0) {
                  try {
                    sitePermissions = typeof overrideRows[0].permissions === 'string'
                      ? JSON.parse(overrideRows[0].permissions)
                      : overrideRows[0].permissions;
                  } catch (e) {
                    console.error('Failed to parse override permissions:', e);
                    sitePermissions = basePermissions;
                  }
                } else {
                  sitePermissions = basePermissions;
                }
              }
            } catch (error) {
              console.error('Error fetching user site assignments:', error);
              // Fall back to site 1
            }
          }
          // Super admins default to site 1

          return {
            id: user.id.toString(),
            email: user.email,
            name: `${user.first_name} ${user.last_name}`.trim() || user.username,
            role: siteRoleName || 'author',
            role_id: siteRoleId,
            permissions: sitePermissions,
            isSuperAdmin,
            currentSiteId: defaultSiteId, // Default to user's first assigned site
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as any).role;
        token.roleId = (user as any).role_id;
        token.permissions = (user as any).permissions;
        token.id = user.id;
        token.isSuperAdmin = (user as any).isSuperAdmin;
        token.currentSiteId = (user as any).currentSiteId || 1;
        token.originalUserId = (user as any).originalUserId;
        token.isSwitched = (user as any).isSwitched || false;
      }
      // Handle site switching via session update
      if (trigger === 'update' && session?.currentSiteId) {
        const newSiteId = session.currentSiteId;
        token.currentSiteId = newSiteId;
        
        // Load permissions for the new site
        const userId = Number(token.id);
        const isSuperAdmin = token.isSuperAdmin as boolean;
        
        if (!isSuperAdmin) {
          try {
            // Get user's role for the NEW SITE from site_users
            const [siteUserRows] = await db.query<RowDataPacket[]>(
              `SELECT su.role_id, r.name as role_name, r.permissions
               FROM site_users su
               LEFT JOIN roles r ON su.role_id = r.id
               WHERE su.user_id = ? AND su.site_id = ?`,
              [userId, newSiteId]
            );

            if (siteUserRows.length > 0) {
              const siteUser = siteUserRows[0];
              
              // Check for site-specific role override
              const [overrideRows] = await db.query<RowDataPacket[]>(
                `SELECT permissions FROM site_role_overrides 
                 WHERE site_id = ? AND role_id = ?`,
                [newSiteId, siteUser.role_id]
              );

              // Use override if exists, otherwise use base role permissions
              let permissions = siteUser.permissions;
              if (overrideRows.length > 0) {
                permissions = overrideRows[0].permissions;
              }

              // Update token with fresh permissions for new site
              token.role = siteUser.role_name;
              token.roleId = siteUser.role_id;
              token.permissions = typeof permissions === 'string' ? JSON.parse(permissions) : permissions;
            }
          } catch (error) {
            console.error('Error loading permissions for new site:', error);
          }
        }
      }
      // Handle user switching via session update
      if (trigger === 'update' && session?.switchData) {
        token.id = session.switchData.id;
        token.role = session.switchData.role;
        token.roleId = session.switchData.roleId;
        token.permissions = session.switchData.permissions;
        token.isSuperAdmin = session.switchData.isSuperAdmin;
        token.currentSiteId = session.switchData.currentSiteId;
        token.originalUserId = session.switchData.originalUserId;
        token.isSwitched = session.switchData.isSwitched;
      }
      // Handle permission refresh when role is updated
      if (trigger === 'update' && !session?.currentSiteId && !session?.switchData) {
        // Refresh permissions from database
        const userId = Number(token.id);
        const siteId = token.currentSiteId as number;
        
        try {
          // First check if user is super admin (global role)
          const [userRows] = await db.query<RowDataPacket[]>(
            `SELECT u.*, r.name as role_name 
             FROM users u 
             LEFT JOIN roles r ON u.role_id = r.id 
             WHERE u.id = ?`,
            [userId]
          );

          if (userRows.length > 0 && userRows[0].role_name === 'super_admin') {
            // Super admin - no permission refresh needed (has all permissions)
            token.isSuperAdmin = true;
            return token;
          }

          // Get user's role for the CURRENT SITE from site_users
          const [siteUserRows] = await db.query<RowDataPacket[]>(
            `SELECT su.role_id, r.name as role_name, r.permissions
             FROM site_users su
             LEFT JOIN roles r ON su.role_id = r.id
             WHERE su.user_id = ? AND su.site_id = ?`,
            [userId, siteId]
          );

          if (siteUserRows.length > 0) {
            const siteUser = siteUserRows[0];
            
            // Check if there's a site-specific override for this role
            const [overrideRows] = await db.query<RowDataPacket[]>(
              `SELECT permissions FROM site_role_overrides 
               WHERE site_id = ? AND role_id = ?`,
              [siteId, siteUser.role_id]
            );

            // Use override if exists, otherwise use role's base permissions
            let permissions = siteUser.permissions;
            if (overrideRows.length > 0) {
              permissions = overrideRows[0].permissions;
            }

            // Update token with fresh permissions
            token.role = siteUser.role_name;
            token.roleId = siteUser.role_id;
            token.permissions = typeof permissions === 'string' ? JSON.parse(permissions) : permissions;
            token.isSuperAdmin = false;
          }
        } catch (error) {
          console.error('Error refreshing permissions:', error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).roleId = token.roleId;
        (session.user as any).permissions = token.permissions;
        (session.user as any).id = token.id;
        (session.user as any).isSuperAdmin = token.isSuperAdmin;
        (session.user as any).currentSiteId = token.currentSiteId || 1;
        (session.user as any).originalUserId = token.originalUserId;
        (session.user as any).isSwitched = token.isSwitched || false;
      }
      return session;
    }
  },
  pages: {
    signIn: '/admin/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: Number.parseInt(process.env.SESSION_TIMEOUT || '86400'), // Default: 24 hours (in seconds)
  },
  secret: process.env.NEXTAUTH_SECRET,
};

