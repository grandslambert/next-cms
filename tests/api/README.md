# REST API Test Suite

Comprehensive test suites for the Next CMS REST API v1.

## Overview

This directory contains PowerShell test scripts that verify all REST API endpoints. The tests cover:

- **Posts API** - 11 tests
- **Taxonomies & Terms API** - 20 tests  
- **Media API** - 18 tests
- **Menus API** - 22 tests

**Total: 71+ comprehensive tests**

## Prerequisites

1. **Next CMS running locally** on `http://localhost:3000`
2. **PowerShell** (Windows PowerShell 5.1+ or PowerShell Core 7+)
3. **Test user credentials** set as environment variables

## Setup

The test scripts need authentication credentials. There are multiple ways to provide them:

### Option 1: Use .env File (Recommended for Local Development)

Add test credentials to your `.env` file in the project root:

```env
TEST_USER=your_username
TEST_PASS=your_password
```

The test scripts will automatically load these values from `.env`.

### Option 2: Set Environment Variables

**Windows PowerShell:**
```powershell
$env:TEST_USER = "your_username"
$env:TEST_PASS = "your_password"
```

**PowerShell Core (Linux/Mac):**
```bash
export TEST_USER="your_username"
export TEST_PASS="your_password"
```

Environment variables take precedence over `.env` file values.

### Option 3: Make Variables Persistent

**Windows - Add to PowerShell Profile:**
```powershell
# Edit your profile
notepad $PROFILE

# Add these lines:
$env:TEST_USER = "your_username"
$env:TEST_PASS = "your_password"
```

**Linux/Mac - Add to Shell Profile:**
```bash
# Add to ~/.bashrc or ~/.zshrc
export TEST_USER="your_username"
export TEST_PASS="your_password"
```

## Running Tests

### Run All Tests

Execute all test suites in sequence:

```powershell
cd tests/api
.\run-all-tests.ps1
```

### Run Individual Test Suites

Run specific API test suite:

```powershell
# Posts API
.\test-posts-api.ps1

# Taxonomies & Terms API
.\test-taxonomies-terms-api.ps1

# Media API
.\test-media-api.ps1

# Menus API
.\test-menus-api.ps1
```

## Test Coverage

### Posts API Tests
- Health check
- Authentication (login, logout, me)
- List posts (pagination)
- Create post
- Get single post
- Update post (PATCH)
- Delete post

### Taxonomies & Terms API Tests
- List taxonomies (pagination, search)
- Create taxonomy
- Get single taxonomy
- Update taxonomy (PUT, PATCH)
- Delete taxonomy
- List terms (filtering, search)
- Create term (with meta)
- Get single term (with includes)
- Update term
- Delete term
- Hierarchical relationships
- Error handling

### Media API Tests
- List media (pagination, filtering)
- Filter by mime type/category
- Filter by folder
- Include relations (uploader, usage)
- Get single media
- Update metadata
- Search media
- Trash operations (delete, restore)
- Usage tracking
- Force delete
- Error handling

### Menus API Tests
- List menus (pagination, search)
- Create menu
- Get single menu
- Update menu (PUT, PATCH)
- Create menu items (multiple types)
- Get menu item
- Update menu item
- Delete menu item
- Reorder menu items
- Hierarchical structure
- Protection for items with children
- Error handling
- Duplicate name prevention

## Test User Requirements

The test user should have:
- Admin or editor role with appropriate permissions
- Access to at least one site
- Permissions for:
  - `manage_posts`
  - `manage_taxonomies`
  - `manage_media`
  - `manage_menus`

## Expected Behavior

### Success
All tests pass with green "[  OK  ]" status. Exit code: 0

### Failure
Failed tests show red "[ FAIL ]" status with error details. Exit code: 1

## Troubleshooting

### "Authentication required" errors
- Verify `TEST_USER` and `TEST_PASS` are set correctly
- Ensure the user exists and has proper permissions
- Check the user has access to a site

### "Site not found" errors
- Ensure the test user is assigned to at least one site
- Verify the site is active

### Connection errors
- Verify Next CMS is running on `http://localhost:3000`
- Check the API is accessible at `/api/v1`
- Ensure the database is connected

### Permission errors
- Grant the test user appropriate role permissions
- Admin role recommended for comprehensive testing

## CI/CD Integration

These tests can be integrated into CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Run API Tests
  env:
    TEST_USER: ${{ secrets.TEST_USER }}
    TEST_PASS: ${{ secrets.TEST_PASS }}
  run: |
    cd tests/api
    pwsh ./run-all-tests.ps1
```

## Adding New Tests

To add new test suites:

1. Create `test-{feature}-api.ps1` in this directory
2. Follow the existing test structure:
   - Environment variable validation
   - Helper function for test cases
   - Comprehensive coverage
   - Proper cleanup
3. Add the new test file to `run-all-tests.ps1`
4. Update this README with test count and coverage details

## Notes

- Tests clean up after themselves (delete created resources)
- Tests run in sequence, not parallel
- Each test suite is independent
- Failed tests don't affect other suites
- Credentials are never logged or displayed

## Support

For issues or questions about the test suite, see:
- [API Documentation](../../app/api/v1/README.md)
- [Main Documentation](../../Documentation/)

