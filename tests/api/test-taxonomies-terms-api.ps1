Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Taxonomies & Terms API - Test Suite" -ForegroundColor Cyan
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
# 2. TAXONOMIES - LIST
# ===========================================
Write-Host "`n=== 2. TAXONOMIES - LIST ===" -ForegroundColor Cyan

Test-Endpoint "GET /taxonomies (default)" {
    $taxonomies = Invoke-RestMethod -Uri "$baseUrl/taxonomies" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$taxonomies.success) { throw "List taxonomies failed" }
    Write-Host "Total taxonomies: $($taxonomies.meta.pagination.total)" -ForegroundColor Gray
    Write-Host "Returned: $($taxonomies.meta.pagination.count)" -ForegroundColor Gray
}

# ===========================================
# 3. TAXONOMIES - GET SINGLE
# ===========================================
Write-Host "`n=== 3. TAXONOMIES - GET SINGLE ===" -ForegroundColor Cyan

Test-Endpoint "GET /taxonomies/:id (category)" {
    $taxonomy = Invoke-RestMethod -Uri "$baseUrl/taxonomies/1" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$taxonomy.success) { throw "Get taxonomy failed" }
    Write-Host "Taxonomy: $($taxonomy.data.label)" -ForegroundColor Gray
    Write-Host "Hierarchical: $($taxonomy.data.hierarchical)" -ForegroundColor Gray
    Write-Host "Term count: $($taxonomy.data.term_count)" -ForegroundColor Gray
}

# ===========================================
# 4. TAXONOMIES - CREATE
# ===========================================
Write-Host "`n=== 4. TAXONOMIES - CREATE ===" -ForegroundColor Cyan

$global:testTaxonomyId = $null

Test-Endpoint "POST /taxonomies (create custom taxonomy)" {
    $newTaxonomy = @{
        name = "test_taxonomy_$(Get-Date -Format 'HHmmss')"
        label = "Test Taxonomy"
        singular_label = "Test Item"
        description = "Created via API test"
        hierarchical = $true
        show_in_dashboard = $true
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/taxonomies" `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $global:token" } `
        -Body $newTaxonomy

    if (!$response.success) { throw "Create taxonomy failed" }
    $global:testTaxonomyId = $response.data.id
    Write-Host "Created taxonomy ID: $global:testTaxonomyId" -ForegroundColor Gray
    Write-Host "Name: $($response.data.name)" -ForegroundColor Gray
}

# ===========================================
# 5. TAXONOMIES - UPDATE
# ===========================================
Write-Host "`n=== 5. TAXONOMIES - UPDATE ===" -ForegroundColor Cyan

Test-Endpoint "PATCH /taxonomies/:id (partial update)" {
    if (!$global:testTaxonomyId) { throw "No test taxonomy ID available" }
    
    $update = @{
        label = "Updated Test Taxonomy"
        menu_position = 50
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/taxonomies/$global:testTaxonomyId" `
        -Method PATCH `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $global:token" } `
        -Body $update

    if (!$response.success) { throw "Update failed" }
    if ($response.data.menu_position -ne 50) { throw "Menu position not updated" }
    Write-Host "Label updated to: $($response.data.label)" -ForegroundColor Gray
}

# ===========================================
# 6. TERMS - LIST ALL
# ===========================================
Write-Host "`n=== 6. TERMS - LIST ALL ===" -ForegroundColor Cyan

Test-Endpoint "GET /terms (all)" {
    $terms = Invoke-RestMethod -Uri "$baseUrl/terms" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$terms.success) { throw "List terms failed" }
    Write-Host "Total terms: $($terms.meta.pagination.total)" -ForegroundColor Gray
}

Test-Endpoint "GET /terms?taxonomy=category" {
    $terms = Invoke-RestMethod -Uri "$baseUrl/terms?taxonomy=category" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$terms.success) { throw "List category terms failed" }
    Write-Host "Category terms: $($terms.meta.pagination.count)" -ForegroundColor Gray
}

Test-Endpoint "GET /terms?taxonomy=tag" {
    $terms = Invoke-RestMethod -Uri "$baseUrl/terms?taxonomy=tag" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$terms.success) { throw "List tag terms failed" }
    Write-Host "Tag terms: $($terms.meta.pagination.count)" -ForegroundColor Gray
}

# ===========================================
# 7. TERMS - CREATE
# ===========================================
Write-Host "`n=== 7. TERMS - CREATE ===" -ForegroundColor Cyan

$global:testTermId = $null

Test-Endpoint "POST /terms (create in test taxonomy)" {
    if (!$global:testTaxonomyId) { throw "No test taxonomy ID available" }
    
    $newTerm = @{
        taxonomy_id = $global:testTaxonomyId
        name = "Test Term $(Get-Date -Format 'HH:mm:ss')"
        description = "Created via API test"
        meta = @{
            color = "#ff0000"
            priority = 5
        }
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/terms" `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $global:token" } `
        -Body $newTerm

    if (!$response.success) { throw "Create term failed" }
    $global:testTermId = $response.data.id
    Write-Host "Created term ID: $global:testTermId" -ForegroundColor Gray
    Write-Host "Name: $($response.data.name)" -ForegroundColor Gray
    Write-Host "Slug: $($response.data.slug)" -ForegroundColor Gray
}

Test-Endpoint "POST /terms (create child term)" {
    if (!$global:testTaxonomyId -or !$global:testTermId) { throw "Missing required IDs" }
    
    $childTerm = @{
        taxonomy_id = $global:testTaxonomyId
        name = "Child Test Term"
        parent_id = $global:testTermId
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/terms" `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $global:token" } `
        -Body $childTerm

    if (!$response.success) { throw "Create child term failed" }
    Write-Host "Created child term ID: $($response.data.id)" -ForegroundColor Gray
}

# ===========================================
# 8. TERMS - GET SINGLE
# ===========================================
Write-Host "`n=== 8. TERMS - GET SINGLE ===" -ForegroundColor Cyan

Test-Endpoint "GET /terms/:id (basic)" {
    if (!$global:testTermId) { throw "No test term ID available" }
    
    $term = Invoke-RestMethod -Uri "$baseUrl/terms/$global:testTermId" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$term.success) { throw "Get term failed" }
    Write-Host "Term: $($term.data.name)" -ForegroundColor Gray
}

Test-Endpoint "GET /terms/:id?include=children,meta" {
    if (!$global:testTermId) { throw "No test term ID available" }
    
    $term = Invoke-RestMethod -Uri "$baseUrl/terms/$($global:testTermId)?include=children,meta" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$term.success) { throw "Get term with includes failed" }
    Write-Host "Term with relations loaded" -ForegroundColor Gray
    if ($term.data.children) {
        Write-Host "Children count: $($term.data.children.Count)" -ForegroundColor Gray
    }
}

# ===========================================
# 9. TERMS - FILTER BY PARENT
# ===========================================
Write-Host "`n=== 9. TERMS - FILTER BY PARENT ===" -ForegroundColor Cyan

Test-Endpoint "GET /terms?parent_id=0 (top-level)" {
    $terms = Invoke-RestMethod -Uri "$baseUrl/terms?taxonomy_id=$($global:testTaxonomyId)&parent_id=0" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$terms.success) { throw "Filter by parent failed" }
    Write-Host "Top-level terms: $($terms.meta.pagination.count)" -ForegroundColor Gray
}

Test-Endpoint "GET /terms?parent_id=X (children)" {
    if (!$global:testTermId) { throw "No test term ID available" }
    
    $terms = Invoke-RestMethod -Uri "$baseUrl/terms?parent_id=$global:testTermId" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$terms.success) { throw "Get children failed" }
    Write-Host "Child terms: $($terms.meta.pagination.count)" -ForegroundColor Gray
}

# ===========================================
# 10. TERMS - UPDATE
# ===========================================
Write-Host "`n=== 10. TERMS - UPDATE ===" -ForegroundColor Cyan

Test-Endpoint "PATCH /terms/:id (partial update)" {
    if (!$global:testTermId) { throw "No test term ID available" }
    
    $update = @{
        description = "Updated description via API test"
        meta = @{
            color = "#00ff00"
            priority = 10
        }
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/terms/$global:testTermId" `
        -Method PATCH `
        -ContentType "application/json" `
        -Headers @{ Authorization = "Bearer $global:token" } `
        -Body $update

    if (!$response.success) { throw "Update failed" }
    Write-Host "Description updated" -ForegroundColor Gray
}

# ===========================================
# 11. TERMS - SEARCH
# ===========================================
Write-Host "`n=== 11. TERMS - SEARCH ===" -ForegroundColor Cyan

Test-Endpoint "GET /terms?search=test" {
    $terms = Invoke-RestMethod -Uri "$baseUrl/terms?search=test" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    if (!$terms.success) { throw "Search failed" }
    Write-Host "Search results: $($terms.meta.pagination.count)" -ForegroundColor Gray
}

# ===========================================
# 12. CLEANUP - DELETE TERMS
# ===========================================
Write-Host "`n=== 12. CLEANUP - DELETE TERMS ===" -ForegroundColor Cyan

Test-Endpoint "DELETE child terms first" {
    if (!$global:testTermId) { throw "No test term ID available" }
    
    # Get children
    $children = Invoke-RestMethod -Uri "$baseUrl/terms?parent_id=$global:testTermId" `
        -Headers @{ Authorization = "Bearer $global:token" }
    
    # Delete each child
    foreach ($child in $children.data) {
        $response = Invoke-RestMethod -Uri "$baseUrl/terms/$($child.id)" `
            -Method DELETE `
            -Headers @{ Authorization = "Bearer $global:token" }
        
        if (!$response.success) { throw "Delete child term failed" }
    }
    
    Write-Host "Deleted $($children.data.Count) child term(s)" -ForegroundColor Gray
}

Test-Endpoint "DELETE /terms/:id (parent)" {
    if (!$global:testTermId) { throw "No test term ID available" }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/terms/$global:testTermId" `
        -Method DELETE `
        -Headers @{ Authorization = "Bearer $global:token" }

    if (!$response.success) { throw "Delete term failed" }
    Write-Host "Term deleted successfully" -ForegroundColor Gray
}

# ===========================================
# 13. CLEANUP - DELETE TAXONOMY
# ===========================================
Write-Host "`n=== 13. CLEANUP - DELETE TAXONOMY ===" -ForegroundColor Cyan

Test-Endpoint "DELETE /taxonomies/:id" {
    if (!$global:testTaxonomyId) { throw "No test taxonomy ID available" }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/taxonomies/$global:testTaxonomyId" `
        -Method DELETE `
        -Headers @{ Authorization = "Bearer $global:token" }

    if (!$response.success) { throw "Delete taxonomy failed" }
    Write-Host "Taxonomy deleted successfully" -ForegroundColor Gray
}

# ===========================================
# 14. VERIFY CLEANUP
# ===========================================
Write-Host "`n=== 14. VERIFY CLEANUP ===" -ForegroundColor Cyan

Test-Endpoint "GET /taxonomies/:id (verify deleted)" {
    if (!$global:testTaxonomyId) { throw "No test taxonomy ID available" }
    
    try {
        $taxonomy = Invoke-RestMethod -Uri "$baseUrl/taxonomies/$global:testTaxonomyId" `
            -Headers @{ Authorization = "Bearer $global:token" }
        throw "Taxonomy still exists after delete"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 404) {
            Write-Host "Taxonomy correctly returns 404" -ForegroundColor Gray
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

