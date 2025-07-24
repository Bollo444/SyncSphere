# SyncSphere Development Scripts

This document explains the development scripts available for running SyncSphere in different configurations.

## 🚀 Quick Start

### One-Click Development Setup

**Option 1: Interactive Launcher (Recommended)**
```bash
# Double-click or run:
dev-launcher.bat
```

**Option 2: Full Stack (All Services)**
```bash
# Double-click or run:
start-dev.bat
```

## 📋 Available Scripts

### 1. `dev-launcher.bat` - Interactive Menu
**Main launcher with options for different development scenarios**

- **Full Stack**: Frontend + Backend + Docker services
- **Backend Only**: Backend + Docker services
- **Frontend Only**: Frontend only (no Docker)
- **Docker Only**: Just PostgreSQL and Redis
- **Stop All**: Gracefully stop all services
- **Status Check**: View current service status

### 2. `start-dev.bat` - Full Stack Launcher
**Starts all services in separate command prompts**

- ✅ Checks Docker status
- 🐳 Starts PostgreSQL and Redis containers
- 🔧 Launches Backend server (port 3000)
- ⚛️ Launches Frontend server (port 5173)
- 📊 Shows service URLs and management tips

### 3. `start-dev.ps1` - Advanced PowerShell Launcher
**Enhanced version with better error handling and options**

**Usage:**
```powershell
# Full stack
.\start-dev.ps1

# Backend only
.\start-dev.ps1 -BackendOnly

# Frontend only (no Docker)
.\start-dev.ps1 -FrontendOnly -NoDocker

# Skip Docker services
.\start-dev.ps1 -NoDocker

# Verbose output
.\start-dev.ps1 -Verbose
```

**Features:**
- 🔍 Port availability checking
- ⏱️ Service readiness monitoring
- 🎯 Flexible service selection
- 📝 Detailed logging
- 🛡️ Better error handling

### 4. `stop-dev.bat` - Service Stopper
**Gracefully stops all development services**

- 🛑 Stops Node.js processes (Frontend/Backend)
- 🐳 Stops Docker containers
- 🧹 Cleans up command prompts

### 5. `start-services.bat` - Docker Only
**Original script for Docker services only**

- 🐳 Starts PostgreSQL and Redis containers
- ✅ Validates service health
- 📊 Shows connection details

## 🌐 Service URLs

When all services are running:

| Service | URL | Purpose |
|---------|-----|----------|
| **Frontend** | http://localhost:5173 | React development server |
| **Backend** | http://localhost:3000 | Node.js API server |
| **PostgreSQL** | localhost:5432 | Database server |
| **Redis** | localhost:6379 | Cache/session store |

## 🛠️ Development Workflows

### Full Stack Development
```bash
# Start everything
dev-launcher.bat → [1] Full Stack

# Or directly
start-dev.bat
```

### Backend Development Only
```bash
# Interactive
dev-launcher.bat → [2] Backend Only

# Or PowerShell
powershell -ExecutionPolicy Bypass -File start-dev.ps1 -BackendOnly
```

### Frontend Development Only
```bash
# Interactive
dev-launcher.bat → [3] Frontend Only

# Or PowerShell
powershell -ExecutionPolicy Bypass -File start-dev.ps1 -FrontendOnly -NoDocker
```

### Database Development
```bash
# Start just Docker services
dev-launcher.bat → [4] Docker Services Only

# Or directly
start-services.bat
```

## 🔧 Troubleshooting

### Check Service Status
```bash
# Interactive status check
dev-launcher.bat → [6] View Service Status

# Manual checks
docker-compose ps
netstat -an | findstr "3000 5173 5432 6379"
```

### Common Issues

**Docker not running:**
```bash
# Start Docker Desktop first, then:
start-dev.bat
```

**Ports already in use:**
```bash
# Stop all services first:
stop-dev.bat

# Then restart:
start-dev.bat
```

**Services not starting:**
```bash
# Check logs in the individual command prompts
# Or use verbose mode:
powershell -ExecutionPolicy Bypass -File start-dev.ps1 -Verbose
```

### Stop All Services
```bash
# Interactive
dev-launcher.bat → [5] Stop All Services

# Or directly
stop-dev.bat
```

## 📁 Script Locations

```
SyncSphere/
├── dev-launcher.bat      # Interactive menu launcher
├── start-dev.bat         # Full stack launcher (batch)
├── start-dev.ps1         # Advanced launcher (PowerShell)
├── stop-dev.bat          # Service stopper
├── start-services.bat    # Docker services only
└── DEV_SCRIPTS_README.md # This documentation
```

## 💡 Tips

1. **Use the interactive launcher** (`dev-launcher.bat`) for the best experience
2. **Each service runs in its own command prompt** - you can see logs and stop individual services
3. **Use Ctrl+C** in command prompts for graceful shutdown
4. **PowerShell version** offers more advanced features and better error handling
5. **Check service status** regularly to ensure everything is running properly
6. **Stop services properly** using the stop script to avoid port conflicts

## 🔄 Development Cycle

```bash
# 1. Start development environment
dev-launcher.bat → [1] Full Stack

# 2. Develop your features
# Frontend: http://localhost:5173
# Backend: http://localhost:3000

# 3. Stop when done
dev-launcher.bat → [5] Stop All Services
```

---

**Happy coding! 🚀**