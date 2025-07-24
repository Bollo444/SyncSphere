@echo off
REM SyncSphere Development Environment Stopper
REM This script stops all development services

echo ========================================
echo    SyncSphere Development Stopper
echo ========================================
echo.

echo [1/3] Stopping Node.js development servers...
REM Kill all node processes (this will stop both frontend and backend)
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im nodemon.exe >nul 2>&1
echo [OK] Node.js servers stopped

echo.
echo [2/3] Stopping Docker services...
docker-compose down
if %errorlevel% equ 0 (
    echo [OK] Docker services stopped
) else (
    echo [WARNING] Docker services may not have stopped cleanly
)

echo.
echo [3/3] Cleaning up...
REM Close any remaining SyncSphere command prompts
for /f "tokens=2" %%i in ('tasklist /fi "windowtitle eq SyncSphere*" /fo csv ^| find /c /v ""') do (
    if %%i gtr 1 (
        echo Closing SyncSphere command prompts...
        taskkill /fi "windowtitle eq SyncSphere*" /f >nul 2>&1
    )
)

echo.
echo ========================================
echo [SUCCESS] All services stopped successfully!
echo ========================================
echo.
echo Press any key to exit...
pause >nul