# SyncSphere PostgreSQL Setup Script for Windows
# This script automates PostgreSQL installation and configuration on Windows

param(
    [string]$Password = "postgres",
    [string]$DatabaseName = "syncsphere",
    [string]$Port = "5432",
    [switch]$SkipInstall,
    [switch]$Force
)

Write-Host "🚀 SyncSphere PostgreSQL Setup for Windows" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Function to check if running as administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Function to check if PostgreSQL is already installed
function Test-PostgreSQLInstalled {
    try {
        $pgVersion = & psql --version 2>$null
        if ($pgVersion) {
            Write-Host "✅ PostgreSQL is already installed: $pgVersion" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "❌ PostgreSQL not found in PATH" -ForegroundColor Yellow
    }
    
    # Check for PostgreSQL service
    $service = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
    if ($service) {
        Write-Host "✅ PostgreSQL service found: $($service.Name)" -ForegroundColor Green
        return $true
    }
    
    return $false
}

# Function to install PostgreSQL using Chocolatey
function Install-PostgreSQLChocolatey {
    Write-Host "📦 Installing PostgreSQL using Chocolatey..." -ForegroundColor Yellow
    
    # Check if Chocolatey is installed
    try {
        choco --version | Out-Null
        Write-Host "✅ Chocolatey is available" -ForegroundColor Green
    } catch {
        Write-Host "❌ Chocolatey not found. Installing Chocolatey first..." -ForegroundColor Red
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    }
    
    # Install PostgreSQL
    Write-Host "📥 Installing PostgreSQL via Chocolatey..." -ForegroundColor Yellow
    choco install postgresql --params "/Password:$Password /Port:$Port" -y
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ PostgreSQL installed successfully via Chocolatey" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ Failed to install PostgreSQL via Chocolatey" -ForegroundColor Red
        return $false
    }
}

# Function to install PostgreSQL manually
function Install-PostgreSQLManual {
    Write-Host "📥 Downloading PostgreSQL installer..." -ForegroundColor Yellow
    
    $installerUrl = "https://get.enterprisedb.com/postgresql/postgresql-15.4-1-windows-x64.exe"
    $installerPath = "$env:TEMP\postgresql-installer.exe"
    
    try {
        Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath -UseBasicParsing
        Write-Host "✅ PostgreSQL installer downloaded" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to download PostgreSQL installer: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    
    Write-Host "🔧 Installing PostgreSQL (this may take a few minutes)..." -ForegroundColor Yellow
    $installArgs = @(
        "--mode", "unattended",
        "--unattendedmodeui", "none",
        "--superpassword", $Password,
        "--serverport", $Port,
        "--locale", "English, United States"
    )
    
    try {
        Start-Process -FilePath $installerPath -ArgumentList $installArgs -Wait -NoNewWindow
        Write-Host "✅ PostgreSQL installation completed" -ForegroundColor Green
        
        # Clean up installer
        Remove-Item $installerPath -Force -ErrorAction SilentlyContinue
        return $true
    } catch {
        Write-Host "❌ Failed to install PostgreSQL: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to configure PostgreSQL PATH
function Set-PostgreSQLPath {
    $pgPaths = @(
        "C:\Program Files\PostgreSQL\15\bin",
        "C:\Program Files\PostgreSQL\14\bin",
        "C:\Program Files\PostgreSQL\13\bin",
        "C:\tools\postgresql\bin"
    )
    
    foreach ($pgPath in $pgPaths) {
        if (Test-Path $pgPath) {
            $currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
            if ($currentPath -notlike "*$pgPath*") {
                Write-Host "[INFO] Adding PostgreSQL to PATH: $pgPath" -ForegroundColor Yellow
                [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$pgPath", "User")
                $env:PATH += ";$pgPath"
            }
            Write-Host "[OK] PostgreSQL PATH configured" -ForegroundColor Green
            return $true
        }
    }
    
    Write-Host "[ERROR] Could not find PostgreSQL installation directory" -ForegroundColor Red
    return $false
}

# Function to test PostgreSQL connection
function Test-PostgreSQLConnection {
    Write-Host "[INFO] Testing PostgreSQL connection..." -ForegroundColor Yellow
    
    $env:PGPASSWORD = $Password
    try {
        $result = & psql -h localhost -p $Port -U postgres -d postgres -c "SELECT version();" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] PostgreSQL connection successful" -ForegroundColor Green
            Write-Host "[INFO] Version: $($result[2])" -ForegroundColor Cyan
            return $true
        }
    } catch {
        Write-Host "[ERROR] Failed to connect to PostgreSQL" -ForegroundColor Red
    }
    
    return $false
}

# Function to create database and user
function New-SyncSphereDatabase {
    Write-Host "[INFO] Creating SyncSphere database..." -ForegroundColor Yellow
    
    $env:PGPASSWORD = $Password
    
    # Check if database already exists
    $dbExists = & psql -h localhost -p $Port -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DatabaseName';" 2>$null
    
    if ($dbExists -eq "1") {
        if ($Force) {
            Write-Host "[WARNING] Database '$DatabaseName' exists. Dropping and recreating..." -ForegroundColor Yellow
            & psql -h localhost -p $Port -U postgres -d postgres -c "DROP DATABASE IF EXISTS $DatabaseName;" | Out-Null
        } else {
            Write-Host "[OK] Database '$DatabaseName' already exists" -ForegroundColor Green
            return $true
        }
    }
    
    # Create database
    $createResult = & psql -h localhost -p $Port -U postgres -d postgres -c "CREATE DATABASE $DatabaseName;" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Database '$DatabaseName' created successfully" -ForegroundColor Green
        return $true
    } else {
        Write-Host "[ERROR] Failed to create database '$DatabaseName'" -ForegroundColor Red
        return $false
    }
}

# Function to initialize database schema
function Initialize-DatabaseSchema {
    Write-Host "[INFO] Initializing database schema..." -ForegroundColor Yellow
    
    $schemaPath = Join-Path $PSScriptRoot "init-db.sql"
    if (-not (Test-Path $schemaPath)) {
        Write-Host "[ERROR] Schema file not found: $schemaPath" -ForegroundColor Red
        return $false
    }
    
    $env:PGPASSWORD = $Password
    $initResult = & psql -h localhost -p $Port -U postgres -d $DatabaseName -f $schemaPath 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Database schema initialized successfully" -ForegroundColor Green
        return $true
    } else {
        Write-Host "[ERROR] Failed to initialize database schema" -ForegroundColor Red
        Write-Host "Error output: $initResult" -ForegroundColor Red
        return $false
    }
}

# Function to update .env file
function Update-EnvironmentFile {
    Write-Host "[INFO] Updating .env configuration..." -ForegroundColor Yellow
    
    $envPath = Join-Path (Split-Path $PSScriptRoot -Parent) ".env"
    
    if (Test-Path $envPath) {
        $envContent = Get-Content $envPath
        $envContent = $envContent -replace "DB_PASSWORD=.*", "DB_PASSWORD=$Password"
        $envContent = $envContent -replace "DB_PORT=.*", "DB_PORT=$Port"
        $envContent = $envContent -replace "DB_NAME=.*", "DB_NAME=$DatabaseName"
        
        Set-Content -Path $envPath -Value $envContent
        Write-Host "[OK] .env file updated with database configuration" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] .env file not found at: $envPath" -ForegroundColor Yellow
        Write-Host "Please ensure your .env file has the following configuration:" -ForegroundColor Yellow
        Write-Host "DB_HOST=localhost" -ForegroundColor Cyan
        Write-Host "DB_PORT=$Port" -ForegroundColor Cyan
        Write-Host "DB_NAME=$DatabaseName" -ForegroundColor Cyan
        Write-Host "DB_USER=postgres" -ForegroundColor Cyan
        Write-Host "DB_PASSWORD=$Password" -ForegroundColor Cyan
    }
}

# Main execution
try {
    Write-Host ""
    Write-Host "[INFO] Checking system requirements..." -ForegroundColor Yellow
    
    # Check if running as administrator for installation
    if (-not $SkipInstall -and -not (Test-Administrator)) {
        Write-Host "[WARNING] Administrator privileges recommended for installation" -ForegroundColor Yellow
        Write-Host "Consider running as administrator or use -SkipInstall flag" -ForegroundColor Yellow
    }
    
    # Check if PostgreSQL is already installed
    $isInstalled = Test-PostgreSQLInstalled
    
    if (-not $isInstalled -and -not $SkipInstall) {
        Write-Host ""
        Write-Host "[INFO] Installing PostgreSQL..." -ForegroundColor Yellow
        
        # Try Chocolatey first, then manual installation
        $installSuccess = Install-PostgreSQLChocolatey
        if (-not $installSuccess) {
            Write-Host "[INFO] Trying manual installation..." -ForegroundColor Yellow
            $installSuccess = Install-PostgreSQLManual
        }
        
        if (-not $installSuccess) {
            throw "Failed to install PostgreSQL. Please install manually."
        }
        
        # Configure PATH
        Set-PostgreSQLPath | Out-Null
        
        # Wait for service to start
        Write-Host "[INFO] Waiting for PostgreSQL service to start..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
    }
    
    # Test connection
    Write-Host ""
    if (-not (Test-PostgreSQLConnection)) {
        throw "Cannot connect to PostgreSQL. Please check the installation and try again."
    }
    
    # Create database
    Write-Host ""
    if (-not (New-SyncSphereDatabase)) {
        throw "Failed to create SyncSphere database."
    }
    
    # Initialize schema
    Write-Host ""
    if (-not (Initialize-DatabaseSchema)) {
        throw "Failed to initialize database schema."
    }
    
    # Update .env file
    Write-Host ""
    Update-EnvironmentFile
    
    Write-Host ""
    Write-Host "[SUCCESS] PostgreSQL setup completed successfully!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "Database: $DatabaseName" -ForegroundColor Cyan
    Write-Host "Host: localhost" -ForegroundColor Cyan
    Write-Host "Port: $Port" -ForegroundColor Cyan
    Write-Host "User: postgres" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "You can now start the SyncSphere backend server!" -ForegroundColor Green
    Write-Host "Run: npm run dev" -ForegroundColor Cyan
    
} catch {
    Write-Host ""
    Write-Host "[ERROR] Setup failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "[INFO] Troubleshooting tips:" -ForegroundColor Yellow
    Write-Host "1. Run as Administrator" -ForegroundColor White
    Write-Host "2. Check Windows Firewall settings" -ForegroundColor White
    Write-Host "3. Verify PostgreSQL service is running" -ForegroundColor White
    Write-Host "4. Try manual installation from https://www.postgresql.org/download/windows/" -ForegroundColor White
    Write-Host ""
    exit 1
}