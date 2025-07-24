# SyncSphere Database Setup - Windows Guide

This guide provides step-by-step instructions for setting up PostgreSQL on Windows for the SyncSphere application.

## 🎯 Quick Setup (Recommended)

The fastest way to get started on Windows:

```powershell
# Open PowerShell as Administrator
cd backend
npm run db:setup:windows
```

This automated script will handle everything for you. If you prefer manual setup or encounter issues, follow the detailed instructions below.

## 📋 Prerequisites

- Windows 10 or Windows 11
- Administrator privileges
- Node.js (v16 or higher) - [Download here](https://nodejs.org/)
- PowerShell 5.1 or higher (included with Windows)

## 🚀 Method 1: Automated Setup

### Step 1: Open PowerShell as Administrator

1. Press `Win + X` and select "Windows PowerShell (Admin)" or "Terminal (Admin)"
2. If prompted by User Account Control, click "Yes"

### Step 2: Navigate to Project Directory

```powershell
cd C:\path\to\your\SyncSphere\backend
```

### Step 3: Run Automated Setup

```powershell
# Basic setup with default settings
npm run db:setup:windows

# Or with custom password
powershell -ExecutionPolicy Bypass -File scripts/setup-postgres-windows.ps1 -Password "YourSecurePassword"
```

### Step 4: Verify Setup

```powershell
# Test database connection
npm run db:test

# Start the backend server
npm run dev
```

## 🔧 Method 2: Manual Setup

### Step 1: Download PostgreSQL

1. Visit the [PostgreSQL Downloads page](https://www.postgresql.org/download/windows/)
2. Click "Download the installer"
3. Select the latest version (15.x recommended)
4. Choose the Windows x86-64 installer
5. Download the installer file (approximately 350MB)

### Step 2: Install PostgreSQL

1. **Run the Installer**
   - Right-click the downloaded file and select "Run as administrator"
   - If prompted by Windows Defender, click "More info" then "Run anyway"

2. **Installation Wizard**
   - Click "Next" on the welcome screen
   - **Installation Directory**: Keep default `C:\Program Files\PostgreSQL\15`
   - **Components**: Select all components (PostgreSQL Server, pgAdmin 4, Stack Builder, Command Line Tools)
   - **Data Directory**: Keep default `C:\Program Files\PostgreSQL\15\data`
   - **Password**: Enter a secure password for the postgres user (remember this!)
   - **Port**: Keep default `5432`
   - **Locale**: Select "English, United States"
   - Click "Next" and then "Install"

3. **Complete Installation**
   - Wait for installation to complete (5-10 minutes)
   - Uncheck "Launch Stack Builder" unless you need additional components
   - Click "Finish"

### Step 3: Configure Environment Variables

1. **Add PostgreSQL to PATH**
   - Press `Win + R`, type `sysdm.cpl`, press Enter
   - Click "Environment Variables"
   - Under "System Variables", find and select "Path", click "Edit"
   - Click "New" and add: `C:\Program Files\PostgreSQL\15\bin`
   - Click "OK" on all dialogs

2. **Verify PATH Configuration**
   ```powershell
   # Open new PowerShell window and test
   psql --version
   # Should display: psql (PostgreSQL) 15.x
   ```

### Step 4: Create SyncSphere Database

1. **Open Command Prompt as Administrator**
   ```cmd
   # Connect to PostgreSQL
   psql -U postgres
   
   # Enter the password you set during installation
   # You should see: postgres=#
   ```

2. **Create Database**
   ```sql
   -- Create the database
   CREATE DATABASE syncsphere;
   
   -- Verify database was created
   \l
   
   -- Exit psql
   \q
   ```

3. **Initialize Database Schema**
   ```powershell
   # Navigate to your project directory
   cd C:\path\to\your\SyncSphere\backend
   
   # Initialize the database schema
   psql -U postgres -d syncsphere -f scripts/init-db.sql
   ```

### Step 5: Configure Application

1. **Update .env File**
   
   Open `backend/.env` in your text editor and update:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=syncsphere
   DB_USER=postgres
   DB_PASSWORD=YourPasswordHere
   ```

2. **Test Configuration**
   ```powershell
   cd backend
   npm run db:test
   ```

## 🐳 Method 3: Docker Setup (Alternative)

If you prefer using Docker instead of native installation:

### Prerequisites
- [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)

### Setup Steps

1. **Install Docker Desktop**
   - Download and install Docker Desktop
   - Restart your computer if prompted
   - Start Docker Desktop

2. **Run Docker Setup**
   ```powershell
   cd backend
   npm run db:setup:docker
   ```

3. **Verify Docker Setup**
   ```powershell
   # Check running containers
   docker ps
   
   # Test database connection
   npm run db:test
   ```

## 🧪 Testing and Verification

### Test Database Connection

```powershell
# Basic connection test
npm run db:test

# Detailed validation
npm run db:validate:verbose
```

### Test Application Startup

```powershell
# Start the backend server
npm run dev

# In another PowerShell window, test the API
curl http://localhost:5000/health
```

### Access pgAdmin (if installed)

1. Open your web browser
2. Navigate to `http://localhost/pgAdmin4` or find pgAdmin in Start Menu
3. Login with the master password you set during installation
4. Add server connection:
   - Host: `localhost`
   - Port: `5432`
   - Database: `syncsphere`
   - Username: `postgres`
   - Password: Your postgres password

## 🚨 Troubleshooting

### Common Windows-Specific Issues

#### 1. PowerShell Execution Policy Error

```
execution of scripts is disabled on this system
```

**Solution:**
```powershell
# Run as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### 2. PostgreSQL Service Not Starting

**Check Service Status:**
```powershell
Get-Service postgresql*
```

**Start Service:**
```powershell
Start-Service postgresql-x64-15
```

**Set Service to Auto-Start:**
```powershell
Set-Service -Name postgresql-x64-15 -StartupType Automatic
```

#### 3. Port 5432 Already in Use

**Find Process Using Port:**
```powershell
netstat -ano | findstr :5432
```

**Kill Process (replace PID with actual process ID):**
```powershell
taskkill /PID 1234 /F
```

#### 4. Windows Firewall Blocking Connection

**Add Firewall Rule:**
```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "PostgreSQL" -Direction Inbound -Protocol TCP -LocalPort 5432 -Action Allow
```

#### 5. Permission Denied Errors

**Run Commands as Administrator:**
- Right-click PowerShell/Command Prompt
- Select "Run as administrator"
- Re-run the failed commands

#### 6. PATH Not Updated

**Manually Add to PATH:**
1. Press `Win + R`, type `sysdm.cpl`
2. Environment Variables → System Variables → Path → Edit
3. Add: `C:\Program Files\PostgreSQL\15\bin`
4. Restart PowerShell

### Docker-Specific Issues on Windows

#### 1. Docker Desktop Not Running

**Solution:**
- Start Docker Desktop from Start Menu
- Wait for Docker to fully initialize (whale icon in system tray)

#### 2. WSL 2 Issues

**Update WSL:**
```powershell
wsl --update
```

**Set WSL Version:**
```powershell
wsl --set-default-version 2
```

#### 3. Hyper-V Conflicts

**Enable Hyper-V:**
```powershell
# Run as Administrator
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All
```

## 🔧 Advanced Configuration

### Performance Tuning for Windows

1. **PostgreSQL Configuration**
   
   Edit `C:\Program Files\PostgreSQL\15\data\postgresql.conf`:
   ```ini
   # Memory settings for Windows
   shared_buffers = 256MB
   effective_cache_size = 1GB
   work_mem = 4MB
   maintenance_work_mem = 64MB
   
   # Connection settings
   max_connections = 100
   ```

2. **Windows-Specific Settings**
   ```ini
   # Logging
   log_destination = 'stderr'
   logging_collector = on
   log_directory = 'log'
   log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
   ```

### Security Configuration

1. **Update pg_hba.conf**
   
   Edit `C:\Program Files\PostgreSQL\15\data\pg_hba.conf`:
   ```
   # Local connections
   host    all             all             127.0.0.1/32            md5
   host    all             all             ::1/128                 md5
   ```

2. **Restart PostgreSQL Service**
   ```powershell
   Restart-Service postgresql-x64-15
   ```

## 📊 Monitoring and Maintenance

### Windows Services Management

```powershell
# Check PostgreSQL service status
Get-Service postgresql*

# Start/Stop/Restart service
Start-Service postgresql-x64-15
Stop-Service postgresql-x64-15
Restart-Service postgresql-x64-15

# Set service startup type
Set-Service postgresql-x64-15 -StartupType Automatic
```

### Log File Locations

- **PostgreSQL Logs**: `C:\Program Files\PostgreSQL\15\data\log\`
- **Application Logs**: `backend\logs\`
- **Windows Event Logs**: Event Viewer → Windows Logs → Application

### Backup and Restore

```powershell
# Create backup
pg_dump -U postgres -h localhost syncsphere > backup.sql

# Restore from backup
psql -U postgres -h localhost -d syncsphere < backup.sql
```

## 🎯 Next Steps

After successful setup:

1. **Start Development Server**
   ```powershell
   cd backend
   npm run dev
   ```

2. **Verify Everything Works**
   ```powershell
   # Test API health
   curl http://localhost:5000/health
   
   # Test database health
   curl http://localhost:5000/health/database
   ```

3. **Optional: Install pgAdmin Separately**
   - Download from [pgAdmin website](https://www.pgadmin.org/download/pgadmin-4-windows/)
   - Install and configure with your database connection

## 📞 Getting Help

If you encounter issues:

1. **Check Windows Event Viewer** for system-level errors
2. **Review PostgreSQL logs** in the data directory
3. **Run diagnostic commands**:
   ```powershell
   npm run db:test
   npm run db:validate
   ```
4. **Check Windows-specific forums** and Stack Overflow

## 🔗 Useful Windows Tools

- **pgAdmin**: Web-based PostgreSQL administration
- **DBeaver**: Universal database tool
- **Windows Terminal**: Modern terminal application
- **PowerShell ISE**: Integrated scripting environment

---

**Windows Setup Complete!** 🎉

Your PostgreSQL database should now be running and ready for SyncSphere development on Windows.