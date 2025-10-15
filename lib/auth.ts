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
          const [rows] = await db.query<RowDataPacket[]>(
            `SELECT u.*, r.name as role_name, r.permissions 
             FROM users u 
             LEFT JOIN roles r ON u.role_id = r.id 
             WHERE u.email = ?`,
            [credentials.email]
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

          return {
            id: user.id.toString(),
            email: user.email,
            name: `${user.first_name} ${user.last_name}`.trim() || user.username,
            role: user.role_name || 'author',
            permissions,
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
        token.role = (user as any).role;
        token.permissions = (user as any).permissions;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).permissions = token.permissions;
        (session.user as any).id = token.id;
      }
      return session;
    }
  },
  pages: {
    signIn: '/admin/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: parseInt(process.env.SESSION_TIMEOUT || '86400'), // Default: 24 hours (in seconds)
  },
  secret: process.env.NEXTAUTH_SECRET,
};

