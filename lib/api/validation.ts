/**
 * API Request Validation Helpers
 */

import { NextRequest } from 'next/server';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * Validate required fields in request body
 */
export function validateRequired(
  data: Record<string, any>,
  fields: string[]
): ValidationResult {
  const errors: ValidationError[] = [];

  for (const field of fields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push({
        field,
        message: `${field} is required`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate pagination parameters
 */
export function validatePagination(searchParams: URLSearchParams): {
  page: number;
  per_page: number;
  offset: number;
  errors: ValidationError[];
} {
  const errors: ValidationError[] = [];
  let page = Number.parseInt(searchParams.get('page') || '1');
  let per_page = Number.parseInt(searchParams.get('per_page') || '10');

  // Validate page
  if (Number.isNaN(page) || page < 1) {
    errors.push({
      field: 'page',
      message: 'Page must be a positive integer',
      value: searchParams.get('page'),
    });
    page = 1;
  }

  // Validate per_page
  if (Number.isNaN(per_page) || per_page < 1) {
    errors.push({
      field: 'per_page',
      message: 'per_page must be a positive integer',
      value: searchParams.get('per_page'),
    });
    per_page = 10;
  }

  // Limit per_page to 100
  if (per_page > 100) {
    errors.push({
      field: 'per_page',
      message: 'per_page cannot exceed 100',
      value: per_page,
    });
    per_page = 100;
  }

  const offset = (page - 1) * per_page;

  return { page, per_page, offset, errors };
}

/**
 * Validate sort parameters
 */
export function validateSort(
  sort: string | null,
  allowedFields: string[]
): { field: string; order: 'ASC' | 'DESC'; error?: ValidationError } | null {
  if (!sort) return null;

  let field = sort;
  let order: 'ASC' | 'DESC' = 'ASC';

  // Check for descending order (-)
  if (sort.startsWith('-')) {
    field = sort.substring(1);
    order = 'DESC';
  }

  // Validate field is allowed
  if (!allowedFields.includes(field)) {
    return {
      field: '',
      order: 'ASC',
      error: {
        field: 'sort',
        message: `Invalid sort field: ${field}. Allowed fields: ${allowedFields.join(', ')}`,
        value: sort,
      },
    };
  }

  return { field, order };
}

/**
 * Validate field selection
 */
export function validateFields(
  fields: string | null,
  allowedFields: string[]
): { fields: string[]; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  if (!fields) {
    return { fields: allowedFields, errors };
  }

  const requestedFields = fields.split(',').map((f) => f.trim());
  const validFields: string[] = [];

  for (const field of requestedFields) {
    if (allowedFields.includes(field)) {
      validFields.push(field);
    } else {
      errors.push({
        field: 'fields',
        message: `Invalid field: ${field}`,
        value: field,
      });
    }
  }

  return {
    fields: validFields.length > 0 ? validFields : allowedFields,
    errors,
  };
}

/**
 * Validate enum value
 */
export function validateEnum(
  value: any,
  field: string,
  allowedValues: string[]
): ValidationError | null {
  if (!value) return null;

  if (!allowedValues.includes(value)) {
    return {
      field,
      message: `Invalid ${field}. Allowed values: ${allowedValues.join(', ')}`,
      value,
    };
  }

  return null;
}

/**
 * Validate email format
 */
export function validateEmail(email: string, field: string = 'email'): ValidationError | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return {
      field,
      message: 'Invalid email format',
      value: email,
    };
  }

  return null;
}

/**
 * Validate URL format
 */
export function validateUrl(url: string, field: string = 'url'): ValidationError | null {
  try {
    new URL(url);
    return null;
  } catch {
    return {
      field,
      message: 'Invalid URL format',
      value: url,
    };
  }
}

/**
 * Validate date format (ISO 8601)
 */
export function validateDate(date: string, field: string = 'date'): ValidationError | null {
  const timestamp = Date.parse(date);
  
  if (Number.isNaN(timestamp)) {
    return {
      field,
      message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)',
      value: date,
    };
  }

  return null;
}

/**
 * Sanitize and validate string length
 */
export function validateStringLength(
  value: string,
  field: string,
  min?: number,
  max?: number
): ValidationError | null {
  const length = value.length;

  if (min !== undefined && length < min) {
    return {
      field,
      message: `${field} must be at least ${min} characters`,
      value: length,
    };
  }

  if (max !== undefined && length > max) {
    return {
      field,
      message: `${field} cannot exceed ${max} characters`,
      value: length,
    };
  }

  return null;
}

/**
 * Parse and validate JSON body
 */
export async function parseJsonBody<T = any>(req: NextRequest): Promise<T | null> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

