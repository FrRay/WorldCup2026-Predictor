# start.ps1 — Launch the World Cup Predictor backend (non-Docker mode).
# Requires: Node.js, a running MySQL 8.0 instance, and npm install.
# Usage: .\start.ps1
# Or with custom DB: $env:DB_PASSWORD="mypass"; .\start.ps1

$ErrorActionPreference = "Stop"

$serverDir = Join-Path $PSScriptRoot "server"

# Install dependencies if node_modules is missing
if (-not (Test-Path (Join-Path $serverDir "node_modules"))) {
    Write-Host "Installing server dependencies..." -ForegroundColor Cyan
    Push-Location $serverDir
    try {
        npm install
    } finally {
        Pop-Location
    }
}

# Default env vars for local MySQL
if (-not $env:DB_HOST)       { $env:DB_HOST       = "localhost" }
if (-not $env:DB_PORT)       { $env:DB_PORT       = "3306" }
if (-not $env:DB_USER)       { $env:DB_USER       = "wc26" }
if (-not $env:DB_PASSWORD)   { $env:DB_PASSWORD   = "wc26pass" }
if (-not $env:DB_NAME)       { $env:DB_NAME       = "wc26_predictor" }
if (-not $env:PORT)          { $env:PORT          = "3000" }

Write-Host "Starting World Cup Predictor on http://localhost:$env:PORT" -ForegroundColor Green
Write-Host "Database: $env:DB_USER@$env:DB_HOST`:$env:DB_PORT/$env:DB_NAME" -ForegroundColor Gray

Push-Location $serverDir
try {
    node server.js
} finally {
    Pop-Location
}
