# SyncSphere Development Setup Guide

## 🎯 One-Click Development Solution

We've created a comprehensive set of development scripts that allow you to run the entire SyncSphere development environment with just one click!

## 📦 What's Included

### 🚀 Main Scripts

1. **`dev-launcher.bat`** - Interactive menu launcher
2. **`start-dev.bat`** - One-click full stack startup
3. **`start-dev.ps1`** - Advanced PowerShell launcher with options
4. **`stop-dev.bat`** - Graceful shutdown of all services
5. **`start-services.bat`** - Docker services only (existing)

### 📋 Features

✅ **Separate Command Prompts** - Each service runs in its own window
✅ **Docker Management** - Automatically starts PostgreSQL and Redis
✅ **Service Health Checks** - Verifies services are running properly
✅ **Flexible Options** - Start individual services or combinations
✅ **Status Monitoring** - Check what's running at any time
✅ **Graceful Shutdown** - Properly stop all services
✅ **Error Handling** - Clear error messages and troubleshooting

## 🚀 Quick Start Options

### Option 1: Interactive Launcher (Best for beginners)
```bash
# Double-click or run in terminal:
dev-launcher.bat
```

**Menu Options:**
- [1] Full Stack (Frontend + Backend + Docker)
- [2] Backend Only (with Docker)
- [3] Frontend Only (no Docker)
- [4] Docker Services Only
- [5] Stop All Services
- [6] View Service Status

### Option 2: One-Click Full Stack
```bash
# Double-click or run in terminal:
start-dev.bat
```

### Option 3: Advanced PowerShell (For power users)
```powershell
# Full stack
.\start-dev.ps1

# Backend only
.\start-dev.ps1 -BackendOnly

# Frontend only (no Docker)
.\start-dev.ps1 -FrontendOnly -NoDocker

# With verbose output
.\start-dev.ps1 -Verbose
```

## 🌐 Service URLs

Once started, your services will be available at:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | React development server |
| **Backend** | http://localhost:3000 | Node.js API server |
| **PostgreSQL** | localhost:5432 | Database server |
| **Redis** | localhost:6379 | Cache/session store |

## 🛠 Development Workflows

### Full Stack Development
```bash
1. Run: dev-launcher.bat
2. Choose: [1] Full Stack
3. Wait for all services to start
4. Open: http://localhost:5173 (Frontend)
5. API available at: http://localhost:3000
```

### Backend-Only Development
```bash
1. Run: dev-launcher.bat
2. Choose: [2] Backend Only
3. API available at: http://localhost:3000
4. Database: localhost:5432
```

### Frontend-Only Development
```bash
1. Run: dev-launcher.bat
2. Choose: [3] Frontend Only
3. Frontend: http://localhost:5173
4. (No Docker services started)
```

## 🔧 Management

### Check Service Status
```bash
1. Run: dev-launcher.bat
2. Choose: [6] View Service Status
```

### Stop All Services
```bash
# Option 1: Interactive
1. Run: dev-launcher.bat
2. Choose: [5] Stop All Services

# Option 2: Direct
stop-dev.bat
```

### Individual Service Control
- Each service runs in its own command prompt
- Use **Ctrl+C** in each window to stop individual services
- Close the command prompt window to force stop

## 🚨 Troubleshooting

### Common Issues

**1. Docker not running**
```
Error: Docker is not running
Solution: Start Docker Desktop first
```

**2. Ports already in use**
```
Solution: Run stop-dev.bat first, then restart
```

**3. Services not starting**
```
Solution: Check the individual command prompt windows for error messages
```

### Debug Commands
```bash
# Check Docker status
docker info

# Check running containers
docker-compose ps

# Check port usage
netstat -an | findstr "3000 5173 5432 6379"

# Check Node.js processes
tasklist | findstr node.exe
```

## 📁 File Structure

```
SyncSphere/
├── dev-launcher.bat           # Interactive menu launcher
├── start-dev.bat             # One-click full stack
├── start-dev.ps1             # Advanced PowerShell launcher
├── stop-dev.bat              # Service stopper
├── start-services.bat        # Docker services only
├── DEV_SCRIPTS_README.md     # Detailed script documentation
├── DEVELOPMENT_SETUP_GUIDE.md # This guide
└── README.md                 # Updated with script info
```

## 💡 Pro Tips

1. **Use the interactive launcher** for the best experience
2. **Keep command prompts open** to see real-time logs
3. **Use Ctrl+C** for graceful service shutdown
4. **Check service status** if something seems wrong
5. **Stop services properly** to avoid port conflicts
6. **Use PowerShell version** for advanced features

## 🔄 Typical Development Session

```bash
# 1. Start development environment
dev-launcher.bat → [1] Full Stack

# 2. Develop your features
# - Frontend changes auto-reload at http://localhost:5173
# - Backend changes auto-reload with nodemon
# - Database available at localhost:5432

# 3. Test your changes
# - Frontend: http://localhost:5173
# - API: http://localhost:3000/api/v1/...

# 4. Stop when done
dev-launcher.bat → [5] Stop All Services
```

## 🎉 Benefits

✅ **No more manual service management**
✅ **Consistent development environment**
✅ **Easy onboarding for new developers**
✅ **Separate logs for each service**
✅ **Flexible development scenarios**
✅ **Proper service cleanup**
✅ **Error handling and troubleshooting**

---

**You now have a complete one-click development environment! 🚀**

For detailed script documentation, see [DEV_SCRIPTS_README.md](./DEV_SCRIPTS_README.md)