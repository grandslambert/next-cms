# Test Suite for Sites API
# Tests all CRUD operations for site management

# Load environment variables
. "$PSScriptRoot\load-env.ps1"

$baseUrl = if ($env:TEST_BASE_URL) { $env:TEST_BASE_URL } else { "http://localhost:3000" }
$username = if ($env:TEST_USER) { $env:TEST_USER } else { "couleeweb" }
$password = if ($env:TEST_PASS) { $env:TEST_PASS } else { "Test123!" }

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Sites API Test Suite" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Track test results
$passed = 0
$failed = 0
$testSiteId = $null

# Test 1: Login
Write-Host "Test 1: Login" -ForegroundColor Yellow
try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body (@{
            username = $username
            password = $password
        } | ConvertTo-Json)
    
    $token = $loginResponse.data.access_token
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    Write-Host "[ PASS ] Login successful" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "[ FAIL ] Login failed: $_" -ForegroundColor Red
    $failed++
    exit 1
}

# Test 2: List sites
Write-Host "`nTest 2: List sites" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/sites?page=1&per_page=10" `
        -Method Get `
        -Headers $headers
    
    if ($response.success -and $response.data.Count -ge 1) {
        Write-Host "[ PASS ] Listed $($response.meta.count) sites" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[ FAIL ] Expected at least 1 site" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "[ FAIL ] Error: $_" -ForegroundColor Red
    $failed++
}

# Test 3: Search sites
Write-Host "`nTest 3: Search sites" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/sites?search=site" `
        -Method Get `
        -Headers $headers
    
    if ($response.success) {
        Write-Host "[ PASS ] Search returned $($response.meta.count) sites" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[ FAIL ] Search failed" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "[ FAIL ] Error: $_" -ForegroundColor Red
    $failed++
}

# Test 4: Filter sites by active status
Write-Host "`nTest 4: Filter sites by active status" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/sites?is_active=true" `
        -Method Get `
        -Headers $headers
    
    if ($response.success) {
        Write-Host "[ PASS ] Filter returned $($response.meta.count) active sites" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[ FAIL ] Filter failed" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "[ FAIL ] Error: $_" -ForegroundColor Red
    $failed++
}

# Test 5: Get single site (site 1)
Write-Host "`nTest 5: Get single site" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/sites/1" `
        -Method Get `
        -Headers $headers
    
    if ($response.success -and $response.data.id -eq 1 -and $response.data.stats) {
        Write-Host "[ PASS ] Retrieved site 1 with stats (users: $($response.data.stats.users))" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[ FAIL ] Expected site with stats" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "[ FAIL ] Error: $_" -ForegroundColor Red
    $failed++
}

# Test 6: Get non-existent site
Write-Host "`nTest 6: Get non-existent site (404)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/sites/99999" `
        -Method Get `
        -Headers $headers
    
    Write-Host "[ FAIL ] Expected 404, got success" -ForegroundColor Red
    $failed++
} catch {
    if ($_.Exception.Response.StatusCode.Value__ -eq 404) {
        Write-Host "[ PASS ] Correctly returned 404" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[ FAIL ] Wrong error code: $($_.Exception.Response.StatusCode.Value__)" -ForegroundColor Red
        $failed++
    }
}

# Test 7: Create new site
Write-Host "`nTest 7: Create new site" -ForegroundColor Yellow
try {
    $timestamp = [DateTimeOffset]::Now.ToUnixTimeSeconds()
    $siteName = "test_site_$timestamp"
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/sites" `
        -Method Post `
        -Headers $headers `
        -Body (@{
            name = $siteName
            display_name = "Test Site $timestamp"
            domain = "test$timestamp.example.com"
            description = "Test site for API testing"
            is_active = $true
        } | ConvertTo-Json)
    
    if ($response.success -and $response.data.name -eq $siteName) {
        $testSiteId = $response.data.id
        Write-Host "[ PASS ] Created site with ID: $testSiteId" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[ FAIL ] Site creation failed" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "[ FAIL ] Error: $_" -ForegroundColor Red
    $failed++
}

# Test 8: Create site with duplicate name
Write-Host "`nTest 8: Create site with duplicate name (409)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/sites" `
        -Method Post `
        -Headers $headers `
        -Body (@{
            name = "site_1"
            display_name = "Duplicate Site"
            is_active = $true
        } | ConvertTo-Json)
    
    Write-Host "[ FAIL ] Expected 409 conflict, got success" -ForegroundColor Red
    $failed++
} catch {
    if ($_.Exception.Response.StatusCode.Value__ -eq 409) {
        Write-Host "[ PASS ] Correctly returned 409 for duplicate name" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[ FAIL ] Wrong error code: $($_.Exception.Response.StatusCode.Value__)" -ForegroundColor Red
        $failed++
    }
}

# Test 9: Create site with invalid name format
Write-Host "`nTest 9: Create site with invalid name format (400)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/sites" `
        -Method Post `
        -Headers $headers `
        -Body (@{
            name = "Invalid Name With Spaces"
            display_name = "Invalid Site"
            is_active = $true
        } | ConvertTo-Json)
    
    Write-Host "[ FAIL ] Expected 400 validation error, got success" -ForegroundColor Red
    $failed++
} catch {
    if ($_.Exception.Response.StatusCode.Value__ -eq 400) {
        Write-Host "[ PASS ] Correctly returned 400 for invalid name" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[ FAIL ] Wrong error code: $($_.Exception.Response.StatusCode.Value__)" -ForegroundColor Red
        $failed++
    }
}

# Test 10: Update site (PUT)
if ($testSiteId) {
    Write-Host "`nTest 10: Update site (PUT)" -ForegroundColor Yellow
    try {
        $timestamp = [DateTimeOffset]::Now.ToUnixTimeSeconds()
        $siteName = "test_site_$timestamp"
        
        $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/sites/$testSiteId" `
            -Method Put `
            -Headers $headers `
            -Body (@{
                name = $siteName
                display_name = "Updated Test Site"
                domain = "updated$timestamp.example.com"
                description = "Updated description"
                is_active = $true
            } | ConvertTo-Json)
        
        if ($response.success -and $response.data.display_name -eq "Updated Test Site") {
            Write-Host "[ PASS ] Site updated successfully" -ForegroundColor Green
            $passed++
        } else {
            Write-Host "[ FAIL ] Site update failed" -ForegroundColor Red
            $failed++
        }
    } catch {
        Write-Host "[ FAIL ] Error: $_" -ForegroundColor Red
        $failed++
    }
} else {
    Write-Host "`nTest 10: Update site (PUT) - SKIPPED (no test site)" -ForegroundColor Yellow
}

# Test 11: Partial update site (PATCH)
if ($testSiteId) {
    Write-Host "`nTest 11: Partial update site (PATCH)" -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/sites/$testSiteId" `
            -Method Patch `
            -Headers $headers `
            -Body (@{
                description = "Partially updated description"
            } | ConvertTo-Json)
        
        if ($response.success -and $response.data.description -eq "Partially updated description") {
            Write-Host "[ PASS ] Site partially updated successfully" -ForegroundColor Green
            $passed++
        } else {
            Write-Host "[ FAIL ] Partial update failed" -ForegroundColor Red
            $failed++
        }
    } catch {
        Write-Host "[ FAIL ] Error: $_" -ForegroundColor Red
        $failed++
    }
} else {
    Write-Host "`nTest 11: Partial update site (PATCH) - SKIPPED (no test site)" -ForegroundColor Yellow
}

# Test 12: Deactivate site
if ($testSiteId) {
    Write-Host "`nTest 12: Deactivate site" -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/sites/$testSiteId" `
            -Method Patch `
            -Headers $headers `
            -Body (@{
                is_active = $false
            } | ConvertTo-Json)
        
        if ($response.success -and $response.data.is_active -eq 0) {
            Write-Host "[ PASS ] Site deactivated successfully" -ForegroundColor Green
            $passed++
        } else {
            Write-Host "[ FAIL ] Deactivation failed" -ForegroundColor Red
            $failed++
        }
    } catch {
        Write-Host "[ FAIL ] Error: $_" -ForegroundColor Red
        $failed++
    }
} else {
    Write-Host "`nTest 12: Deactivate site - SKIPPED (no test site)" -ForegroundColor Yellow
}

# Test 13: Try to delete default site (should fail)
Write-Host "`nTest 13: Try to delete default site (403)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/sites/1" `
        -Method Delete `
        -Headers $headers
    
    Write-Host "[ FAIL ] Expected 403 forbidden, got success" -ForegroundColor Red
    $failed++
} catch {
    if ($_.Exception.Response.StatusCode.Value__ -eq 403) {
        Write-Host "[ PASS ] Correctly prevented deletion of default site" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[ FAIL ] Wrong error code: $($_.Exception.Response.StatusCode.Value__)" -ForegroundColor Red
        $failed++
    }
}

# Test 14: Delete test site
if ($testSiteId) {
    Write-Host "`nTest 14: Delete test site" -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/sites/$testSiteId" `
            -Method Delete `
            -Headers $headers
        
        if ($response.success) {
            Write-Host "[ PASS ] Site deleted successfully" -ForegroundColor Green
            $passed++
        } else {
            Write-Host "[ FAIL ] Site deletion failed" -ForegroundColor Red
            $failed++
        }
    } catch {
        Write-Host "[ FAIL ] Error: $_" -ForegroundColor Red
        $failed++
    }
} else {
    Write-Host "`nTest 14: Delete test site - SKIPPED (no test site)" -ForegroundColor Yellow
}

# Test 15: Verify site was deleted
if ($testSiteId) {
    Write-Host "`nTest 15: Verify site was deleted (404)" -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/sites/$testSiteId" `
            -Method Get `
            -Headers $headers
        
        Write-Host "[ FAIL ] Site still exists after deletion" -ForegroundColor Red
        $failed++
    } catch {
        if ($_.Exception.Response.StatusCode.Value__ -eq 404) {
            Write-Host "[ PASS ] Site correctly not found after deletion" -ForegroundColor Green
            $passed++
        } else {
            Write-Host "[ FAIL ] Wrong error code: $($_.Exception.Response.StatusCode.Value__)" -ForegroundColor Red
            $failed++
        }
    }
} else {
    Write-Host "`nTest 15: Verify site was deleted - SKIPPED (no test site)" -ForegroundColor Yellow
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host "Total:  $($passed + $failed)" -ForegroundColor Cyan

if ($failed -eq 0) {
    Write-Host "`nAll tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`nSome tests failed!" -ForegroundColor Red
    exit 1
}

