/**
 * Single Site Setting API Endpoints
 * 
 * Handles operations on individual site-specific settings.
 * 
 * @requires manage_settings permission (or is_super_admin)
 */

import { NextRequest } from 'next/server';
import { 
  apiSuccess, 
  ApiErrors 
} from '@/lib/api/response';
import { authenticate } from '@/lib/api/auth-middleware';
import db from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';

/**
 * GET /api/v1/settings/site/:key
 * 
 * Get a single site setting by key
 * 
 * @requires manage_settings permission (or is_super_admin)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    // Authenticate
    const auth = await authenticate(request);
    if (!auth) {
      return ApiErrors.UNAUTHORIZED();
    }

    // Check permission
    if (!auth.user.permissions.manage_settings && !auth.user.permissions.is_super_admin) {
      return ApiErrors.FORBIDDEN('You do not have permission to manage settings');
    }

    const siteId = auth.user.siteId;
    const settingKey = decodeURIComponent(params.key);

    // Get setting
    const [settingRows] = await db.query(
      `SELECT id, setting_key, setting_value, setting_type, created_at, updated_at
       FROM site_${siteId}_settings WHERE setting_key = ?`,
      [settingKey]
    );

    const setting = (settingRows as any[])[0];
    if (!setting) {
      return ApiErrors.NOT_FOUND('Setting not found');
    }

    // Parse setting value based on type
    let parsed_value = setting.setting_value;
    try {
      if (setting.setting_type === 'boolean') {
        parsed_value = setting.setting_value === '1' || setting.setting_value === 'true';
      } else if (setting.setting_type === 'number') {
        parsed_value = Number.parseFloat(setting.setting_value);
      } else if (setting.setting_type === 'json') {
        parsed_value = JSON.parse(setting.setting_value);
      }
    } catch {
      // If parsing fails, keep the original string value
    }

    return apiSuccess({
      ...setting,
      parsed_value
    });

  } catch (error: any) {
    console.error(`Error in GET /api/v1/settings/site/${params.key}:`, error);
    return ApiErrors.INTERNAL_ERROR(error.message);
  }
}

/**
 * PUT /api/v1/settings/site/:key
 * 
 * Update or create a site setting
 * 
 * Request Body:
 * - setting_value: any (required) - The new value for the setting
 * - setting_type: string (optional) - The type of setting (string, number, boolean, json)
 * 
 * @requires manage_settings permission (or is_super_admin)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    // Authenticate
    const auth = await authenticate(request);
    if (!auth) {
      return ApiErrors.UNAUTHORIZED();
    }

    // Check permission
    if (!auth.user.permissions.manage_settings && !auth.user.permissions.is_super_admin) {
      return ApiErrors.FORBIDDEN('You do not have permission to manage settings');
    }

    const siteId = auth.user.siteId;
    const settingKey = decodeURIComponent(params.key);

    // Parse body
    const body = await request.json();

    if (body.setting_value === undefined) {
      return ApiErrors.VALIDATION_ERROR('setting_value is required', 'setting_value');
    }

    // Check if setting exists
    const [existingRows] = await db.query(
      `SELECT id, setting_key, setting_value, setting_type FROM site_${siteId}_settings WHERE setting_key = ?`,
      [settingKey]
    );

    const existing = (existingRows as any[])[0];
    
    // Determine setting type
    const settingType = body.setting_type || existing?.setting_type || 'string';

    // Convert value to string based on type
    let stringValue: string;
    if (settingType === 'boolean') {
      stringValue = body.setting_value ? '1' : '0';
    } else if (settingType === 'json') {
      stringValue = typeof body.setting_value === 'string' 
        ? body.setting_value 
        : JSON.stringify(body.setting_value);
    } else {
      stringValue = String(body.setting_value);
    }

    if (existing) {
      // Update existing setting
      await db.query(
        `UPDATE site_${siteId}_settings SET setting_value = ?, setting_type = ? WHERE setting_key = ?`,
        [stringValue, settingType, settingKey]
      );
    } else {
      // Create new setting
      await db.query(
        `INSERT INTO site_${siteId}_settings (setting_key, setting_value, setting_type) VALUES (?, ?, ?)`,
        [settingKey, stringValue, settingType]
      );
    }

    // Get updated/created setting
    const [updatedRows] = await db.query(
      `SELECT id, setting_key, setting_value, setting_type, created_at, updated_at
       FROM site_${siteId}_settings WHERE setting_key = ?`,
      [settingKey]
    );
    const updated = (updatedRows as any[])[0];

    // Parse setting value for response
    let parsed_value = updated.setting_value;
    try {
      if (updated.setting_type === 'boolean') {
        parsed_value = updated.setting_value === '1' || updated.setting_value === 'true';
      } else if (updated.setting_type === 'number') {
        parsed_value = Number.parseFloat(updated.setting_value);
      } else if (updated.setting_type === 'json') {
        parsed_value = JSON.parse(updated.setting_value);
      }
    } catch (error) {
      parsed_value = updated.setting_value;
    }

    // Log activity
    await logActivity({
      userId: auth.user.id,
      action: 'settings_updated',
      entityType: 'settings',
      entityId: updated.id,
      entityName: settingKey,
      details: { 
        setting_key: settingKey,
        old_value: existing?.setting_value || null,
        new_value: stringValue,
        site_id: siteId
      },
      siteId
    });

    return apiSuccess({
      ...updated,
      parsed_value
    }, existing ? 200 : 201, { message: existing ? 'Setting updated successfully' : 'Setting created successfully' });

  } catch (error: any) {
    console.error(`Error in PUT /api/v1/settings/site/${params.key}:`, error);
    return ApiErrors.INTERNAL_ERROR(error.message);
  }
}

/**
 * PATCH /api/v1/settings/site/:key
 * 
 * Partially update a site setting (alias for PUT in this case)
 * 
 * Request Body:
 * - setting_value: any (optional) - The new value for the setting
 * - setting_type: string (optional) - The type of setting
 * 
 * @requires manage_settings permission (or is_super_admin)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  // For settings, PATCH behaves the same as PUT
  return PUT(request, { params });
}

/**
 * OPTIONS /api/v1/settings/site/:key
 * 
 * Handle preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

