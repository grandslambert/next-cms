import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      username?: string;
      first_name?: string;
      last_name?: string;
      role: string;
      roleId?: string;
      permissions?: Record<string, boolean>;
      isSuperAdmin?: boolean;
      currentSiteId?: string;
      originalUserId?: string;
      isSwitched?: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    username?: string;
    first_name?: string;
    last_name?: string;
    role: string;
    roleId?: string;
    permissions?: Record<string, boolean>;
    isSuperAdmin?: boolean;
    currentSiteId?: string;
    originalUserId?: string;
    isSwitched?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email?: string;
    name?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
    role: string;
    roleId?: string;
    permissions?: Record<string, boolean>;
    isSuperAdmin?: boolean;
    currentSiteId?: string;
    originalUserId?: string;
    isSwitched?: boolean;
  }
}

