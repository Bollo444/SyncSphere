@echo off
REM SyncSphere Development Environment Launcher
REM This script starts all development services in separate command prompts

echo ========================================
echo    SyncSphere Development Launcher
echo ========================================
echo.

REM Check if Docker is running
echo [1/4] Checking Docker status...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running. Please start Docker Desktop first.
    echo.
    pause
    exit /b 1
)
echo [OK] Docker is running
echo.

REM Start Docker services
echo [2/4] Starting Docker services (PostgreSQL + Redis)...
docker-compose up -d
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start Docker services
    pause
    exit /b 1
)
echo [OK] Docker services started
echo.

REM Wait for services to be ready
echo [3/4] Waiting for services to initialize...
timeout /t 5 /nobreak >nul
echo [OK] Services ready
echo.

REM Start Backend in new command prompt
echo [4/4] Launching development servers...
echo [INFO] Starting Backend Server...
start "SyncSphere Backend" cmd /k "cd /d \"%~dp0backend\" && echo Starting SyncSphere Backend Server... && npm run dev"

REM Wait a moment before starting frontend
timeout /t 2 /nobreak >nul

REM Start Frontend in new command prompt
echo [INFO] Starting Frontend Server...
start "SyncSphere Frontend" cmd /k "cd /d \"%~dp0frontend\" && echo Starting SyncSphere Frontend Server... && npm run dev"

echo.
echo ========================================
echo [SUCCESS] All services launched successfully!
echo ========================================
echo.
echo Service URLs:
echo   • Frontend: http://localhost:5173
echo   • Backend:  http://localhost:3000
echo   • PostgreSQL: localhost:5432
echo   • Redis: localhost:6379
echo.
echo Tips:
echo   • Each service runs in its own command prompt
echo   • Close the command prompts to stop services
echo   • Use Ctrl+C in each window to stop individual services
echo   • Run 'docker-compose down' to stop Docker services
echo.
echo Press any key to exit this launcher...
pause >nul