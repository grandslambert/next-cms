import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectDB from './mongodb';
import { User, Site, SiteUser } from './models';

interface AuthUser {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  isSuperAdmin: boolean;
  permissions: Record<string, boolean>;
  currentSiteId?: string;
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
          // Connect to MongoDB
          await connectDB();

          // Find user by email or username and populate role
          const user = await User.findOne({
            $or: [
              { email: credentials.email },
              { username: credentials.email }
            ]
          }).populate('role');

          if (!user) {
            return null;
          }

          // Check if user is active
          if (user.status !== 'active') {
            return null;
          }

          // Verify password
          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) {
            return null;
          }

          // Get role and permissions
          const role = user.role as any; // Already populated
          const permissions = role?.permissions ? Object.fromEntries(role.permissions) : {};

          // Get user's sites - get the default site for now
          let currentSiteId: string | undefined;
          if (!user.is_super_admin) {
            const siteAssignment = await SiteUser.findOne({ user_id: user._id }).populate('site_id');
            if (siteAssignment && siteAssignment.site_id) {
              currentSiteId = (siteAssignment.site_id as any)._id.toString();
            }
          } else {
            // Super admin gets the first/default site
            const defaultSite = await Site.findOne({ name: 'default' });
            currentSiteId = defaultSite?._id.toString();
          }

          // Update last login
          user.last_login = new Date();
          await user.save();

          return {
            id: user._id.toString(),
            name: user.username,
            email: user.email,
            username: user.username,
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            role: role?.name || 'subscriber',
            isSuperAdmin: user.is_super_admin,
            permissions,
            currentSiteId,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
        token.first_name = (user as any).first_name;
        token.last_name = (user as any).last_name;
        token.role = (user as any).role;
        token.isSuperAdmin = (user as any).isSuperAdmin;
        token.permissions = (user as any).permissions;
        token.currentSiteId = (user as any).currentSiteId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).username = token.username;
        (session.user as any).first_name = token.first_name;
        (session.user as any).last_name = token.last_name;
        (session.user as any).role = token.role;
        (session.user as any).isSuperAdmin = token.isSuperAdmin;
        (session.user as any).permissions = token.permissions;
        (session.user as any).currentSiteId = token.currentSiteId;
      }
      return session;
    }
  },
  pages: {
    signIn: '/admin/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

