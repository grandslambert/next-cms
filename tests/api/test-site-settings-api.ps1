# Test Suite for Site Settings API
# Tests all operations for site-specific settings management

# Load environment variables
. "$PSScriptRoot\load-env.ps1"

$baseUrl = if ($env:TEST_BASE_URL) { $env:TEST_BASE_URL } else { "http://localhost:3000" }
$username = if ($env:TEST_USER) { $env:TEST_USER } else { "couleeweb" }
$password = if ($env:TEST_PASS) { $env:TEST_PASS } else { "Test123!" }

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Site Settings API Test Suite" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Track test results
$passed = 0
$failed = 0
$testSettingKey = "test_setting_$(Get-Date -Format 'yyyyMMddHHmmss')"

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

# Test 2: List site settings
Write-Host "`nTest 2: List site settings" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/settings/site?page=1&per_page=50" `
        -Method Get `
        -Headers $headers
    
    if ($response.success) {
        Write-Host "[ PASS ] Listed $($response.meta.count) settings" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[ FAIL ] List failed" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "[ FAIL ] Error: $_" -ForegroundColor Red
    $failed++
}

# Test 3: Search settings
Write-Host "`nTest 3: Search settings" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/settings/site?search=site" `
        -Method Get `
        -Headers $headers
    
    if ($response.success) {
        Write-Host "[ PASS ] Search returned $($response.meta.count) settings" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[ FAIL ] Search failed" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "[ FAIL ] Error: $_" -ForegroundColor Red
    $failed++
}

# Test 4: Create string setting
Write-Host "`nTest 4: Create string setting" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/settings/site/$testSettingKey`_string" `
        -Method Put `
        -Headers $headers `
        -Body (@{
            setting_value = "Test String Value"
            setting_type = "string"
        } | ConvertTo-Json)
    
    if ($response.success -and $response.data.parsed_value -eq "Test String Value") {
        Write-Host "[ PASS ] String setting created successfully" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[ FAIL ] String setting creation failed" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "[ FAIL ] Error: $_" -ForegroundColor Red
    $failed++
}

# Test 5: Create number setting
Write-Host "`nTest 5: Create number setting" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/settings/site/$testSettingKey`_number" `
        -Method Put `
        -Headers $headers `
        -Body (@{
            setting_value = 42
            setting_type = "number"
        } | ConvertTo-Json)
    
    if ($response.success -and $response.data.parsed_value -eq 42) {
        Write-Host "[ PASS ] Number setting created successfully" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[ FAIL ] Number setting creation failed" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "[ FAIL ] Error: $_" -ForegroundColor Red
    $failed++
}

# Test 6: Create boolean setting (true)
Write-Host "`nTest 6: Create boolean setting (true)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/settings/site/$testSettingKey`_bool_true" `
        -Method Put `
        -Headers $headers `
        -Body (@{
            setting_value = $true
            setting_type = "boolean"
        } | ConvertTo-Json)
    
    if ($response.success -and $response.data.parsed_value -eq $true) {
        Write-Host "[ PASS ] Boolean (true) setting created successfully" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[ FAIL ] Boolean setting creation failed" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "[ FAIL ] Error: $_" -ForegroundColor Red
    $failed++
}

# Test 7: Create boolean setting (false)
Write-Host "`nTest 7: Create boolean setting (false)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/settings/site/$testSettingKey`_bool_false" `
        -Method Put `
        -Headers $headers `
        -Body (@{
            setting_value = $false
            setting_type = "boolean"
        } | ConvertTo-Json)
    
    if ($response.success -and $response.data.parsed_value -eq $false) {
        Write-Host "[ PASS ] Boolean (false) setting created successfully" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[ FAIL ] Boolean setting creation failed" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "[ FAIL ] Error: $_" -ForegroundColor Red
    $failed++
}

# Test 8: Create JSON setting
Write-Host "`nTest 8: Create JSON setting" -ForegroundColor Yellow
try {
    $jsonObject = @{
        theme = "dark"
        sidebar = $true
        colors = @{
            primary = "#3B82F6"
            secondary = "#10B981"
        }
    }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/settings/site/$testSettingKey`_json" `
        -Method Put `
        -Headers $headers `
        -Body (@{
            setting_value = $jsonObject
            setting_type = "json"
        } | ConvertTo-Json -Depth 10)
    
    if ($response.success -and $response.data.parsed_value.theme -eq "dark") {
        Write-Host "[ PASS ] JSON setting created successfully" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[ FAIL ] JSON setting creation failed" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "[ FAIL ] Error: $_" -ForegroundColor Red
    $failed++
}

# Test 9: Get string setting
Write-Host "`nTest 9: Get string setting" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/settings/site/$testSettingKey`_string" `
        -Method Get `
        -Headers $headers
    
    if ($response.success -and $response.data.parsed_value -eq "Test String Value") {
        Write-Host "[ PASS ] String setting retrieved successfully" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[ FAIL ] String setting retrieval failed" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "[ FAIL ] Error: $_" -ForegroundColor Red
    $failed++
}

# Test 10: Get non-existent setting (404)
Write-Host "`nTest 10: Get non-existent setting (404)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/settings/site/nonexistent_setting_12345" `
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

# Test 11: Update string setting
Write-Host "`nTest 11: Update string setting" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/settings/site/$testSettingKey`_string" `
        -Method Put `
        -Headers $headers `
        -Body (@{
            setting_value = "Updated String Value"
            setting_type = "string"
        } | ConvertTo-Json)
    
    if ($response.success -and $response.data.parsed_value -eq "Updated String Value") {
        Write-Host "[ PASS ] String setting updated successfully" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[ FAIL ] String setting update failed" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "[ FAIL ] Error: $_" -ForegroundColor Red
    $failed++
}

# Test 12: Update number setting
Write-Host "`nTest 12: Update number setting" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/settings/site/$testSettingKey`_number" `
        -Method Patch `
        -Headers $headers `
        -Body (@{
            setting_value = 100
        } | ConvertTo-Json)
    
    if ($response.success -and $response.data.parsed_value -eq 100) {
        Write-Host "[ PASS ] Number setting updated successfully" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[ FAIL ] Number setting update failed" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "[ FAIL ] Error: $_" -ForegroundColor Red
    $failed++
}

# Test 13: Toggle boolean setting
Write-Host "`nTest 13: Toggle boolean setting" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/settings/site/$testSettingKey`_bool_true" `
        -Method Patch `
        -Headers $headers `
        -Body (@{
            setting_value = $false
        } | ConvertTo-Json)
    
    if ($response.success -and $response.data.parsed_value -eq $false) {
        Write-Host "[ PASS ] Boolean setting toggled successfully" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[ FAIL ] Boolean setting toggle failed" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "[ FAIL ] Error: $_" -ForegroundColor Red
    $failed++
}

# Test 14: Update JSON setting
Write-Host "`nTest 14: Update JSON setting" -ForegroundColor Yellow
try {
    $updatedJsonObject = @{
        theme = "light"
        sidebar = $false
        colors = @{
            primary = "#EF4444"
            secondary = "#F59E0B"
        }
        new_field = "added"
    }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/settings/site/$testSettingKey`_json" `
        -Method Patch `
        -Headers $headers `
        -Body (@{
            setting_value = $updatedJsonObject
        } | ConvertTo-Json -Depth 10)
    
    if ($response.success -and $response.data.parsed_value.theme -eq "light" -and $response.data.parsed_value.new_field -eq "added") {
        Write-Host "[ PASS ] JSON setting updated successfully" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[ FAIL ] JSON setting update failed" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "[ FAIL ] Error: $_" -ForegroundColor Red
    $failed++
}

# Test 15: Update without setting_value (400)
Write-Host "`nTest 15: Update without setting_value (400)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/settings/site/$testSettingKey`_string" `
        -Method Put `
        -Headers $headers `
        -Body (@{
            some_other_field = "value"
        } | ConvertTo-Json)
    
    Write-Host "[ FAIL ] Expected 400 validation error, got success" -ForegroundColor Red
    $failed++
} catch {
    if ($_.Exception.Response.StatusCode.Value__ -eq 400) {
        Write-Host "[ PASS ] Correctly returned 400 for missing setting_value" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[ FAIL ] Wrong error code: $($_.Exception.Response.StatusCode.Value__)" -ForegroundColor Red
        $failed++
    }
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

