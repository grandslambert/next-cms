/**
 * API Response Helpers
 * Standardized response formatting for REST API v1
 */

import { NextResponse } from 'next/server';

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    version: string;
    [key: string]: any;
  };
  links?: {
    self?: string;
    next?: string;
    prev?: string;
    first?: string;
    last?: string;
    [key: string]: string | undefined;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    field?: string;
  };
  meta?: {
    timestamp: string;
    version: string;
    request_id?: string;
  };
}

export interface PaginationMeta {
  total: number;
  count: number;
  per_page: number;
  current_page: number;
  total_pages: number;
}

/**
 * Create a successful API response
 */
export function apiSuccess<T>(
  data: T,
  status: number = 200,
  meta?: Record<string, any>,
  links?: Record<string, string>
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: 'v1',
      ...meta,
    },
  };

  if (links) {
    response.links = links;
  }

  return NextResponse.json(response, { status });
}

/**
 * Create a paginated API response
 */
export function apiSuccessPaginated<T>(
  data: T[],
  pagination: PaginationMeta,
  baseUrl: string,
  status: number = 200
): NextResponse<ApiSuccessResponse<T[]>> {
  const { current_page, total_pages, per_page } = pagination;

  // Build pagination links
  const links: Record<string, string> = {
    self: `${baseUrl}?page=${current_page}&per_page=${per_page}`,
  };

  if (current_page > 1) {
    links.prev = `${baseUrl}?page=${current_page - 1}&per_page=${per_page}`;
    links.first = `${baseUrl}?page=1&per_page=${per_page}`;
  }

  if (current_page < total_pages) {
    links.next = `${baseUrl}?page=${current_page + 1}&per_page=${per_page}`;
    links.last = `${baseUrl}?page=${total_pages}&per_page=${per_page}`;
  }

  return apiSuccess(data, status, { pagination }, links);
}

/**
 * Create an error API response
 */
export function apiError(
  code: string,
  message: string,
  status: number = 400,
  details?: any,
  field?: string
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
      ...(field && { field }),
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: 'v1',
    },
  };

  return NextResponse.json(response, { status });
}

/**
 * Common error responses
 */
export const ApiErrors = {
  // 400 Bad Request
  BAD_REQUEST: (message: string = 'Bad request', details?: any) =>
    apiError('BAD_REQUEST', message, 400, details),

  VALIDATION_ERROR: (message: string, field?: string, details?: any) =>
    apiError('VALIDATION_ERROR', message, 400, details, field),

  INVALID_QUERY: (message: string = 'Invalid query parameters', details?: any) =>
    apiError('INVALID_QUERY', message, 400, details),

  // 401 Unauthorized
  UNAUTHORIZED: (message: string = 'Authentication required') =>
    apiError('UNAUTHORIZED', message, 401),

  INVALID_TOKEN: (message: string = 'Invalid or expired token') =>
    apiError('INVALID_TOKEN', message, 401),

  MISSING_TOKEN: (message: string = 'Authentication token required') =>
    apiError('MISSING_TOKEN', message, 401),

  // 403 Forbidden
  FORBIDDEN: (message: string = 'Access denied') =>
    apiError('FORBIDDEN', message, 403),

  INSUFFICIENT_PERMISSIONS: (message: string = 'Insufficient permissions') =>
    apiError('INSUFFICIENT_PERMISSIONS', message, 403),

  // 404 Not Found
  NOT_FOUND: (resource: string = 'Resource', id?: string | number) =>
    apiError(
      'RESOURCE_NOT_FOUND',
      `${resource} not found`,
      404,
      id ? { id } : undefined
    ),

  // 409 Conflict
  CONFLICT: (message: string = 'Resource already exists') =>
    apiError('CONFLICT', message, 409),

  DUPLICATE: (field: string, value: any) =>
    apiError('DUPLICATE_VALUE', `${field} already exists`, 409, { field, value }),

  // 422 Unprocessable Entity
  UNPROCESSABLE: (message: string = 'Cannot process request') =>
    apiError('UNPROCESSABLE_ENTITY', message, 422),

  // 429 Too Many Requests
  RATE_LIMITED: (message: string = 'Too many requests', retryAfter?: number) =>
    apiError('RATE_LIMIT_EXCEEDED', message, 429, retryAfter ? { retry_after: retryAfter } : undefined),

  // 500 Internal Server Error
  INTERNAL_ERROR: (message: string = 'Internal server error') =>
    apiError('INTERNAL_ERROR', message, 500),

  DATABASE_ERROR: (message: string = 'Database error') =>
    apiError('DATABASE_ERROR', message, 500),

  // 503 Service Unavailable
  SERVICE_UNAVAILABLE: (message: string = 'Service temporarily unavailable') =>
    apiError('SERVICE_UNAVAILABLE', message, 503),
};

/**
 * Handle API errors consistently
 */
export function handleApiError(error: any): NextResponse<ApiErrorResponse> {
  console.error('API Error:', error);

  // Database errors
  if (error.code === 'ER_DUP_ENTRY') {
    return ApiErrors.DUPLICATE('field', error.sqlMessage || 'Duplicate entry');
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    return ApiErrors.VALIDATION_ERROR(error.message, error.field, error.details);
  }

  // Default to internal error
  return ApiErrors.INTERNAL_ERROR(
    process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
  );
}

