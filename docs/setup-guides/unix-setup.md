# SyncSphere Database Setup - macOS/Linux Guide

This guide provides step-by-step instructions for setting up PostgreSQL on macOS and Linux for the SyncSphere application.

## 🎯 Quick Setup (Recommended)

The fastest way to get started on macOS/Linux:

```bash
# Navigate to backend directory
cd backend

# Run automated setup
npm run db:setup:unix

# Test the connection
npm run db:test
```

This automated script will detect your system and handle everything for you. If you prefer manual setup or encounter issues, follow the detailed instructions below.

## 📋 Prerequisites

- macOS 10.15+ or Linux (Ubuntu 18.04+, CentOS 7+, etc.)
- Terminal access with sudo privileges
- Node.js (v16 or higher) - [Download here](https://nodejs.org/)
- Package manager (Homebrew for macOS, apt/yum/dnf for Linux)

## 🍎 macOS Setup

### Method 1: Automated Setup

```bash
cd backend
npm run db:setup:unix
```

### Method 2: Manual Setup with Homebrew

#### Step 1: Install Homebrew (if not installed)

```bash
# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Add Homebrew to PATH (for Apple Silicon Macs)
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
source ~/.zshrc
```

#### Step 2: Install PostgreSQL

```bash
# Install PostgreSQL 15
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Add PostgreSQL to PATH
echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

#### Step 3: Create Database and User

```bash
# Create database
createdb syncsphere

# Set password for postgres user (optional)
psql -d postgres -c "ALTER USER $(whoami) WITH PASSWORD 'postgres';"

# Or create postgres user if it doesn't exist
createuser -s postgres
psql -d postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';"
```

#### Step 4: Initialize Schema

```bash
# Navigate to project directory
cd /path/to/SyncSphere/backend

# Initialize database schema
psql -d syncsphere -f scripts/init-db.sql
```

### Method 3: Manual Setup with MacPorts

```bash
# Install PostgreSQL
sudo port install postgresql15-server

# Initialize database
sudo mkdir -p /opt/local/var/db/postgresql15/defaultdb
sudo chown postgres:postgres /opt/local/var/db/postgresql15/defaultdb
sudo -u postgres /opt/local/lib/postgresql15/bin/initdb -D /opt/local/var/db/postgresql15/defaultdb

# Start PostgreSQL
sudo port load postgresql15-server

# Create database
sudo -u postgres createdb syncsphere
```

## 🐧 Linux Setup

### Ubuntu/Debian

#### Method 1: Automated Setup

```bash
cd backend
npm run db:setup:unix
```

#### Method 2: Manual Setup

```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start and enable PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and configure user
sudo -u postgres createdb syncsphere
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"

# Initialize schema
sudo -u postgres psql -d syncsphere -f scripts/init-db.sql
```

### CentOS/RHEL/Fedora

#### Using DNF (Fedora/RHEL 8+)

```bash
# Install PostgreSQL
sudo dnf install postgresql postgresql-server postgresql-contrib

# Initialize database
sudo postgresql-setup --initdb

# Start and enable service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Configure authentication
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" /var/lib/pgsql/data/postgresql.conf
sudo sed -i "s/local   all             all                                     peer/local   all             all                                     md5/" /var/lib/pgsql/data/pg_hba.conf

# Restart PostgreSQL
sudo systemctl restart postgresql

# Create database and user
sudo -u postgres createdb syncsphere
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"

# Initialize schema
sudo -u postgres psql -d syncsphere -f scripts/init-db.sql
```

#### Using YUM (CentOS 7/RHEL 7)

```bash
# Install PostgreSQL
sudo yum install postgresql postgresql-server postgresql-contrib

# Initialize database
sudo postgresql-setup initdb

# Start and enable service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Follow same configuration steps as DNF method above
```

### Arch Linux

```bash
# Install PostgreSQL
sudo pacman -S postgresql

# Initialize database
sudo -u postgres initdb -D /var/lib/postgres/data

# Start and enable service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres createdb syncsphere
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"

# Initialize schema
sudo -u postgres psql -d syncsphere -f scripts/init-db.sql
```

### Alpine Linux

```bash
# Install PostgreSQL
sudo apk add postgresql postgresql-contrib

# Initialize database
sudo -u postgres initdb -D /var/lib/postgresql/data

# Start service
sudo rc-service postgresql start
sudo rc-update add postgresql

# Create database and user
sudo -u postgres createdb syncsphere
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"

# Initialize schema
sudo -u postgres psql -d syncsphere -f scripts/init-db.sql
```

## 🐳 Docker Setup (Cross-Platform)

### Prerequisites
- Docker installed on your system
- Docker Compose (usually included with Docker)

### Setup Steps

```bash
# Navigate to project directory
cd backend

# Run Docker setup script
npm run db:setup:docker

# Or manually start containers
docker-compose -f docker-compose.postgres.yml up -d

# Verify containers are running
docker ps
```

### Docker Management

```bash
# View logs
npm run docker:logs

# Stop containers
npm run docker:down

# Restart containers
docker-compose -f docker-compose.postgres.yml restart

# Access PostgreSQL container
docker exec -it syncsphere-postgres psql -U postgres -d syncsphere
```

## ⚙️ Configuration

### Environment Variables

Update `backend/.env` file:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=syncsphere
DB_USER=postgres
DB_PASSWORD=postgres

# Connection Pool Settings
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=5000

# Redis Configuration (optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# Application Settings
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173
JWT_SECRET=dev-jwt-secret-key-for-local-development-only
```

### PostgreSQL Configuration

#### macOS Configuration Files
- **Homebrew**: `/opt/homebrew/var/postgresql@15/postgresql.conf`
- **MacPorts**: `/opt/local/var/db/postgresql15/defaultdb/postgresql.conf`

#### Linux Configuration Files
- **Ubuntu/Debian**: `/etc/postgresql/15/main/postgresql.conf`
- **CentOS/RHEL**: `/var/lib/pgsql/data/postgresql.conf`
- **Arch**: `/var/lib/postgres/data/postgresql.conf`

#### Common Configuration Tweaks

```ini
# Memory settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Connection settings
max_connections = 100
listen_addresses = 'localhost'

# Logging
log_destination = 'stderr'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_min_duration_statement = 1000
```

## 🧪 Testing and Verification

### Test Database Connection

```bash
# Basic connection test
npm run db:test

# Detailed validation
npm run db:validate:verbose

# Manual connection test
psql -h localhost -U postgres -d syncsphere -c "SELECT version();"
```

### Test Application Startup

```bash
# Start the backend server
npm run dev

# In another terminal, test the API
curl http://localhost:5000/health
curl http://localhost:5000/health/database
```

## 🚨 Troubleshooting

### Common macOS Issues

#### 1. Homebrew Permission Issues

```bash
# Fix Homebrew permissions
sudo chown -R $(whoami) $(brew --prefix)/*
```

#### 2. PostgreSQL Service Won't Start

```bash
# Check service status
brew services list | grep postgresql

# Restart service
brew services restart postgresql@15

# Check logs
tail -f /opt/homebrew/var/log/postgresql@15.log
```

#### 3. Connection Refused on macOS

```bash
# Check if PostgreSQL is listening
lsof -i :5432

# Verify configuration
psql -d postgres -c "SHOW listen_addresses;"
```

### Common Linux Issues

#### 1. Service Management Issues

```bash
# Check service status
sudo systemctl status postgresql

# View service logs
sudo journalctl -u postgresql -f

# Restart service
sudo systemctl restart postgresql
```

#### 2. Authentication Configuration

```bash
# Edit pg_hba.conf for local connections
sudo nano /etc/postgresql/15/main/pg_hba.conf

# Add or modify this line:
local   all             all                                     md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

#### 3. Permission Denied Errors

```bash
# Check PostgreSQL user permissions
sudo -u postgres psql -c "\du"

# Grant necessary permissions
sudo -u postgres psql -c "ALTER USER postgres CREATEDB;"
```

#### 4. Port Already in Use

```bash
# Find process using port 5432
sudo lsof -i :5432

# Kill process (replace PID with actual process ID)
sudo kill -9 PID

# Or change PostgreSQL port in postgresql.conf
sudo nano /etc/postgresql/15/main/postgresql.conf
# Change: port = 5433
```

### Docker-Specific Issues

#### 1. Container Won't Start

```bash
# Check container logs
docker logs syncsphere-postgres

# Remove and recreate container
docker rm -f syncsphere-postgres
npm run db:setup:docker
```

#### 2. Volume Permission Issues

```bash
# Fix volume permissions
sudo chown -R $(whoami):$(whoami) ./data

# Or recreate with proper permissions
docker-compose -f docker-compose.postgres.yml down -v
docker-compose -f docker-compose.postgres.yml up -d
```

### Network and Firewall Issues

#### macOS Firewall

```bash
# Check if firewall is blocking PostgreSQL
sudo pfctl -sr | grep 5432

# Add firewall rule if needed (usually not required for localhost)
```

#### Linux Firewall (UFW)

```bash
# Check UFW status
sudo ufw status

# Allow PostgreSQL port (if needed for remote connections)
sudo ufw allow 5432/tcp
```

#### Linux Firewall (firewalld)

```bash
# Check firewalld status
sudo firewall-cmd --state

# Allow PostgreSQL port
sudo firewall-cmd --permanent --add-port=5432/tcp
sudo firewall-cmd --reload
```

## 🔧 Advanced Configuration

### Performance Tuning

#### macOS Specific

```bash
# Increase shared memory (add to /etc/sysctl.conf)
sudo sysctl -w kern.sysv.shmmax=1073741824
sudo sysctl -w kern.sysv.shmall=262144
```

#### Linux Specific

```bash
# Increase shared memory limits
echo "kernel.shmmax = 1073741824" | sudo tee -a /etc/sysctl.conf
echo "kernel.shmall = 262144" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Automated Backups

```bash
# Create backup script
cat > backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U postgres syncsphere > "$BACKUP_DIR/syncsphere_$DATE.sql"
# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "syncsphere_*.sql" -mtime +7 -delete
EOF

chmod +x backup-db.sh

# Add to crontab for daily backups
crontab -e
# Add: 0 2 * * * /path/to/backup-db.sh
```

### Log Rotation

#### macOS (with Homebrew)

```bash
# Create logrotate configuration
sudo mkdir -p /opt/homebrew/etc/logrotate.d
cat > /opt/homebrew/etc/logrotate.d/postgresql << 'EOF'
/opt/homebrew/var/log/postgresql@15.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
EOF
```

#### Linux

```bash
# PostgreSQL logs are usually handled by system logrotate
# Check existing configuration
cat /etc/logrotate.d/postgresql-common
```

## 📊 Monitoring and Maintenance

### System Monitoring

```bash
# Check PostgreSQL processes
ps aux | grep postgres

# Monitor database connections
psql -d syncsphere -c "SELECT count(*) FROM pg_stat_activity;"

# Check database size
psql -d syncsphere -c "SELECT pg_size_pretty(pg_database_size('syncsphere'));"

# Monitor system resources
top -p $(pgrep postgres)
```

### Log Analysis

```bash
# View recent PostgreSQL logs (macOS Homebrew)
tail -f /opt/homebrew/var/log/postgresql@15.log

# View recent PostgreSQL logs (Linux)
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# Search for errors
grep ERROR /path/to/postgresql.log
```

## 🎯 Next Steps

After successful setup:

1. **Start Development Server**
   ```bash
   cd backend
   npm run dev
   ```

2. **Verify Everything Works**
   ```bash
   # Test API health
   curl http://localhost:5000/health
   
   # Test database health
   curl http://localhost:5000/health/database
   ```

3. **Optional Tools**
   - Install pgAdmin: `brew install --cask pgadmin4` (macOS)
   - Install DBeaver: Universal database tool
   - Set up database monitoring tools

## 📞 Getting Help

If you encounter issues:

1. **Check system logs** for PostgreSQL errors
2. **Review configuration files** for syntax errors
3. **Run diagnostic commands**:
   ```bash
   npm run db:test
   npm run db:validate
   systemctl status postgresql  # Linux
   brew services list | grep postgresql  # macOS
   ```
4. **Check platform-specific forums** and documentation

## 🔗 Useful Tools and Resources

### macOS Tools
- **Homebrew**: Package manager for macOS
- **pgAdmin**: Web-based PostgreSQL administration
- **Postico**: Native PostgreSQL client for macOS
- **TablePlus**: Modern database client

### Linux Tools
- **pgAdmin**: Web-based PostgreSQL administration
- **DBeaver**: Universal database tool
- **psql**: Command-line PostgreSQL client
- **htop**: Enhanced process viewer

### Monitoring Tools
- **pg_stat_statements**: Query performance monitoring
- **pgBadger**: PostgreSQL log analyzer
- **Grafana + Prometheus**: System monitoring

---

**Unix Setup Complete!** 🎉

Your PostgreSQL database should now be running and ready for SyncSphere development on macOS or Linux.