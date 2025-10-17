Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Media API - Test Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Configuration
$baseUrl = "http://localhost:3000/api/v1"
$testUser = $env:TEST_USER
$testPass = $env:TEST_PASS

if (-not $testUser -or -not $testPass) {
    Write-Host "ERROR: TEST_USER and TEST_PASS environment variables must be set" -ForegroundColor Red
    Write-Host "Set them with:" -ForegroundColor Yellow
    Write-Host '  $env:TEST_USER = "your_username"' -ForegroundColor Yellow
    Write-Host '  $env:TEST_PASS = "your_password"' -ForegroundColor Yellow
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
# 2. MEDIA - LIST ALL
# ===========================================
Write-Host "`n=== 2. MEDIA - LIST ALL ===" -ForegroundColor Cyan

$global:testMediaId = $null

Test-Endpoint "GET /media (default)" {
    $media = Invoke-RestMethod -Uri "$baseUrl/media" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$media.success) { throw "List media failed" }
    Write-Host "Total media: $($media.meta.pagination.total)" -ForegroundColor Gray
    Write-Host "Returned: $($media.meta.pagination.count)" -ForegroundColor Gray
    
    # Store first media ID for later tests
    if ($media.data.Count -gt 0) {
        $global:testMediaId = $media.data[0].id
        Write-Host "Using media ID $global:testMediaId for tests" -ForegroundColor Gray
    }
}

Test-Endpoint "GET /media?per_page=5" {
    $media = Invoke-RestMethod -Uri "$baseUrl/media?per_page=5" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if ($media.data.Count -gt 5) { throw "Pagination not working" }
    Write-Host "Returned: $($media.data.Count) items" -ForegroundColor Gray
}

# ===========================================
# 3. MEDIA - FILTER BY MIME
# ===========================================
Write-Host "`n=== 3. MEDIA - FILTER BY MIME ===" -ForegroundColor Cyan

Test-Endpoint "GET /media?mime_category=image" {
    $media = Invoke-RestMethod -Uri "$baseUrl/media?mime_category=image" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$media.success) { throw "Filter by mime category failed" }
    Write-Host "Images found: $($media.meta.pagination.count)" -ForegroundColor Gray
}

# ===========================================
# 4. MEDIA - FILTER BY FOLDER
# ===========================================
Write-Host "`n=== 4. MEDIA - FILTER BY FOLDER ===" -ForegroundColor Cyan

Test-Endpoint "GET /media?folder_id=0 (root level)" {
    $media = Invoke-RestMethod -Uri "$baseUrl/media?folder_id=0" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$media.success) { throw "Filter by folder failed" }
    Write-Host "Root level media: $($media.meta.pagination.count)" -ForegroundColor Gray
}

# ===========================================
# 5. MEDIA - WITH INCLUDES
# ===========================================
Write-Host "`n=== 5. MEDIA - WITH INCLUDES ===" -ForegroundColor Cyan

Test-Endpoint "GET /media?include=uploader" {
    $media = Invoke-RestMethod -Uri "$baseUrl/media?include=uploader&per_page=5" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$media.success) { throw "Include uploader failed" }
    if ($media.data.Count -gt 0 -and $media.data[0].uploader) {
        Write-Host "Uploader info included" -ForegroundColor Gray
    }
}

Test-Endpoint "GET /media?include=usage" {
    $media = Invoke-RestMethod -Uri "$baseUrl/media?include=usage&per_page=5" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$media.success) { throw "Include usage failed" }
    if ($media.data.Count -gt 0 -and $media.data[0].usage) {
        Write-Host "Usage info included: $($media.data[0].usage.total) uses" -ForegroundColor Gray
    }
}

# ===========================================
# 6. MEDIA - GET SINGLE
# ===========================================
Write-Host "`n=== 6. MEDIA - GET SINGLE ===" -ForegroundColor Cyan

Test-Endpoint "GET /media/:id (basic)" {
    if (!$global:testMediaId) { throw "No test media ID available" }
    
    $media = Invoke-RestMethod -Uri "$baseUrl/media/$global:testMediaId" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$media.success) { throw "Get single media failed" }
    Write-Host "Media: $($media.data.original_name)" -ForegroundColor Gray
    Write-Host "Type: $($media.data.mime_type)" -ForegroundColor Gray
    Write-Host "Size: $([math]::Round($media.data.size / 1024, 2)) KB" -ForegroundColor Gray
}

Test-Endpoint "GET /media/:id?include=usage,folder" {
    if (!$global:testMediaId) { throw "No test media ID available" }
    
    $media = Invoke-RestMethod -Uri "$baseUrl/media/$($global:testMediaId)?include=usage,folder" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$media.success) { throw "Get media with includes failed" }
    Write-Host "Media with relations loaded" -ForegroundColor Gray
    if ($media.data.usage) {
        Write-Host "Total usage: $($media.data.usage.total)" -ForegroundColor Gray
    }
}

# ===========================================
# 7. MEDIA - UPDATE METADATA
# ===========================================
Write-Host "`n=== 7. MEDIA - UPDATE METADATA ===" -ForegroundColor Cyan

Test-Endpoint "PATCH /media/:id (update metadata)" {
    if (!$global:testMediaId) { throw "No test media ID available" }
    
    $update = @{
        title = "API Test - Updated $(Get-Date -Format 'HH:mm:ss')"
        alt_text = "Updated via API test at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/media/$global:testMediaId" `
        -Method PATCH `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $global:token" } `
        -Body $update

    if (!$response.success) { throw "Update failed" }
    Write-Host "Title updated: $($response.data.title)" -ForegroundColor Gray
}

# ===========================================
# 8. MEDIA - SEARCH
# ===========================================
Write-Host "`n=== 8. MEDIA - SEARCH ===" -ForegroundColor Cyan

Test-Endpoint "GET /media?search=test" {
    $media = Invoke-RestMethod -Uri "$baseUrl/media?search=test" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$media.success) { throw "Search failed" }
    Write-Host "Search results: $($media.meta.pagination.count)" -ForegroundColor Gray
}

# ===========================================
# 9. MEDIA - TRASH OPERATIONS
# ===========================================
Write-Host "`n=== 9. MEDIA - TRASH OPERATIONS ===" -ForegroundColor Cyan

Test-Endpoint "DELETE /media/:id (move to trash with force)" {
    if (!$global:testMediaId) { throw "No test media ID available" }
    
    # Use force=true to bypass "in use" check
    $response = Invoke-RestMethod -Uri "$baseUrl/media/$($global:testMediaId)?force=true" `
        -Method DELETE `
        -Headers @{ Authorization = "Bearer $global:token" }

    if (!$response.success) { throw "Move to trash failed" }
    if ($response.data.message -notlike "*trash*") { throw "Expected trash message" }
    Write-Host "Media moved to trash" -ForegroundColor Gray
}

Test-Endpoint "GET /media?only_trash=true" {
    $media = Invoke-RestMethod -Uri "$baseUrl/media?only_trash=true" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$media.success) { throw "List trash failed" }
    Write-Host "Trashed items: $($media.meta.pagination.count)" -ForegroundColor Gray
}

Test-Endpoint "POST /media/:id/restore" {
    if (!$global:testMediaId) { throw "No test media ID available" }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/media/$global:testMediaId/restore" `
        -Method POST `
        -Headers @{ Authorization = "Bearer $global:token" }

    if (!$response.success) { throw "Restore failed" }
    if ($response.data.deleted_at -ne $null) { throw "Media should not be in trash" }
    Write-Host "Media restored from trash" -ForegroundColor Gray
}

# ===========================================
# 10. MEDIA - VERIFY RESTORE
# ===========================================
Write-Host "`n=== 10. MEDIA - VERIFY RESTORE ===" -ForegroundColor Cyan

Test-Endpoint "GET /media/:id (verify not in trash)" {
    if (!$global:testMediaId) { throw "No test media ID available" }
    
    $media = Invoke-RestMethod -Uri "$baseUrl/media/$global:testMediaId" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$media.success) { throw "Get media failed" }
    if ($media.data.deleted_at -ne $null) { throw "Media should not be in trash" }
    Write-Host "Media is active (not in trash)" -ForegroundColor Gray
}

# ===========================================
# 11. MEDIA - ERROR CASES
# ===========================================
Write-Host "`n=== 11. MEDIA - ERROR CASES ===" -ForegroundColor Cyan

Test-Endpoint "GET /media/:id (invalid ID)" {
    try {
        $media = Invoke-RestMethod -Uri "$baseUrl/media/999999" `
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

Test-Endpoint "POST /media/:id/restore (not in trash)" {
    if (!$global:testMediaId) { throw "No test media ID available" }
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/media/$global:testMediaId/restore" `
            -Method POST `
            -Headers @{ Authorization = "Bearer $global:token" }
        throw "Should have returned 400 (not in trash)"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 400) {
            Write-Host "Correctly returns 400 for item not in trash" -ForegroundColor Gray
        } else {
            throw $_
        }
    }
}

# ===========================================
# 12. MEDIA - ADDITIONAL FILTERS
# ===========================================
Write-Host "`n=== 12. MEDIA - ADDITIONAL FILTERS ===" -ForegroundColor Cyan

Test-Endpoint "GET /media?include=uploader,usage,folder" {
    $media = Invoke-RestMethod -Uri "$baseUrl/media?include=uploader,usage,folder&per_page=3" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$media.success) { throw "Multiple includes failed" }
    Write-Host "Multiple includes working" -ForegroundColor Gray
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

