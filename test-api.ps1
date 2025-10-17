Write-Host "========================================" -ForegroundColor Cyan
Write-Host "REST API v1 - Comprehensive Test Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000/api/v1"
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
    if ($health.success -ne $true) { throw "Health check failed" }
    Write-Host "Status: $($health.data.status)" -ForegroundColor Gray
    Write-Host "Database: $($health.data.database)" -ForegroundColor Gray
}

# ===========================================
# 2. AUTHENTICATION
# ===========================================
Write-Host "`n=== 2. AUTHENTICATION ===" -ForegroundColor Cyan

$global:token = $null
$global:refreshToken = $null

Test-Endpoint "POST /auth/login" {
    $loginBody = @{
        username = "couleeweb"
        password = '$Upir32!@#'
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody

    if (!$response.success) { throw "Login failed" }
    $global:token = $response.data.access_token
    $global:refreshToken = $response.data.refresh_token
    
    Write-Host "User: $($response.data.user.username)" -ForegroundColor Gray
    Write-Host "Role: $($response.data.user.role)" -ForegroundColor Gray
    Write-Host "Site ID: $($response.data.user.site_id)" -ForegroundColor Gray
}

Test-Endpoint "GET /auth/me" {
    $me = Invoke-RestMethod -Uri "$baseUrl/auth/me" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$me.success) { throw "Get user info failed" }
    Write-Host "Authenticated as: $($me.data.username)" -ForegroundColor Gray
}

Test-Endpoint "POST /auth/refresh" {
    $refreshBody = @{
        refresh_token = $global:refreshToken
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/auth/refresh" `
        -Method POST `
        -ContentType "application/json" `
        -Body $refreshBody

    if (!$response.success) { throw "Token refresh failed" }
    Write-Host "New token generated" -ForegroundColor Gray
}

# ===========================================
# 3. POSTS - LIST & FILTER
# ===========================================
Write-Host "`n=== 3. POSTS - LIST & FILTER ===" -ForegroundColor Cyan

Test-Endpoint "GET /posts (default)" {
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

Test-Endpoint "GET /posts?sort=-created_at" {
    $posts = Invoke-RestMethod -Uri "$baseUrl/posts?sort=-created_at" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$posts.success) { throw "Sorting failed" }
    Write-Host "Sorted by created_at DESC" -ForegroundColor Gray
}

Test-Endpoint "GET /posts?status=published" {
    $posts = Invoke-RestMethod -Uri "$baseUrl/posts?status=published" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$posts.success) { throw "Status filter failed" }
    Write-Host "Published posts: $($posts.meta.pagination.total)" -ForegroundColor Gray
}

Test-Endpoint "GET /posts?include=author,categories" {
    $posts = Invoke-RestMethod -Uri "$baseUrl/posts?include=author,categories" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$posts.success) { throw "Include failed" }
    if ($posts.data.Count -gt 0 -and $posts.data[0].author) {
        Write-Host "Includes working: author loaded" -ForegroundColor Gray
    }
}

# ===========================================
# 4. POSTS - CREATE
# ===========================================
Write-Host "`n=== 4. POSTS - CREATE ===" -ForegroundColor Cyan

$global:testPostId = $null

Test-Endpoint "POST /posts (create)" {
    $newPost = @{
        title = "API Test Post $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        content = "This post was created via REST API test"
        excerpt = "API test excerpt"
        status = "draft"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/posts" `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $global:token" } `
        -Body $newPost

    if (!$response.success) { throw "Create post failed" }
    $global:testPostId = $response.data.id
    Write-Host "Created post ID: $global:testPostId" -ForegroundColor Gray
    Write-Host "Title: $($response.data.title)" -ForegroundColor Gray
}

# ===========================================
# 5. POSTS - READ SINGLE
# ===========================================
Write-Host "`n=== 5. POSTS - READ SINGLE ===" -ForegroundColor Cyan

Test-Endpoint "GET /posts/:id" {
    if (!$global:testPostId) { throw "No test post ID available" }
    
    $post = Invoke-RestMethod -Uri "$baseUrl/posts/$global:testPostId" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$post.success) { throw "Get single post failed" }
    Write-Host "Post: $($post.data.title)" -ForegroundColor Gray
}

Test-Endpoint "GET /posts/:id?include=author,categories,tags" {
    if (!$global:testPostId) { throw "No test post ID available" }
    
    $post = Invoke-RestMethod -Uri "$baseUrl/posts/$($global:testPostId)?include=author,categories,tags" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$post.success) { throw "Get post with includes failed" }
    Write-Host "Post with relations loaded" -ForegroundColor Gray
}

# ===========================================
# 6. POSTS - UPDATE
# ===========================================
Write-Host "`n=== 6. POSTS - UPDATE ===" -ForegroundColor Cyan

Test-Endpoint "PATCH /posts/:id (partial update)" {
    if (!$global:testPostId) { throw "No test post ID available" }
    
    $update = @{
        excerpt = "Updated excerpt via API test"
        status = "published"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/posts/$global:testPostId" `
        -Method PATCH `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $global:token" } `
        -Body $update

    if (!$response.success) { throw "Update failed" }
    if ($response.data.status -ne "published") { throw "Status not updated" }
    Write-Host "Status updated to: $($response.data.status)" -ForegroundColor Gray
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

Test-Endpoint "GET /posts/:id (verify deleted)" {
    if (!$global:testPostId) { throw "No test post ID available" }
    
    try {
        $post = Invoke-RestMethod -Uri "$baseUrl/posts/$global:testPostId" `
            -Headers @{ Authorization = "Bearer $global:token" }
        throw "Post still exists after delete"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 404) {
            Write-Host "Post correctly returns 404" -ForegroundColor Gray
        } else {
            throw $_
        }
    }
}

# ===========================================
# 8. LOGOUT
# ===========================================
Write-Host "`n=== 8. LOGOUT ===" -ForegroundColor Cyan

Test-Endpoint "POST /auth/logout" {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/logout" `
        -Method POST `
        -Headers @{ Authorization = "Bearer $global:token" }

    if (!$response.success) { throw "Logout failed" }
    Write-Host "Logged out successfully" -ForegroundColor Gray
}

Test-Endpoint "GET /auth/me (after logout)" {
    try {
        $me = Invoke-RestMethod -Uri "$baseUrl/auth/me" `
            -Headers @{ Authorization = "Bearer $global:token" }
        throw "Token still valid after logout"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 401) {
            Write-Host "Token correctly invalidated" -ForegroundColor Gray
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
    Write-Host "`n✅ All tests passed!" -ForegroundColor Green
} else {
    Write-Host "`n❌ Some tests failed" -ForegroundColor Red
}

