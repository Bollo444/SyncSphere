# SyncSphere Development Environment Launcher (PowerShell)
# Enhanced version with better error handling and monitoring

param(
    [switch]$NoDocker,
    [switch]$BackendOnly,
    [switch]$FrontendOnly,
    [switch]$Verbose
)

# Colors for output
$ErrorColor = "Red"
$SuccessColor = "Green"
$InfoColor = "Cyan"
$WarningColor = "Yellow"

function Write-Status {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Write-Header {
    param([string]$Title)
    Write-Host "`n========================================" -ForegroundColor $InfoColor
    Write-Host "    $Title" -ForegroundColor $InfoColor
    Write-Host "========================================`n" -ForegroundColor $InfoColor
}

function Test-ServiceRunning {
    param([string]$ProcessName)
    return (Get-Process -Name $ProcessName -ErrorAction SilentlyContinue) -ne $null
}

function Test-PortOpen {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    } catch {
        return $false
    }
}

Write-Header "SyncSphere Development Launcher"

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $ScriptDir "backend"
$FrontendDir = Join-Path $ScriptDir "frontend"

# Validate directories exist
if (!(Test-Path $BackendDir)) {
    Write-Status "[ERROR] Backend directory not found: $BackendDir" $ErrorColor
    exit 1
}

if (!(Test-Path $FrontendDir)) {
    Write-Status "[ERROR] Frontend directory not found: $FrontendDir" $ErrorColor
    exit 1
}

# Step 1: Check Docker (unless skipped)
if (!$NoDocker) {
    Write-Status "[1/4] Checking Docker status..." $InfoColor
    try {
        $dockerInfo = docker info 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Status "[ERROR] Docker is not running. Please start Docker Desktop first." $ErrorColor
            Write-Status "[TIP] Use -NoDocker flag to skip Docker services" $WarningColor
            exit 1
        }
        Write-Status "[OK] Docker is running" $SuccessColor
    } catch {
        Write-Status "[ERROR] Docker command not found. Please install Docker Desktop." $ErrorColor
        exit 1
    }

    # Step 2: Start Docker services
    Write-Status "`n[2/4] Starting Docker services (PostgreSQL + Redis)..." $InfoColor
    Set-Location $ScriptDir
    $dockerResult = docker-compose up -d 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Status "[ERROR] Failed to start Docker services" $ErrorColor
        Write-Status $dockerResult $ErrorColor
        exit 1
    }
    Write-Status "[OK] Docker services started" $SuccessColor

    # Step 3: Wait for services
    Write-Status "`n[3/4] Waiting for services to initialize..." $InfoColor
    $maxWait = 30
    $waited = 0
    
    while ($waited -lt $maxWait) {
        if ((Test-PortOpen 5432) -and (Test-PortOpen 6379)) {
            Write-Status "[OK] PostgreSQL and Redis are ready" $SuccessColor
            break
        }
        Start-Sleep -Seconds 1
        $waited++
        if ($Verbose) {
            Write-Status "Waiting for services... ($waited/$maxWait)" $WarningColor
        }
    }
    
    if ($waited -eq $maxWait) {
        Write-Status "[WARNING] Services may not be fully ready, but continuing..." $WarningColor
    }
} else {
    Write-Status "[INFO] Skipping Docker services" $WarningColor
}

# Step 4: Launch development servers
Write-Status "`n[4/4] Launching development servers..." $InfoColor

$processes = @()

# Start Backend (unless frontend-only)
if (!$FrontendOnly) {
    Write-Status "[INFO] Starting Backend Server..." $InfoColor
    $backendProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$BackendDir`" && echo Starting SyncSphere Backend Server... && npm run dev" -WindowStyle Normal -PassThru
    $processes += @{Name="Backend"; Process=$backendProcess; Port=3000}
    Start-Sleep -Seconds 2
}

# Start Frontend (unless backend-only)
if (!$BackendOnly) {
    Write-Status "[INFO] Starting Frontend Server..." $InfoColor
    $frontendProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$FrontendDir`" && echo Starting SyncSphere Frontend Server... && npm run dev" -WindowStyle Normal -PassThru
    $processes += @{Name="Frontend"; Process=$frontendProcess; Port=5173}
}

Write-Header "All Services Launched Successfully!"

Write-Status "Service URLs:" $InfoColor
if (!$FrontendOnly) {
    Write-Status "   • Backend:  http://localhost:3000" $SuccessColor
}
if (!$BackendOnly) {
    Write-Status "   • Frontend: http://localhost:5173" $SuccessColor
}
if (!$NoDocker) {
    Write-Status "   • PostgreSQL: localhost:5432" $SuccessColor
    Write-Status "   • Redis: localhost:6379" $SuccessColor
}

Write-Status "`nManagement Tips:" $InfoColor
Write-Status "   • Each service runs in its own command prompt" $WarningColor
Write-Status "   • Close command prompts to stop individual services" $WarningColor
Write-Status "   • Use Ctrl+C in each window for graceful shutdown" $WarningColor
if (!$NoDocker) {
    Write-Status "   • Run 'docker-compose down' to stop Docker services" $WarningColor
}

Write-Status "`nScript Options:" $InfoColor
Write-Status "   • -NoDocker: Skip Docker services" $WarningColor
Write-Status "   • -BackendOnly: Start only backend" $WarningColor
Write-Status "   • -FrontendOnly: Start only frontend" $WarningColor
Write-Status "   • -Verbose: Show detailed output" $WarningColor

Write-Status "`n[SUCCESS] Development environment is ready!" $SuccessColor
Write-Status "Press any key to exit this launcher..." $InfoColor
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")