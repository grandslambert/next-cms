# Load environment variables from .env file
# This script can be dot-sourced by test scripts to load configuration

function Load-EnvFile {
    param(
        [string]$EnvFilePath = "../../.env"
    )
    
    $resolvedPath = Join-Path $PSScriptRoot $EnvFilePath
    
    if (Test-Path $resolvedPath) {
        Write-Host "Loading environment from: $resolvedPath" -ForegroundColor Gray
        
        Get-Content $resolvedPath | ForEach-Object {
            $line = $_.Trim()
            
            # Skip empty lines and comments
            if ($line -eq "" -or $line.StartsWith("#")) {
                return
            }
            
            # Parse KEY=VALUE
            if ($line -match '^([^=]+)=(.*)$') {
                $key = $matches[1].Trim()
                $value = $matches[2].Trim()
                
                # Remove quotes if present
                $value = $value -replace '^[''"]|[''"]$', ''
                
                # Only set if not already set (environment variables take precedence)
                if (-not (Test-Path "env:$key")) {
                    Set-Item -Path "env:$key" -Value $value
                }
            }
        }
        
        return $true
    }
    
    return $false
}

# Load the .env file
$envLoaded = Load-EnvFile

# Set defaults for test credentials if not set
if (-not $env:TEST_USER) {
    $env:TEST_USER = $env:DB_USER
}

if (-not $env:TEST_PASS) {
    $env:TEST_PASS = $env:DB_PASSWORD
}

# Return configuration status
return @{
    EnvFileLoaded = $envLoaded
    TestUser = $env:TEST_USER
    TestPass = if ($env:TEST_PASS) { "*" * $env:TEST_PASS.Length } else { $null }
}

