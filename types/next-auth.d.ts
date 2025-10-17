import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      permissions?: Record<string, boolean>;
      isSuperAdmin?: boolean;
      currentSiteId?: number;
      originalUserId?: string;
      isSwitched?: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    permissions?: Record<string, boolean>;
    isSuperAdmin?: boolean;
    currentSiteId?: number;
    originalUserId?: string;
    isSwitched?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    permissions?: Record<string, boolean>;
    isSuperAdmin?: boolean;
    currentSiteId?: number;
    originalUserId?: string;
    isSwitched?: boolean;
  }
}

