Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Menus API - Test Suite" -ForegroundColor Cyan
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
# 2. MENUS - LIST ALL
# ===========================================
Write-Host "`n=== 2. MENUS - LIST ALL ===" -ForegroundColor Cyan

$global:testMenuId = $null

Test-Endpoint "GET /menus (default)" {
    $menus = Invoke-RestMethod -Uri "$baseUrl/menus" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$menus.success) { throw "List menus failed" }
    Write-Host "Total menus: $($menus.meta.pagination.total)" -ForegroundColor Gray
    Write-Host "Returned: $($menus.meta.pagination.count)" -ForegroundColor Gray
}

# ===========================================
# 3. MENUS - CREATE NEW
# ===========================================
Write-Host "`n=== 3. MENUS - CREATE NEW ===" -ForegroundColor Cyan

Test-Endpoint "POST /menus (create test menu)" {
    $menuBody = @{
        name = "test-api-menu-$(Get-Date -Format 'HHmmss')"
        location = "test-location"
        description = "Menu created by API test"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/menus" `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $global:token" } `
        -Body $menuBody

    if (!$response.success) { throw "Create menu failed" }
    $global:testMenuId = $response.data.id
    Write-Host "Created menu ID: $global:testMenuId" -ForegroundColor Gray
    Write-Host "Name: $($response.data.name)" -ForegroundColor Gray
}

# ===========================================
# 4. MENUS - GET SINGLE
# ===========================================
Write-Host "`n=== 4. MENUS - GET SINGLE ===" -ForegroundColor Cyan

Test-Endpoint "GET /menus/:id" {
    if (!$global:testMenuId) { throw "No test menu ID available" }
    
    $menu = Invoke-RestMethod -Uri "$baseUrl/menus/$global:testMenuId" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$menu.success) { throw "Get single menu failed" }
    Write-Host "Menu: $($menu.data.name)" -ForegroundColor Gray
    Write-Host "Location: $($menu.data.location)" -ForegroundColor Gray
    Write-Host "Item count: $($menu.data.item_count)" -ForegroundColor Gray
}

# ===========================================
# 5. MENUS - UPDATE
# ===========================================
Write-Host "`n=== 5. MENUS - UPDATE ===" -ForegroundColor Cyan

Test-Endpoint "PATCH /menus/:id (update description)" {
    if (!$global:testMenuId) { throw "No test menu ID available" }
    
    $update = @{
        description = "Updated description at $(Get-Date -Format 'HH:mm:ss')"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/menus/$global:testMenuId" `
        -Method PATCH `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $global:token" } `
        -Body $update

    if (!$response.success) { throw "Update failed" }
    Write-Host "Description updated" -ForegroundColor Gray
}

# ===========================================
# 6. MENU ITEMS - CREATE
# ===========================================
Write-Host "`n=== 6. MENU ITEMS - CREATE ===" -ForegroundColor Cyan

$global:testItem1Id = $null
$global:testItem2Id = $null
$global:testItem3Id = $null

Test-Endpoint "POST /menus/:id/items (custom URL)" {
    if (!$global:testMenuId) { throw "No test menu ID available" }
    
    $itemBody = @{
        type = "custom"
        custom_url = "https://example.com"
        custom_label = "Example Link"
        target = "_blank"
        menu_order = 1
        meta = @{
            icon = "external-link"
            css_class = "nav-item"
        }
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/menus/$global:testMenuId/items" `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $global:token" } `
        -Body $itemBody

    if (!$response.success) { throw "Create menu item failed" }
    $global:testItem1Id = $response.data.id
    Write-Host "Created item ID: $global:testItem1Id" -ForegroundColor Gray
}

Test-Endpoint "POST /menus/:id/items (second item)" {
    if (!$global:testMenuId) { throw "No test menu ID available" }
    
    $itemBody = @{
        type = "custom"
        custom_url = "/about"
        custom_label = "About Us"
        target = "_self"
        menu_order = 2
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/menus/$global:testMenuId/items" `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $global:token" } `
        -Body $itemBody

    if (!$response.success) { throw "Create second item failed" }
    $global:testItem2Id = $response.data.id
    Write-Host "Created item ID: $global:testItem2Id" -ForegroundColor Gray
}

Test-Endpoint "POST /menus/:id/items (nested item)" {
    if (!$global:testMenuId -or !$global:testItem1Id) { throw "Prerequisites missing" }
    
    $itemBody = @{
        type = "custom"
        custom_url = "/subpage"
        custom_label = "Sub Page"
        parent_id = $global:testItem1Id
        menu_order = 1
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/menus/$global:testMenuId/items" `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $global:token" } `
        -Body $itemBody

    if (!$response.success) { throw "Create nested item failed" }
    $global:testItem3Id = $response.data.id
    Write-Host "Created nested item ID: $global:testItem3Id (parent: $global:testItem1Id)" -ForegroundColor Gray
}

# ===========================================
# 7. MENU ITEMS - GET SINGLE
# ===========================================
Write-Host "`n=== 7. MENU ITEMS - GET SINGLE ===" -ForegroundColor Cyan

Test-Endpoint "GET /menus/:id/items/:itemId" {
    if (!$global:testMenuId -or !$global:testItem1Id) { throw "Prerequisites missing" }
    
    $item = Invoke-RestMethod -Uri "$baseUrl/menus/$global:testMenuId/items/$global:testItem1Id" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$item.success) { throw "Get menu item failed" }
    Write-Host "Item: $($item.data.custom_label)" -ForegroundColor Gray
    Write-Host "Type: $($item.data.type)" -ForegroundColor Gray
    Write-Host "Order: $($item.data.menu_order)" -ForegroundColor Gray
}

# ===========================================
# 8. MENUS - GET WITH HIERARCHY
# ===========================================
Write-Host "`n=== 8. MENUS - GET WITH HIERARCHY ===" -ForegroundColor Cyan

Test-Endpoint "GET /menus/:id (hierarchical structure)" {
    if (!$global:testMenuId) { throw "No test menu ID available" }
    
    $menu = Invoke-RestMethod -Uri "$baseUrl/menus/$($global:testMenuId)?hierarchical=true" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$menu.success) { throw "Get menu with hierarchy failed" }
    Write-Host "Total items: $($menu.data.item_count)" -ForegroundColor Gray
    Write-Host "Root items: $($menu.data.items.Count)" -ForegroundColor Gray
    
    # Check for nested structure
    $hasChildren = $false
    foreach ($item in $menu.data.items) {
        if ($item.children -and $item.children.Count -gt 0) {
            $hasChildren = $true
            Write-Host "Item '$($item.custom_label)' has $($item.children.Count) child(ren)" -ForegroundColor Gray
        }
    }
    if (!$hasChildren) { throw "Expected hierarchical structure with children" }
}

# ===========================================
# 9. MENU ITEMS - UPDATE
# ===========================================
Write-Host "`n=== 9. MENU ITEMS - UPDATE ===" -ForegroundColor Cyan

Test-Endpoint "PATCH /menus/:id/items/:itemId" {
    if (!$global:testMenuId -or !$global:testItem2Id) { throw "Prerequisites missing" }
    
    $update = @{
        custom_label = "Updated Label"
        menu_order = 5
        meta = @{
            badge = "New"
        }
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/menus/$global:testMenuId/items/$global:testItem2Id" `
        -Method PATCH `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $global:token" } `
        -Body $update

    if (!$response.success) { throw "Update menu item failed" }
    Write-Host "Updated item label and order" -ForegroundColor Gray
}

# ===========================================
# 10. MENU ITEMS - REORDER
# ===========================================
Write-Host "`n=== 10. MENU ITEMS - REORDER ===" -ForegroundColor Cyan

Test-Endpoint "PUT /menus/:id/items (reorder)" {
    if (!$global:testMenuId -or !$global:testItem1Id -or !$global:testItem2Id) { 
        throw "Prerequisites missing" 
    }
    
    $reorder = @{
        items = @(
            @{ id = $global:testItem2Id; menu_order = 1; parent_id = $null }
            @{ id = $global:testItem1Id; menu_order = 2; parent_id = $null }
            @{ id = $global:testItem3Id; menu_order = 1; parent_id = $global:testItem1Id }
        )
    } | ConvertTo-Json -Depth 3

    $response = Invoke-RestMethod -Uri "$baseUrl/menus/$global:testMenuId/items" `
        -Method PUT `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $global:token" } `
        -Body $reorder

    if (!$response.success) { throw "Reorder failed" }
    Write-Host "Reordered $($response.data.updated) items" -ForegroundColor Gray
}

# ===========================================
# 11. MENUS - SEARCH
# ===========================================
Write-Host "`n=== 11. MENUS - SEARCH ===" -ForegroundColor Cyan

Test-Endpoint "GET /menus?search=test" {
    $menus = Invoke-RestMethod -Uri "$baseUrl/menus?search=test" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$menus.success) { throw "Search failed" }
    Write-Host "Search results: $($menus.meta.pagination.count)" -ForegroundColor Gray
}

# ===========================================
# 12. MENUS - LIST WITH ITEMS
# ===========================================
Write-Host "`n=== 12. MENUS - LIST WITH ITEMS ===" -ForegroundColor Cyan

Test-Endpoint "GET /menus?include=items" {
    $menus = Invoke-RestMethod -Uri "$baseUrl/menus?include=items&per_page=5" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$menus.success) { throw "List with items failed" }
    Write-Host "Menus with items loaded" -ForegroundColor Gray
    if ($menus.data.Count -gt 0 -and $menus.data[0].items) {
        Write-Host "First menu has items included" -ForegroundColor Gray
    }
}

# ===========================================
# 13. MENU ITEMS - ERROR CASES
# ===========================================
Write-Host "`n=== 13. MENU ITEMS - ERROR CASES ===" -ForegroundColor Cyan

Test-Endpoint "DELETE /menus/:id/items/:itemId (with children)" {
    if (!$global:testMenuId -or !$global:testItem1Id) { throw "Prerequisites missing" }
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/menus/$global:testMenuId/items/$global:testItem1Id" `
            -Method DELETE `
            -Headers @{ Authorization = "Bearer $global:token" }
        throw "Should have returned 400 (has children)"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 400) {
            Write-Host "Correctly prevents deletion of item with children" -ForegroundColor Gray
        } else {
            throw $_
        }
    }
}

Test-Endpoint "POST /menus/:id/items (invalid type)" {
    if (!$global:testMenuId) { throw "No test menu ID available" }
    
    try {
        $itemBody = @{
            type = "invalid_type"
            custom_url = "/test"
            custom_label = "Test"
        } | ConvertTo-Json

        $response = Invoke-RestMethod -Uri "$baseUrl/menus/$global:testMenuId/items" `
            -Method POST `
            -ContentType "application/json" `
            -Headers @{ Authorization = "Bearer $global:token" } `
            -Body $itemBody
        throw "Should have returned 400 (invalid type)"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 400) {
            Write-Host "Correctly validates menu item type" -ForegroundColor Gray
        } else {
            throw $_
        }
    }
}

# ===========================================
# 14. CLEANUP - DELETE ITEMS
# ===========================================
Write-Host "`n=== 14. CLEANUP - DELETE ITEMS ===" -ForegroundColor Cyan

Test-Endpoint "DELETE /menus/:id/items/:itemId (nested item first)" {
    if (!$global:testMenuId -or !$global:testItem3Id) { throw "Prerequisites missing" }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/menus/$global:testMenuId/items/$global:testItem3Id" `
        -Method DELETE `
        -Headers @{ Authorization = "Bearer $global:token" }

    if (!$response.success) { throw "Delete nested item failed" }
    Write-Host "Deleted nested item" -ForegroundColor Gray
}

Test-Endpoint "DELETE /menus/:id/items/:itemId (first item)" {
    if (!$global:testMenuId -or !$global:testItem1Id) { throw "Prerequisites missing" }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/menus/$global:testMenuId/items/$global:testItem1Id" `
        -Method DELETE `
        -Headers @{ Authorization = "Bearer $global:token" }

    if (!$response.success) { throw "Delete first item failed" }
    Write-Host "Deleted first item" -ForegroundColor Gray
}

Test-Endpoint "DELETE /menus/:id/items/:itemId (second item)" {
    if (!$global:testMenuId -or !$global:testItem2Id) { throw "Prerequisites missing" }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/menus/$global:testMenuId/items/$global:testItem2Id" `
        -Method DELETE `
        -Headers @{ Authorization = "Bearer $global:token" }

    if (!$response.success) { throw "Delete second item failed" }
    Write-Host "Deleted second item" -ForegroundColor Gray
}

# ===========================================
# 15. CLEANUP - DELETE MENU
# ===========================================
Write-Host "`n=== 15. CLEANUP - DELETE MENU ===" -ForegroundColor Cyan

Test-Endpoint "DELETE /menus/:id" {
    if (!$global:testMenuId) { throw "No test menu ID available" }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/menus/$global:testMenuId" `
        -Method DELETE `
        -Headers @{ Authorization = "Bearer $global:token" }

    if (!$response.success) { throw "Delete menu failed" }
    Write-Host "Test menu deleted" -ForegroundColor Gray
}

# ===========================================
# 16. ERROR CASES
# ===========================================
Write-Host "`n=== 16. ERROR CASES ===" -ForegroundColor Cyan

Test-Endpoint "GET /menus/:id (invalid ID)" {
    try {
        $menu = Invoke-RestMethod -Uri "$baseUrl/menus/999999" `
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

Test-Endpoint "POST /menus (duplicate name)" {
    # First, create a menu
    $menuBody = @{
        name = "duplicate-test-menu"
        location = "test"
    } | ConvertTo-Json

    $first = Invoke-RestMethod -Uri "$baseUrl/menus" `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $global:token" } `
        -Body $menuBody

    $firstId = $first.data.id

    # Try to create duplicate
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/menus" `
            -Method POST `
            -ContentType "application/json" `
            -Headers @{ Authorization = "Bearer $global:token" } `
            -Body $menuBody
        throw "Should have returned 409 (conflict)"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 409) {
            Write-Host "Correctly prevents duplicate menu names" -ForegroundColor Gray
        } else {
            throw $_
        }
    }

    # Cleanup
    Invoke-RestMethod -Uri "$baseUrl/menus/$firstId" `
        -Method DELETE `
        -Headers @{ Authorization = "Bearer $global:token" } | Out-Null
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
} else {
    Write-Host "`nSome tests failed" -ForegroundColor Red
}

