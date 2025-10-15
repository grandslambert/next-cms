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
        return !!token;
      }
      
      return true;
    },
  },
});

export const config = {
  matcher: ['/admin/:path*'],
};

