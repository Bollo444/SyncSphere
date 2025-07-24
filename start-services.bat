@echo off
echo Starting SyncSphere development services...
echo.

echo Checking if Docker is running...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

echo Starting PostgreSQL and Redis containers...
docker-compose up -d

if %errorlevel% equ 0 (
    echo.
    echo [OK] Services started successfully!
    echo.
    echo PostgreSQL: localhost:5432
    echo   - Database: syncsphere
    echo   - Username: postgres
    echo   - Password: postgres
    echo.
    echo Redis: localhost:6379
    echo.
    echo Waiting for services to be ready...
    timeout /t 10 /nobreak >nul
    
    echo Checking service health...
    docker-compose ps
) else (
    echo.
    echo [ERROR] Failed to start services. Check the error messages above.
)

echo.
echo Press any key to continue...
pause >nul