Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next CMS - REST API Test Suite Runner" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Load environment variables from .env file
. (Join-Path $PSScriptRoot "load-env.ps1")

# Check environment variables
if (-not $env:TEST_USER -or -not $env:TEST_PASS) {
    Write-Host "`nERROR: TEST_USER and TEST_PASS must be configured" -ForegroundColor Red
    Write-Host "`nOptions:" -ForegroundColor Yellow
    Write-Host "  1. Add TEST_USER and TEST_PASS to your .env file" -ForegroundColor Gray
    Write-Host "  2. Set environment variables:" -ForegroundColor Gray
    Write-Host '     $env:TEST_USER = "your_username"' -ForegroundColor Gray
    Write-Host '     $env:TEST_PASS = "your_password"' -ForegroundColor Gray
    Write-Host "`nOr add them to your PowerShell profile for persistence." -ForegroundColor Gray
    exit 1
}

Write-Host "`nTest Configuration:" -ForegroundColor Cyan
Write-Host "  User: $env:TEST_USER" -ForegroundColor Gray
Write-Host "  Password: $('*' * $env:TEST_PASS.Length)" -ForegroundColor Gray

$testFiles = @(
    "test-posts-api.ps1",
    "test-taxonomies-terms-api.ps1",
    "test-media-api.ps1",
    "test-menus-api.ps1"
)

$totalPassed = 0
$totalFailed = 0
$scriptsRun = 0
$scriptsFailed = 0

foreach ($testFile in $testFiles) {
    $testPath = Join-Path $PSScriptRoot $testFile
    
    if (-not (Test-Path $testPath)) {
        Write-Host "`nWARNING: Test file not found: $testFile" -ForegroundColor Yellow
        continue
    }

    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Running: $testFile" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan

    $scriptsRun++
    
    try {
        & $testPath
        
        if ($LASTEXITCODE -ne 0) {
            $scriptsFailed++
            Write-Host "`nTest suite failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        }
    } catch {
        $scriptsFailed++
        Write-Host "`nTest suite crashed: $_" -ForegroundColor Red
    }

    Write-Host "`n" # Add spacing between test suites
}

# Final summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ALL TESTS SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Suites Run: $scriptsRun" -ForegroundColor White
Write-Host "Suites Passed: $($scriptsRun - $scriptsFailed)" -ForegroundColor Green
Write-Host "Suites Failed: $scriptsFailed" -ForegroundColor $(if ($scriptsFailed -gt 0) { "Red" } else { "Green" })

if ($scriptsFailed -eq 0) {
    Write-Host "`nAll test suites completed successfully!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`nSome test suites failed" -ForegroundColor Red
    exit 1
}

