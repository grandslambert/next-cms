Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Users API - Test Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Load environment variables from .env file
. (Join-Path $PSScriptRoot "load-env.ps1")

# Configuration
$baseUrl = "http://localhost:3000/api/v1"
$testUser = $env:TEST_USER
$testPass = $env:TEST_PASS

if (-not $testUser -or -not $testPass) {
    Write-Host "`nERROR: TEST_USER and TEST_PASS must be configured" -ForegroundColor Red
    Write-Host "`nOptions:" -ForegroundColor Yellow
    Write-Host "  1. Add TEST_USER and TEST_PASS to your .env file" -ForegroundColor Gray
    Write-Host "  2. Set environment variables:" -ForegroundColor Gray
    Write-Host '     $env:TEST_USER = "your_username"' -ForegroundColor Gray
    Write-Host '     $env:TEST_PASS = "your_password"' -ForegroundColor Gray
    exit 1
}

$testsPassed = 0
$testsFailed = 0

# Helper function for tests
function Test-Endpoint {
    param($Name, $ScriptBlock)
    Write-Host "`n[ TEST ] $Name" -ForegroundColor Yellow
    try {
        & $ScriptBlock
        $script:testsPassed++
        Write-Host "[  OK  ] $Name" -ForegroundColor Green
    } catch {
        $script:testsFailed++
        Write-Host "[ FAIL ] $Name" -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
    }
}

# ===========================================
# 1. AUTHENTICATION
# ===========================================
Write-Host "`n=== 1. AUTHENTICATION ===" -ForegroundColor Cyan

$global:token = $null

Test-Endpoint "POST /auth/login" {
    $loginBody = @{
        username = $testUser
        password = $testPass
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody

    if (!$response.success) { throw "Login failed" }
    $global:token = $response.data.access_token
    
    Write-Host "User: $($response.data.user.username)" -ForegroundColor Gray
    Write-Host "Role: $($response.data.user.role)" -ForegroundColor Gray
}

# ===========================================
# 2. USERS - LIST ALL
# ===========================================
Write-Host "`n=== 2. USERS - LIST ALL ===" -ForegroundColor Cyan

$global:testUserId = $null

Test-Endpoint "GET /users (default)" {
    $users = Invoke-RestMethod -Uri "$baseUrl/users" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$users.success) { throw "List users failed" }
    Write-Host "Total users: $($users.meta.pagination.total)" -ForegroundColor Gray
    Write-Host "Returned: $($users.meta.pagination.count)" -ForegroundColor Gray
}

Test-Endpoint "GET /users?per_page=5" {
    $users = Invoke-RestMethod -Uri "$baseUrl/users?per_page=5" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if ($users.data.Count -gt 5) { throw "Pagination not working" }
    Write-Host "Returned: $($users.data.Count) users" -ForegroundColor Gray
}

# ===========================================
# 3. USERS - CREATE
# ===========================================
Write-Host "`n=== 3. USERS - CREATE ===" -ForegroundColor Cyan

Test-Endpoint "POST /users (create test user)" {
    $timestamp = Get-Date -Format "HHmmss"
    $userBody = @{
        username = "testuser_$timestamp"
        first_name = "Test"
        last_name = "User"
        email = "testuser_$timestamp@example.com"
        password = "TestPassword123!"
        role_id = 3
        sites = @(
            @{
                site_id = 4
                role_id = 3
            }
        )
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/users" `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $global:token" } `
        -Body $userBody

    if (!$response.success) { throw "Create user failed" }
    $global:testUserId = $response.data.id
    Write-Host "Created user ID: $global:testUserId" -ForegroundColor Gray
    Write-Host "Username: $($response.data.username)" -ForegroundColor Gray
    Write-Host "Sites: $($response.data.sites.Count)" -ForegroundColor Gray
}

# ===========================================
# 4. USERS - GET SINGLE
# ===========================================
Write-Host "`n=== 4. USERS - GET SINGLE ===" -ForegroundColor Cyan

Test-Endpoint "GET /users/:id" {
    if (!$global:testUserId) { throw "No test user ID available" }
    
    $user = Invoke-RestMethod -Uri "$baseUrl/users/$global:testUserId" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$user.success) { throw "Get single user failed" }
    Write-Host "User: $($user.data.username)" -ForegroundColor Gray
    Write-Host "Email: $($user.data.email)" -ForegroundColor Gray
    Write-Host "Display Name: $($user.data.display_name)" -ForegroundColor Gray
    Write-Host "Role: $($user.data.role_name)" -ForegroundColor Gray
}

Test-Endpoint "GET /auth/me (current user)" {
    $me = Invoke-RestMethod -Uri "$baseUrl/auth/me" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$me.success) { throw "Get current user failed" }
    Write-Host "Current user: $($me.data.username)" -ForegroundColor Gray
}

# ===========================================
# 5. USERS - UPDATE
# ===========================================
Write-Host "`n=== 5. USERS - UPDATE ===" -ForegroundColor Cyan

Test-Endpoint "PATCH /users/:id (update user)" {
    if (!$global:testUserId) { throw "No test user ID available" }
    
    $update = @{
        last_name = "UpdatedUser"
        email = "updated_$($global:testUserId)@example.com"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/users/$global:testUserId" `
        -Method PATCH `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $global:token" } `
        -Body $update

    if (!$response.success) { throw "Update failed" }
    if ($response.data.last_name -ne "UpdatedUser") { throw "Last name not updated" }
    Write-Host "User updated successfully" -ForegroundColor Gray
}

# ===========================================
# 6. USERS - SEARCH
# ===========================================
Write-Host "`n=== 6. USERS - SEARCH ===" -ForegroundColor Cyan

Test-Endpoint "GET /users?search=test" {
    $users = Invoke-RestMethod -Uri "$baseUrl/users?search=test" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$users.success) { throw "Search failed" }
    Write-Host "Search results: $($users.meta.pagination.count)" -ForegroundColor Gray
}

Test-Endpoint "GET /users?search=@example.com" {
    $users = Invoke-RestMethod -Uri "$baseUrl/users?search=@example.com" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$users.success) { throw "Email search failed" }
    Write-Host "Email search results: $($users.meta.pagination.count)" -ForegroundColor Gray
}

# ===========================================
# 7. USERS - FILTER BY ROLE
# ===========================================
Write-Host "`n=== 7. USERS - FILTER BY ROLE ===" -ForegroundColor Cyan

Test-Endpoint "GET /users?role_id=3" {
    $users = Invoke-RestMethod -Uri "$baseUrl/users?role_id=3" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$users.success) { throw "Role filter failed" }
    Write-Host "Users with role 3: $($users.meta.pagination.count)" -ForegroundColor Gray
}

# ===========================================
# 8. USERS - FILTER BY SITE
# ===========================================
Write-Host "`n=== 8. USERS - FILTER BY SITE ===" -ForegroundColor Cyan

Test-Endpoint "GET /users?site_id=4" {
    $users = Invoke-RestMethod -Uri "$baseUrl/users?site_id=4" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$users.success) { throw "Site filter failed" }
    Write-Host "Users in site 4: $($users.meta.pagination.count)" -ForegroundColor Gray
}

# ===========================================
# 9. USERS - ERROR CASES
# ===========================================
Write-Host "`n=== 9. USERS - ERROR CASES ===" -ForegroundColor Cyan

Test-Endpoint "GET /users/:id (invalid ID)" {
    try {
        $user = Invoke-RestMethod -Uri "$baseUrl/users/999999" `
            -Headers @{ Authorization = "Bearer $global:token" }
        throw "Should have returned 404"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 404) {
            Write-Host "Correctly returns 404 for invalid ID" -ForegroundColor Gray
        } else {
            throw $_
        }
    }
}

Test-Endpoint "POST /users (duplicate username)" {
    if (!$global:testUserId) { throw "No test user ID available" }
    
    # Get the test user's username
    $testUser = Invoke-RestMethod -Uri "$baseUrl/users/$global:testUserId" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    try {
        $userBody = @{
            username = $testUser.data.username
            first_name = "Duplicate"
            last_name = "User"
            email = "different@example.com"
            password = "TestPassword123!"
            role_id = 3
        } | ConvertTo-Json

        $response = Invoke-RestMethod -Uri "$baseUrl/users" `
            -Method POST `
            -ContentType "application/json" `
            -Headers @{ Authorization = "Bearer $global:token" } `
            -Body $userBody
        throw "Should have returned 409 (conflict)"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 409) {
            Write-Host "Correctly prevents duplicate username" -ForegroundColor Gray
        } else {
            throw $_
        }
    }
}

Test-Endpoint "DELETE /users/:id (self-deletion)" {
    # Try to delete own account - should fail
    try {
        # Get current user ID
        $me = Invoke-RestMethod -Uri "$baseUrl/auth/me" `
            -Headers @{ Authorization = "Bearer $global:token" }
        
        $response = Invoke-RestMethod -Uri "$baseUrl/users/$($me.data.id)" `
            -Method DELETE `
            -Headers @{ Authorization = "Bearer $global:token" }
        throw "Should have returned 400 (cannot delete self)"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 400) {
            Write-Host "Correctly prevents self-deletion" -ForegroundColor Gray
        } else {
            throw $_
        }
    }
}

# ===========================================
# 10. USERS - VALIDATION
# ===========================================
Write-Host "`n=== 10. USERS - VALIDATION ===" -ForegroundColor Cyan

Test-Endpoint "POST /users (missing required fields)" {
    try {
        $userBody = @{
            username = "incomplete"
        } | ConvertTo-Json

        $response = Invoke-RestMethod -Uri "$baseUrl/users" `
            -Method POST `
            -ContentType "application/json" `
            -Headers @{ Authorization = "Bearer $global:token" } `
            -Body $userBody
        throw "Should have returned 400 (missing fields)"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 400) {
            Write-Host "Correctly validates required fields" -ForegroundColor Gray
        } else {
            throw $_
        }
    }
}

# ===========================================
# 11. CLEANUP - DELETE TEST USER
# ===========================================
Write-Host "`n=== 11. CLEANUP - DELETE TEST USER ===" -ForegroundColor Cyan

Test-Endpoint "DELETE /users/:id" {
    if (!$global:testUserId) { throw "No test user ID available" }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/users/$global:testUserId" `
        -Method DELETE `
        -Headers @{ Authorization = "Bearer $global:token" }

    if (!$response.success) { throw "Delete failed" }
    Write-Host "Test user deleted successfully" -ForegroundColor Gray
}

Test-Endpoint "GET /users/:id (verify deletion)" {
    if (!$global:testUserId) { throw "No test user ID available" }
    
    try {
        $user = Invoke-RestMethod -Uri "$baseUrl/users/$global:testUserId" `
            -Headers @{ Authorization = "Bearer $global:token" }
        throw "User should have been deleted"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 404) {
            Write-Host "User successfully deleted (404)" -ForegroundColor Gray
        } else {
            throw $_
        }
    }
}

# ===========================================
# SUMMARY
# ===========================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Passed: $testsPassed" -ForegroundColor Green
Write-Host "Failed: $testsFailed" -ForegroundColor $(if ($testsFailed -gt 0) { "Red" } else { "Green" })
Write-Host "Total:  $($testsPassed + $testsFailed)" -ForegroundColor White

if ($testsFailed -eq 0) {
    Write-Host "`nAll tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`nSome tests failed" -ForegroundColor Red
    exit 1
}

