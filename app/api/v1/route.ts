/**
 * API v1 Root Endpoint
 * Provides API information and available endpoints
 */

import { NextRequest } from 'next/server';
import { apiSuccess } from '@/lib/api/response';
import { getCorsHeaders } from '@/lib/api/middleware';

export async function GET(req: NextRequest) {
  const baseUrl = new URL(req.url).origin;

  const apiInfo = {
    version: 'v1',
    status: 'active',
    documentation: `${baseUrl}/api/v1/docs`,
    endpoints: {
      // Authentication
      auth: {
        login: 'POST /api/v1/auth/login',
        refresh: 'POST /api/v1/auth/refresh',
        logout: 'POST /api/v1/auth/logout',
      },
      // Content
      posts: {
        list: 'GET /api/v1/posts',
        get: 'GET /api/v1/posts/:id',
        create: 'POST /api/v1/posts',
        update: 'PUT /api/v1/posts/:id',
        delete: 'DELETE /api/v1/posts/:id',
      },
      pages: {
        list: 'GET /api/v1/pages',
        get: 'GET /api/v1/pages/:id',
        create: 'POST /api/v1/pages',
        update: 'PUT /api/v1/pages/:id',
        delete: 'DELETE /api/v1/pages/:id',
      },
      // Media
      media: {
        list: 'GET /api/v1/media',
        get: 'GET /api/v1/media/:id',
        upload: 'POST /api/v1/media',
        update: 'PUT /api/v1/media/:id',
        delete: 'DELETE /api/v1/media/:id',
      },
      // Taxonomies
      taxonomies: {
        list: 'GET /api/v1/taxonomies',
        get: 'GET /api/v1/taxonomies/:slug',
      },
      terms: {
        list: 'GET /api/v1/taxonomies/:taxonomy/terms',
        get: 'GET /api/v1/taxonomies/:taxonomy/terms/:id',
        create: 'POST /api/v1/taxonomies/:taxonomy/terms',
        update: 'PUT /api/v1/taxonomies/:taxonomy/terms/:id',
        delete: 'DELETE /api/v1/taxonomies/:taxonomy/terms/:id',
      },
      // Menus
      menus: {
        list: 'GET /api/v1/menus',
        get: 'GET /api/v1/menus/:id',
        byLocation: 'GET /api/v1/menus/location/:slug',
      },
      // Users
      users: {
        list: 'GET /api/v1/users',
        get: 'GET /api/v1/users/:id',
        me: 'GET /api/v1/users/me',
        create: 'POST /api/v1/users',
        update: 'PUT /api/v1/users/:id',
        delete: 'DELETE /api/v1/users/:id',
      },
      // Settings
      settings: {
        list: 'GET /api/v1/settings',
        get: 'GET /api/v1/settings/:key',
        update: 'PUT /api/v1/settings',
      },
      // Sites (Multi-site)
      sites: {
        list: 'GET /api/v1/sites',
        get: 'GET /api/v1/sites/:id',
        create: 'POST /api/v1/sites',
        update: 'PUT /api/v1/sites/:id',
        delete: 'DELETE /api/v1/sites/:id',
      },
    },
    features: [
      'JWT Authentication',
      'API Key Authentication',
      'Rate Limiting',
      'Pagination',
      'Filtering',
      'Sorting',
      'Field Selection',
      'Resource Embedding',
      'Full-text Search',
    ],
    rate_limits: {
      default: '100 requests per hour',
      authenticated: '1000 requests per hour',
    },
  };

  const response = apiSuccess(apiInfo);
  
  // Add CORS headers
  const headers = getCorsHeaders();
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  return response;
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(req: NextRequest) {
  const headers = getCorsHeaders();
  return new Response(null, {
    status: 204,
    headers,
  });
}

