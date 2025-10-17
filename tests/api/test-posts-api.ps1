Write-Host "========================================" -ForegroundColor Cyan
Write-Host "REST API v1 - Posts API Test Suite" -ForegroundColor Cyan
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
# 1. HEALTH CHECK
# ===========================================
Write-Host "`n=== 1. HEALTH CHECK ===" -ForegroundColor Cyan

Test-Endpoint "GET /health" {
    $health = Invoke-RestMethod -Uri "$baseUrl/health"
    
    if ($health.status -ne "healthy") { throw "API not healthy" }
    Write-Host "API Status: $($health.status)" -ForegroundColor Gray
    Write-Host "Database: $($health.database)" -ForegroundColor Gray
}

# ===========================================
# 2. AUTHENTICATION
# ===========================================
Write-Host "`n=== 2. AUTHENTICATION ===" -ForegroundColor Cyan

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
    Write-Host "Site: $($response.data.user.site_id)" -ForegroundColor Gray
}

Test-Endpoint "GET /auth/me" {
    $me = Invoke-RestMethod -Uri "$baseUrl/auth/me" `
        -Headers @{ Authorization = "Bearer $global:token" }

    if (!$me.success) { throw "Get current user failed" }
    Write-Host "Current user: $($me.data.username)" -ForegroundColor Gray
}

# ===========================================
# 3. POSTS - LIST ALL
# ===========================================
Write-Host "`n=== 3. POSTS - LIST ALL ===" -ForegroundColor Cyan

$global:testPostId = $null

Test-Endpoint "GET /posts (default pagination)" {
    $posts = Invoke-RestMethod -Uri "$baseUrl/posts" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$posts.success) { throw "List posts failed" }
    Write-Host "Total posts: $($posts.meta.pagination.total)" -ForegroundColor Gray
    Write-Host "Returned: $($posts.meta.pagination.count)" -ForegroundColor Gray
}

Test-Endpoint "GET /posts?per_page=5" {
    $posts = Invoke-RestMethod -Uri "$baseUrl/posts?per_page=5" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if ($posts.data.Count -gt 5) { throw "Pagination not working" }
    Write-Host "Returned: $($posts.data.Count) posts" -ForegroundColor Gray
}

# ===========================================
# 4. POSTS - CREATE
# ===========================================
Write-Host "`n=== 4. POSTS - CREATE ===" -ForegroundColor Cyan

Test-Endpoint "POST /posts (create test post)" {
    $postBody = @{
        title = "API Test Post $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        content = "This post was created by the API test suite"
        status = "draft"
        post_type = "post"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/posts" `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $global:token" } `
        -Body $postBody

    if (!$response.success) { throw "Create post failed" }
    $global:testPostId = $response.data.id
    Write-Host "Created post ID: $global:testPostId" -ForegroundColor Gray
    Write-Host "Slug: $($response.data.slug)" -ForegroundColor Gray
}

# ===========================================
# 5. POSTS - GET SINGLE
# ===========================================
Write-Host "`n=== 5. POSTS - GET SINGLE ===" -ForegroundColor Cyan

Test-Endpoint "GET /posts/:id" {
    if (!$global:testPostId) { throw "No test post ID available" }
    
    $post = Invoke-RestMethod -Uri "$baseUrl/posts/$global:testPostId" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$post.success) { throw "Get single post failed" }
    Write-Host "Post: $($post.data.title)" -ForegroundColor Gray
    Write-Host "Status: $($post.data.status)" -ForegroundColor Gray
}

# ===========================================
# 6. POSTS - UPDATE
# ===========================================
Write-Host "`n=== 6. POSTS - UPDATE ===" -ForegroundColor Cyan

Test-Endpoint "PATCH /posts/:id" {
    if (!$global:testPostId) { throw "No test post ID available" }
    
    $update = @{
        title = "Updated API Test Post"
        status = "published"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/posts/$global:testPostId" `
        -Method PATCH `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $global:token" } `
        -Body $update

    if (!$response.success) { throw "Update failed" }
    if ($response.data.title -ne "Updated API Test Post") { throw "Title not updated" }
    Write-Host "Post updated successfully" -ForegroundColor Gray
}

# ===========================================
# 7. POSTS - DELETE
# ===========================================
Write-Host "`n=== 7. POSTS - DELETE ===" -ForegroundColor Cyan

Test-Endpoint "DELETE /posts/:id" {
    if (!$global:testPostId) { throw "No test post ID available" }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/posts/$global:testPostId" `
        -Method DELETE `
        -Headers @{ Authorization = "Bearer $global:token" }

    if (!$response.success) { throw "Delete failed" }
    Write-Host "Post deleted successfully" -ForegroundColor Gray
}

# ===========================================
# 8. AUTHENTICATION - LOGOUT
# ===========================================
Write-Host "`n=== 8. AUTHENTICATION - LOGOUT ===" -ForegroundColor Cyan

Test-Endpoint "POST /auth/logout" {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/logout" `
        -Method POST `
        -Headers @{ Authorization = "Bearer $global:token" }

    if (!$response.success) { throw "Logout failed" }
    Write-Host "Logged out successfully" -ForegroundColor Gray
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

