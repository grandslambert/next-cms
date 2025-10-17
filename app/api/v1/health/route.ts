/**
 * Health Check Endpoint
 * Returns API health status and system information
 */

import { NextRequest } from 'next/server';
import { apiSuccess } from '@/lib/api/response';
import { getCorsHeaders } from '@/lib/api/middleware';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  // Check database connection
  let dbStatus = 'ok';
  let dbResponseTime = 0;
  try {
    const dbStart = Date.now();
    await db.query('SELECT 1');
    dbResponseTime = Date.now() - dbStart;
  } catch (error) {
    dbStatus = 'error';
    console.error('Database health check failed:', error);
  }

  const health = {
    status: dbStatus === 'ok' ? 'healthy' : 'degraded',
    version: 'v1',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: {
        status: dbStatus,
        response_time_ms: dbResponseTime,
      },
      api: {
        status: 'ok',
        response_time_ms: Date.now() - startTime,
      },
    },
  };

  const response = apiSuccess(health);
  
  // Add CORS headers
  const headers = getCorsHeaders();
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  return response;
}

export async function OPTIONS(req: NextRequest) {
  const headers = getCorsHeaders();
  return new Response(null, {
    status: 204,
    headers,
  });
}

