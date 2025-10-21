#!/usr/bin/env node
/**
 * SuperAdmin API Test Suite for MongoDB
 * Tests Sites, Users, and Roles endpoints
 */

require('dotenv').config();

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_USER = process.env.TEST_USER || 'superadmin';
const TEST_PASS = process.env.TEST_PASS || 'SuperAdmin123!';

let testsPassed = 0;
let testsFailed = 0;
let cookies = '';
let testSiteId = null;
let testUserId = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  gray: '\x1b[90m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name) {
  console.log(`\n${colors.yellow}[ TEST ]${colors.reset} ${name}`);
}

function logPass(message) {
  testsPassed++;
  log(`[  OK  ] ${message}`, 'green');
}

function logFail(message, error) {
  testsFailed++;
  log(`[ FAIL ] ${message}`, 'red');
  if (error) log(`  Error: ${error.message || error}`, 'gray');
}

async function makeRequest(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(cookies && { Cookie: cookies }),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Capture cookies from response
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    cookies = setCookie.split(',').map(c => c.split(';')[0]).join('; ');
  }

  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return { response, data };
}

// ============================================
// 1. AUTHENTICATION
// ============================================
async function testAuthentication() {
  log('\n========================================', 'cyan');
  log('1. AUTHENTICATION', 'cyan');
  log('========================================', 'cyan');

  logTest('Get CSRF token');
  let csrfToken;
  try {
    // First, get the CSRF token
    const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
    const csrfData = await csrfResponse.json();
    csrfToken = csrfData.csrfToken;
    
    log(`  CSRF token: ${csrfToken.substring(0, 20)}...`, 'gray');
  } catch (error) {
    logFail('Get CSRF token', error);
    throw error;
  }

  logTest('Login as SuperAdmin');
  try {
    // NextAuth signin with CSRF protection
    const formData = new URLSearchParams({
      csrfToken: csrfToken,
      email: TEST_USER,
      password: TEST_PASS,
      callbackUrl: `${BASE_URL}/admin`,
      json: 'true',
    });

    const response = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      redirect: 'manual', // Don't follow redirects
    });

    // Capture all cookies (Node 18+ fetch has getSetCookie method)
    if (typeof response.headers.getSetCookie === 'function') {
      const allCookies = response.headers.getSetCookie();
      cookies = allCookies.map(c => c.split(';')[0]).join('; ');
    } else {
      // Fallback for older Node versions
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        cookies = setCookie.split(',').map(c => c.split(';')[0]).join('; ');
      }
    }

    // NextAuth returns 302 redirect on success
    if (response.status === 302 || response.status === 200) {
      if (cookies) {
        logPass(`Logged in as ${TEST_USER}`);
        log(`  Cookies: ${cookies.substring(0, 80)}...`, 'gray');
      } else {
        throw new Error('Login succeeded but no session cookie received');
      }
    } else {
      const text = await response.text();
      throw new Error(`Login failed - HTTP ${response.status}: ${text.substring(0, 200)}`);
    }
  } catch (error) {
    logFail('Login failed', error);
    throw error; // Can't continue without auth
  }
}

// ============================================
// 2. SITES API
// ============================================
async function testSitesAPI() {
  log('\n========================================', 'cyan');
  log('2. SITES API', 'cyan');
  log('========================================', 'cyan');

  logTest('GET /api/sites - List all sites');
  try {
    const { response, data } = await makeRequest('/api/sites');
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (!data.sites || !Array.isArray(data.sites)) throw new Error('Invalid response format');
    if (data.sites.length === 0) throw new Error('No sites returned');
    
    logPass(`Listed ${data.sites.length} site(s)`);
    log(`  First site: ${data.sites[0].display_name} (ID: ${data.sites[0].id})`, 'gray');
  } catch (error) {
    logFail('List sites', error);
  }

  logTest('POST /api/sites - Create new site');
  try {
    const timestamp = Date.now();
    const siteName = `test_site_${timestamp}`;
    
    const { response, data } = await makeRequest('/api/sites', {
      method: 'POST',
      body: JSON.stringify({
        name: siteName,
        display_name: `Test Site ${timestamp}`,
        description: 'Automated test site',
        domain: `test${timestamp}.local`,
        is_active: true,
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}: ${data.error || 'Unknown error'}`);
    if (!data.success || !data.site) throw new Error('Site creation failed');
    
    testSiteId = data.site.id;
    logPass(`Created site: ${data.site.display_name} (ID: ${testSiteId})`);
    log(`  Database: nextcms_site${testSiteId}`, 'gray');
  } catch (error) {
    logFail('Create site', error);
  }

  if (testSiteId) {
    logTest(`GET /api/sites/${testSiteId} - Get single site`);
    try {
      const { response, data } = await makeRequest(`/api/sites/${testSiteId}`);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!data.site) throw new Error('Site not found');
      
      logPass(`Retrieved site: ${data.site.display_name}`);
    } catch (error) {
      logFail('Get single site', error);
    }

    logTest(`PUT /api/sites/${testSiteId} - Update site`);
    try {
      const { response, data } = await makeRequest(`/api/sites/${testSiteId}`, {
        method: 'PUT',
        body: JSON.stringify({
          display_name: 'Updated Test Site',
          description: 'Updated by automated test',
          is_active: true,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!data.success) throw new Error('Update failed');
      
      logPass('Updated site successfully');
    } catch (error) {
      logFail('Update site', error);
    }

    logTest(`DELETE /api/sites/${testSiteId} - Delete site`);
    try {
      const { response, data } = await makeRequest(`/api/sites/${testSiteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!data.success) throw new Error('Delete failed');
      
      logPass('Deleted test site');
      testSiteId = null; // Don't use this ID anymore
    } catch (error) {
      logFail('Delete site', error);
    }
  }
}

// ============================================
// 3. USERS API
// ============================================
async function testUsersAPI() {
  log('\n========================================', 'cyan');
  log('3. USERS API', 'cyan');
  log('========================================', 'cyan');

  logTest('GET /api/users - List all users');
  try {
    const { response, data } = await makeRequest('/api/users');
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (!data.users || !Array.isArray(data.users)) throw new Error('Invalid response format');
    
    logPass(`Listed ${data.users.length} user(s)`);
    if (data.users.length > 0) {
      log(`  First user: ${data.users[0].username} (${data.users[0].email})`, 'gray');
    }
  } catch (error) {
    logFail('List users', error);
  }

  logTest('POST /api/users - Create new user');
  try {
    const timestamp = Date.now();
    const username = `testuser_${timestamp}`;
    
    const { response, data } = await makeRequest('/api/users', {
      method: 'POST',
      body: JSON.stringify({
        username: username,
        first_name: 'Test',
        last_name: 'User',
        email: `${username}@example.com`,
        password: 'TestPassword123!',
        role_id: '000000000000000000000003', // Author role (adjust if needed)
        sites: [], // No site assignments
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}: ${data.error || 'Unknown error'}`);
    if (!data.user) throw new Error('User creation failed');
    
    testUserId = data.user.id;
    logPass(`Created user: ${data.user.username} (ID: ${testUserId})`);
  } catch (error) {
    logFail('Create user', error);
  }

  if (testUserId) {
    logTest(`GET /api/users/${testUserId} - Get single user`);
    try {
      const { response, data } = await makeRequest(`/api/users/${testUserId}`);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!data.user) throw new Error('User not found');
      
      logPass(`Retrieved user: ${data.user.username}`);
    } catch (error) {
      logFail('Get single user', error);
    }

    logTest(`PUT /api/users/${testUserId} - Update user`);
    try {
      const { response, data } = await makeRequest(`/api/users/${testUserId}`, {
        method: 'PUT',
        body: JSON.stringify({
          username: data.user?.username || 'testuser',
          first_name: 'Updated',
          last_name: 'TestUser',
          email: data.user?.email || 'test@example.com',
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!data.user) throw new Error('Update failed');
      
      logPass('Updated user successfully');
    } catch (error) {
      logFail('Update user', error);
    }

    logTest(`DELETE /api/users/${testUserId} - Delete user`);
    try {
      const { response, data } = await makeRequest(`/api/users/${testUserId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!data.success) throw new Error('Delete failed');
      
      logPass('Deleted test user');
      testUserId = null;
    } catch (error) {
      logFail('Delete user', error);
    }
  }
}

// ============================================
// 4. ROLES API
// ============================================
async function testRolesAPI() {
  log('\n========================================', 'cyan');
  log('4. ROLES API', 'cyan');
  log('========================================', 'cyan');

  logTest('GET /api/roles - List all roles');
  try {
    const { response, data } = await makeRequest('/api/roles');
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (!data.roles || !Array.isArray(data.roles)) throw new Error('Invalid response format');
    if (data.roles.length === 0) throw new Error('No roles returned');
    
    logPass(`Listed ${data.roles.length} role(s)`);
    data.roles.forEach(role => {
      log(`  - ${role.label} (${role.name})`, 'gray');
    });
  } catch (error) {
    logFail('List roles', error);
  }
}

// ============================================
// MAIN TEST RUNNER
// ============================================
async function runTests() {
  log('\n╔════════════════════════════════════════╗', 'bright');
  log('║  SuperAdmin API Test Suite (MongoDB)  ║', 'bright');
  log('╚════════════════════════════════════════╝', 'bright');
  log(`\nTesting: ${BASE_URL}`, 'gray');
  log(`User: ${TEST_USER}\n`, 'gray');

  try {
    await testAuthentication();
    await testSitesAPI();
    await testUsersAPI();
    await testRolesAPI();
  } catch (error) {
    log('\n❌ Tests stopped due to fatal error', 'red');
  }

  // Summary
  log('\n========================================', 'cyan');
  log('TEST SUMMARY', 'cyan');
  log('========================================', 'cyan');
  log(`Passed: ${testsPassed}`, 'green');
  log(`Failed: ${testsFailed}`, testsFailed > 0 ? 'red' : 'green');
  log(`Total:  ${testsPassed + testsFailed}`, 'cyan');

  if (testsFailed === 0) {
    log('\n✅ All tests passed!', 'green');
    process.exit(0);
  } else {
    log('\n❌ Some tests failed', 'red');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});

