# SyncSphere Database Setup - Docker Guide

This guide provides comprehensive instructions for setting up PostgreSQL using Docker for the SyncSphere application. Docker provides a consistent, isolated environment that works across all platforms.

## 🎯 Quick Start

The fastest way to get started with Docker:

```bash
# Navigate to backend directory
cd backend

# Run automated Docker setup
npm run db:setup:docker

# Test the connection
npm run db:test
```

## 📋 Prerequisites

### Docker Installation

#### Windows
1. Download [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
2. Install and restart your computer
3. Enable WSL 2 if prompted
4. Start Docker Desktop

#### macOS
```bash
# Using Homebrew
brew install --cask docker

# Or download from Docker website
# https://docs.docker.com/desktop/install/mac-install/
```

#### Linux (Ubuntu/Debian)
```bash
# Update package index
sudo apt-get update

# Install Docker
sudo apt-get install docker.io docker-compose

# Add user to docker group
sudo usermod -aG docker $USER

# Restart session or run:
newgrp docker
```

#### Linux (CentOS/RHEL)
```bash
# Install Docker
sudo yum install docker docker-compose

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER
```

### Verify Docker Installation

```bash
# Check Docker version
docker --version

# Check Docker Compose version
docker-compose --version

# Test Docker installation
docker run hello-world
```

## 🚀 Setup Methods

### Method 1: Automated Setup (Recommended)

```bash
cd backend
npm run db:setup:docker
```

This script will:
- Start PostgreSQL and Redis containers
- Initialize the database schema
- Configure networking
- Set up persistent data volumes
- Update your `.env` file

### Method 2: Manual Docker Compose Setup

#### Step 1: Start Services

```bash
# Start PostgreSQL and Redis
docker-compose -f docker-compose.postgres.yml up -d

# Start with pgAdmin (optional)
docker-compose -f docker-compose.postgres.yml --profile admin up -d

# View running containers
docker ps
```

#### Step 2: Initialize Database Schema

```bash
# Wait for PostgreSQL to be ready
docker exec syncsphere-postgres pg_isready -U postgres

# Initialize schema
docker exec -i syncsphere-postgres psql -U postgres -d syncsphere < backend/scripts/init-db.sql
```

#### Step 3: Update Environment Configuration

```bash
# Update backend/.env file
DB_HOST=localhost
DB_PORT=5432
DB_NAME=syncsphere
DB_USER=postgres
DB_PASSWORD=postgres
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Method 3: Individual Container Setup

#### PostgreSQL Container

```bash
# Run PostgreSQL container
docker run --name syncsphere-postgres \
  -e POSTGRES_DB=syncsphere \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  -d postgres:15-alpine

# Initialize schema
docker exec -i syncsphere-postgres psql -U postgres -d syncsphere < backend/scripts/init-db.sql
```

#### Redis Container (Optional)

```bash
# Run Redis container
docker run --name syncsphere-redis \
  -p 6379:6379 \
  -v redis_data:/data \
  -d redis:7-alpine
```

#### pgAdmin Container (Optional)

```bash
# Run pgAdmin container
docker run --name syncsphere-pgadmin \
  -e PGADMIN_DEFAULT_EMAIL=admin@syncsphere.com \
  -e PGADMIN_DEFAULT_PASSWORD=admin \
  -p 8080:80 \
  -v pgadmin_data:/var/lib/pgadmin \
  -d dpage/pgadmin4:latest
```

## 🐳 Docker Compose Configuration

### Understanding docker-compose.postgres.yml

```yaml
version: '3.8'

services:
  # PostgreSQL Database Service
  postgres:
    image: postgres:15-alpine          # Lightweight PostgreSQL image
    container_name: syncsphere-postgres
    restart: unless-stopped            # Auto-restart on failure
    environment:
      POSTGRES_DB: syncsphere         # Database name
      POSTGRES_USER: postgres         # Database user
      POSTGRES_PASSWORD: postgres     # Database password
    ports:
      - "5432:5432"                   # Port mapping
    volumes:
      - postgres_data:/var/lib/postgresql/data  # Persistent storage
      - ./backend/scripts/init-db.sql:/docker-entrypoint-initdb.d/01-init-db.sql:ro
    networks:
      - syncsphere-network
    healthcheck:                      # Health monitoring
      test: ["CMD-SHELL", "pg_isready -U postgres -d syncsphere"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache Service
  redis:
    image: redis:7-alpine
    container_name: syncsphere-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - syncsphere-network

  # pgAdmin (optional)
  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: syncsphere-pgadmin
    restart: unless-stopped
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@syncsphere.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "8080:80"
    volumes:
      - pgadmin_data:/var/lib/pgadmin
    networks:
      - syncsphere-network
    profiles:
      - admin                         # Only starts with --profile admin

volumes:
  postgres_data:                      # Named volume for PostgreSQL data
  redis_data:                         # Named volume for Redis data
  pgadmin_data:                       # Named volume for pgAdmin data

networks:
  syncsphere-network:                 # Custom network for services
    driver: bridge
```

## 🔧 Container Management

### Basic Operations

```bash
# Start all services
docker-compose -f docker-compose.postgres.yml up -d

# Start specific service
docker-compose -f docker-compose.postgres.yml up -d postgres

# Stop all services
docker-compose -f docker-compose.postgres.yml down

# Stop and remove volumes (WARNING: This deletes data!)
docker-compose -f docker-compose.postgres.yml down -v

# Restart services
docker-compose -f docker-compose.postgres.yml restart

# View service status
docker-compose -f docker-compose.postgres.yml ps
```

### Logs and Monitoring

```bash
# View logs for all services
docker-compose -f docker-compose.postgres.yml logs -f

# View logs for specific service
docker-compose -f docker-compose.postgres.yml logs -f postgres

# View last 100 lines of logs
docker-compose -f docker-compose.postgres.yml logs --tail=100 postgres

# Monitor resource usage
docker stats syncsphere-postgres syncsphere-redis
```

### Container Access

```bash
# Access PostgreSQL container shell
docker exec -it syncsphere-postgres bash

# Access PostgreSQL directly
docker exec -it syncsphere-postgres psql -U postgres -d syncsphere

# Access Redis container
docker exec -it syncsphere-redis redis-cli

# Run commands in container
docker exec syncsphere-postgres pg_dump -U postgres syncsphere > backup.sql
```

## 🗄️ Data Management

### Persistent Storage

Docker volumes ensure your data persists between container restarts:

```bash
# List Docker volumes
docker volume ls

# Inspect volume details
docker volume inspect syncsphere_postgres_data

# Backup volume data
docker run --rm -v syncsphere_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz -C /data .

# Restore volume data
docker run --rm -v syncsphere_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres-backup.tar.gz -C /data
```

### Database Backup and Restore

```bash
# Create database backup
docker exec syncsphere-postgres pg_dump -U postgres syncsphere > syncsphere-backup.sql

# Restore from backup
docker exec -i syncsphere-postgres psql -U postgres -d syncsphere < syncsphere-backup.sql

# Create compressed backup
docker exec syncsphere-postgres pg_dump -U postgres -Fc syncsphere > syncsphere-backup.dump

# Restore from compressed backup
docker exec -i syncsphere-postgres pg_restore -U postgres -d syncsphere < syncsphere-backup.dump
```

## 🌐 Networking and Access

### Service Access

| Service | URL | Credentials |
|---------|-----|-------------|
| PostgreSQL | `localhost:5432` | postgres/postgres |
| Redis | `localhost:6379` | No password |
| pgAdmin | `http://localhost:8080` | admin@syncsphere.com/admin |

### Network Configuration

```bash
# List Docker networks
docker network ls

# Inspect network details
docker network inspect syncsphere-network

# Connect container to network
docker network connect syncsphere-network my-container
```

### Port Conflicts

If default ports are in use:

```yaml
# Modify docker-compose.postgres.yml
services:
  postgres:
    ports:
      - "5433:5432"  # Use port 5433 instead of 5432
  redis:
    ports:
      - "6380:6379"  # Use port 6380 instead of 6379
```

Update your `.env` file accordingly:
```env
DB_PORT=5433
REDIS_PORT=6380
```

## 🧪 Testing and Verification

### Health Checks

```bash
# Check container health
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Test PostgreSQL connection
docker exec syncsphere-postgres pg_isready -U postgres -d syncsphere

# Test Redis connection
docker exec syncsphere-redis redis-cli ping

# Run application tests
npm run db:test
```

### Performance Monitoring

```bash
# Monitor resource usage
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"

# Check container logs for performance issues
docker logs syncsphere-postgres | grep -i "slow\|error\|warning"
```

## 🚨 Troubleshooting

### Common Docker Issues

#### 1. Container Won't Start

```bash
# Check container logs
docker logs syncsphere-postgres

# Common issues and solutions:
# - Port already in use: Change port mapping
# - Volume permission issues: Fix volume permissions
# - Image not found: Pull image manually
docker pull postgres:15-alpine
```

#### 2. Database Connection Refused

```bash
# Check if container is running
docker ps | grep postgres

# Check container health
docker exec syncsphere-postgres pg_isready -U postgres

# Verify port mapping
docker port syncsphere-postgres

# Test connection from host
telnet localhost 5432
```

#### 3. Volume Permission Issues

```bash
# Linux/macOS: Fix volume permissions
sudo chown -R $(whoami):$(whoami) ./data

# Windows: Run Docker Desktop as Administrator
# Or recreate volumes with proper permissions
docker-compose -f docker-compose.postgres.yml down -v
docker-compose -f docker-compose.postgres.yml up -d
```

#### 4. Out of Disk Space

```bash
# Check Docker disk usage
docker system df

# Clean up unused containers, networks, images
docker system prune -a

# Remove specific volumes (WARNING: Data loss!)
docker volume rm syncsphere_postgres_data
```

#### 5. Memory Issues

```bash
# Check container memory usage
docker stats syncsphere-postgres

# Limit container memory in docker-compose.yml
services:
  postgres:
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

### Platform-Specific Issues

#### Windows Issues

```powershell
# WSL 2 issues
wsl --update
wsl --set-default-version 2

# Docker Desktop not starting
# - Restart Docker Desktop
# - Check Windows features (Hyper-V, WSL 2)
# - Run as Administrator

# File sharing issues
# - Enable file sharing in Docker Desktop settings
# - Check Windows Defender exclusions
```

#### macOS Issues

```bash
# Docker Desktop issues
# - Increase Docker Desktop memory allocation
# - Check macOS permissions for Docker

# M1/M2 Mac compatibility
# Use ARM-compatible images or specify platform
docker run --platform linux/amd64 postgres:15-alpine
```

#### Linux Issues

```bash
# Permission denied errors
sudo usermod -aG docker $USER
newgrp docker

# Docker daemon not running
sudo systemctl start docker
sudo systemctl enable docker

# SELinux issues (CentOS/RHEL)
sudo setsebool -P container_manage_cgroup on
```

## 🔧 Advanced Configuration

### Custom PostgreSQL Configuration

Create `docker/postgres/postgresql.conf`:

```ini
# Custom PostgreSQL settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
max_connections = 100

# Logging
log_statement = 'all'
log_min_duration_statement = 1000
```

Mount in docker-compose.yml:
```yaml
services:
  postgres:
    volumes:
      - ./docker/postgres/postgresql.conf:/etc/postgresql/postgresql.conf
    command: postgres -c config_file=/etc/postgresql/postgresql.conf
```

### Environment-Specific Configurations

#### Development
```yaml
# docker-compose.dev.yml
services:
  postgres:
    environment:
      POSTGRES_DB: syncsphere_dev
    ports:
      - "5432:5432"
```

#### Testing
```yaml
# docker-compose.test.yml
services:
  postgres:
    environment:
      POSTGRES_DB: syncsphere_test
    ports:
      - "5433:5432"
    tmpfs:
      - /var/lib/postgresql/data  # Use tmpfs for faster tests
```

#### Production
```yaml
# docker-compose.prod.yml
services:
  postgres:
    environment:
      POSTGRES_DB: syncsphere_prod
    volumes:
      - postgres_data:/var/lib/postgresql/data
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
```

### Multi-Environment Management

```bash
# Development
docker-compose -f docker-compose.postgres.yml -f docker-compose.dev.yml up -d

# Testing
docker-compose -f docker-compose.postgres.yml -f docker-compose.test.yml up -d

# Production
docker-compose -f docker-compose.postgres.yml -f docker-compose.prod.yml up -d
```

## 📊 Monitoring and Maintenance

### Container Health Monitoring

```bash
# Set up health check monitoring script
cat > monitor-containers.sh << 'EOF'
#!/bin/bash
containers=("syncsphere-postgres" "syncsphere-redis")
for container in "${containers[@]}"; do
    if ! docker ps | grep -q $container; then
        echo "Container $container is not running!"
        # Add notification logic here
    fi
done
EOF

chmod +x monitor-containers.sh

# Add to crontab for regular monitoring
crontab -e
# Add: */5 * * * * /path/to/monitor-containers.sh
```

### Automated Backups

```bash
# Create backup script
cat > backup-docker-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

# Create database backup
docker exec syncsphere-postgres pg_dump -U postgres syncsphere > "$BACKUP_DIR/syncsphere_$DATE.sql"

# Compress backup
gzip "$BACKUP_DIR/syncsphere_$DATE.sql"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "syncsphere_*.sql.gz" -mtime +7 -delete

echo "Backup completed: syncsphere_$DATE.sql.gz"
EOF

chmod +x backup-docker-db.sh

# Schedule daily backups
crontab -e
# Add: 0 2 * * * /path/to/backup-docker-db.sh
```

### Log Management

```bash
# Configure log rotation for containers
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

# Restart Docker daemon
sudo systemctl restart docker
```

## 🎯 Next Steps

After successful Docker setup:

1. **Verify Services**
   ```bash
   docker ps
   npm run db:test
   ```

2. **Start Development**
   ```bash
   cd backend
   npm run dev
   ```

3. **Access Services**
   - API: http://localhost:5000/health
   - pgAdmin: http://localhost:8080 (if enabled)
   - Database: localhost:5432

4. **Optional Enhancements**
   - Set up monitoring with Grafana
   - Configure automated backups
   - Implement log aggregation

## 📞 Getting Help

For Docker-specific issues:

1. **Check Docker logs**: `docker logs container-name`
2. **Verify Docker installation**: `docker --version`
3. **Check system resources**: `docker system df`
4. **Review Docker documentation**: https://docs.docker.com/
5. **Community support**: Docker forums and Stack Overflow

---

**Docker Setup Complete!** 🐳

Your containerized PostgreSQL environment is now ready for SyncSphere development with consistent behavior across all platforms.