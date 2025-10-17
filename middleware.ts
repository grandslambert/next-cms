import { withAuth } from 'next-auth/middleware';

// Protect admin routes except login page
export default withAuth({
  callbacks: {
    authorized({ req, token }) {
      const path = req.nextUrl.pathname;
      
      // Allow access to login page
      if (path === '/admin/login') {
        return true;
      }
      
      // All other /admin/* routes require authentication
      if (path.startsWith('/admin')) {
        // Block guests from accessing admin (they have no dashboard access)
        if (token && (token as any).role === 'guest') {
          return false;
        }
        return !!token;
      }
      
      return true;
    },
  },
});

export const config = {
  matcher: ['/admin/:path*'],
};

