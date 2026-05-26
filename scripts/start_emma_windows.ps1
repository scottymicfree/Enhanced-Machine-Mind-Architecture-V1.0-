<#
.SYNOPSIS
Single-click startup script for E.M.M.A. Windows Command Dashboard.
#Requires -RunAsAdministrator
#>

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "     E.M.M.A. WINDOWS COMMAND DASHBOARD - SINGLE CLICK LAUNCHER       " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# 1. Dependency Checks
Write-Host "`n[1/4] Verifying Node.js and Rust environments..." -ForegroundColor Yellow
if (-not (Get-Command "npm" -ErrorAction SilentlyContinue)) {
    Write-Host "[FATAL] Node.js is not installed. Please install Node v18+." -ForegroundColor Red
    exit 1
}
if (-not (Get-Command "cargo" -ErrorAction SilentlyContinue)) {
    Write-Host "[FATAL] Rust/Cargo is not installed. Please install from rustup.rs." -ForegroundColor Red
    exit 1
}

# 2. Front-end Dependencies
Write-Host "`n[2/4] Installing React & Tauri Frontend Dependencies..." -ForegroundColor Yellow
Push-Location ../
npm install
Pop-Location

# 3. Environment Variable Injection
Write-Host "`n[3/4] Validating .env secure context configuration..." -ForegroundColor Yellow
$EnvDir = "../src-tauri"
if (-not (Test-Path "$EnvDir")) {
    New-Item -ItemType Directory -Force -Path $EnvDir | Out-Null
}

if (-not (Test-Path "$EnvDir/.env")) {
    Write-Host "[WARN] .env not found. Creating secure baseline template." -ForegroundColor DarkYellow
    @"
GOOGLE_CLIENT_ID=provide_your_oauth_client_id
GOOGLE_CLIENT_SECRET=provide_your_oauth_secret
LINUX_EDGE_IP=127.0.0.1
WINDOWS_UI_IP=127.0.0.1
"@ | Out-File "$EnvDir/.env" -Encoding utf8
} else {
    Write-Host "[OK] .env configuration located." -ForegroundColor Green
}

# 4. Background Gaze Tracker Launch
Write-Host "`n[4/4] Initializing UDP Gaze Tracker Background Thread..." -ForegroundColor Yellow
if (Get-Command "python" -ErrorAction SilentlyContinue) {
    if (Test-Path "gaze_tracker.py") {
        Write-Host "-> Spooling MediaPipe Eye-Tracking daemon..." -ForegroundColor Green
        Start-Process python -ArgumentList "gaze_tracker.py" -WindowStyle Hidden
    } else {
        Write-Host "-> gaze_tracker.py not found. Gaze telemetry will be mocked." -ForegroundColor DarkYellow
    }
}

# 5. Launch Native Tauri Engine
Write-Host "`n======================================================================" -ForegroundColor Cyan
Write-Host " Booting Native E.M.M.A. WebGPU Dashboard via Cargo...                " -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan

Push-Location ../
npm run tauri dev
Pop-Location
