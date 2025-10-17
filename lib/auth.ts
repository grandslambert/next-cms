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
          if (!isSuperAdmin) {
            // Regular users: Get their first assigned site from site_users
            try {
              const [siteAssignments] = await db.query<RowDataPacket[]>(
                'SELECT site_id FROM site_users WHERE user_id = ? ORDER BY site_id ASC LIMIT 1',
                [user.id]
              );
              if (siteAssignments.length > 0) {
                defaultSiteId = siteAssignments[0].site_id;
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
            role: user.role_name || 'author',
            permissions,
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
        token.permissions = (user as any).permissions;
        token.id = user.id;
        token.isSuperAdmin = (user as any).isSuperAdmin;
        token.currentSiteId = (user as any).currentSiteId || 1;
        token.originalUserId = (user as any).originalUserId;
        token.isSwitched = (user as any).isSwitched || false;
      }
      // Handle site switching via session update
      if (trigger === 'update' && session?.currentSiteId) {
        token.currentSiteId = session.currentSiteId;
      }
      // Handle user switching via session update
      if (trigger === 'update' && session?.switchData) {
        token.id = session.switchData.id;
        token.role = session.switchData.role;
        token.permissions = session.switchData.permissions;
        token.isSuperAdmin = session.switchData.isSuperAdmin;
        token.currentSiteId = session.switchData.currentSiteId;
        token.originalUserId = session.switchData.originalUserId;
        token.isSwitched = session.switchData.isSwitched;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
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

