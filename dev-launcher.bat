@echo off
REM SyncSphere Development Environment Main Launcher
REM Provides options for different development scenarios

color 0A

:start
cls
echo.
echo ========================================
echo    SyncSphere Development Launcher
echo ========================================
echo.
echo Choose your development setup:
echo.
echo [1] Full Stack (Frontend + Backend + Docker)
echo [2] Backend Only (with Docker)
echo [3] Frontend Only (no Docker)
echo [4] Docker Services Only
echo [5] Stop All Services
echo [6] View Service Status
echo [0] Exit
echo.
set /p choice="Enter your choice (0-6): "

if "%choice%"=="1" goto fullstack
if "%choice%"=="2" goto backend
if "%choice%"=="3" goto frontend
if "%choice%"=="4" goto docker
if "%choice%"=="5" goto stop
if "%choice%"=="6" goto status
if "%choice%"=="0" goto exit

echo Invalid choice. Please try again.
pause
goto start

:fullstack
echo.
echo Starting Full Stack Development Environment...
call start-dev.bat
goto end

:backend
echo.
echo Starting Backend Only...
powershell -ExecutionPolicy Bypass -File start-dev.ps1 -BackendOnly
goto end

:frontend
echo.
echo Starting Frontend Only...
powershell -ExecutionPolicy Bypass -File start-dev.ps1 -FrontendOnly -NoDocker
goto end

:docker
echo.
echo Starting Docker Services Only...
echo Starting PostgreSQL and Redis containers...
docker-compose up -d
if %errorlevel% equ 0 (
    echo [OK] Docker services started successfully!
    echo.
    echo PostgreSQL: localhost:5432
    echo Redis: localhost:6379
) else (
    echo [ERROR] Failed to start Docker services
)
pause
goto end

:stop
echo.
echo Stopping All Services...
call stop-dev.bat
goto end

:status
echo.
echo ========================================
echo         Service Status Check
echo ========================================
echo.

echo Checking Docker services...
docker-compose ps
echo.

echo Checking Node.js processes...
tasklist /fi "imagename eq node.exe" /fo table 2>nul | find "node.exe" >nul
if %errorlevel% equ 0 (
    echo [OK] Node.js processes running:
    tasklist /fi "imagename eq node.exe" /fo table
) else (
    echo [INFO] No Node.js processes found
)
echo.

echo Checking ports...
netstat -an | find ":3000" >nul
if %errorlevel% equ 0 (
    echo [OK] Backend port 3000 is in use
) else (
    echo [INFO] Backend port 3000 is free
)

netstat -an | find ":5173" >nul
if %errorlevel% equ 0 (
    echo [OK] Frontend port 5173 is in use
) else (
    echo [INFO] Frontend port 5173 is free
)

netstat -an | find ":5432" >nul
if %errorlevel% equ 0 (
    echo [OK] PostgreSQL port 5432 is in use
) else (
    echo [INFO] PostgreSQL port 5432 is free
)

netstat -an | find ":6379" >nul
if %errorlevel% equ 0 (
    echo [OK] Redis port 6379 is in use
) else (
    echo [INFO] Redis port 6379 is free
)

echo.
pause
goto start

:exit
echo.
echo Goodbye!
exit /b 0

:end
echo.
echo Returning to main menu...
timeout /t 3 /nobreak >nul
goto start