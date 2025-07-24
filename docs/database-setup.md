# SyncSphere Database Setup Guide

This comprehensive guide will help you set up PostgreSQL database for the SyncSphere application on any platform.

## 🚀 Quick Start

The fastest way to get started is using our automated setup script:

```bash
cd backend
npm run db:setup
```

This will detect your operating system and run the appropriate setup method automatically.

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager
- Administrator/sudo privileges (for native installation)
- Docker (optional, for containerized setup)

## 🎯 Setup Methods

### Method 1: Automated Cross-Platform Setup (Recommended)

```bash
# Navigate to backend directory
cd backend

# Run automated setup
npm run db:setup

# Test the connection
npm run db:test
```

### Method 2: Docker Setup (Easiest)

```bash
# Start PostgreSQL with Docker
npm run db:setup:docker

# Or manually with Docker Compose
npm run docker:up

# View logs
npm run docker:logs
```

### Method 3: Platform-Specific Native Installation

#### Windows
```powershell
# Run Windows-specific setup
npm run db:setup:windows

# Or with custom password
powershell -ExecutionPolicy Bypass -File scripts/setup-postgres-windows.ps1 -Password "mypassword"
```

#### macOS/Linux
```bash
# Run Unix-specific setup
npm run db:setup:unix

# Or with custom options
bash scripts/setup-postgres-unix.sh --password mypassword --database mydb
```

## 🔧 Manual Setup Instructions

### Windows Manual Setup

1. **Download PostgreSQL**
   - Visit: https://www.postgresql.org/download/windows/
   - Download PostgreSQL 15.x installer
   - Run installer with default settings

2. **Configure PostgreSQL**
   ```powershell
   # Set password during installation or change it
   # Default user: postgres
   # Default port: 5432
   ```

3. **Create Database**
   ```powershell
   # Open Command Prompt as Administrator
   createdb -U postgres syncsphere
   
   # Initialize schema
   psql -U postgres -d syncsphere -f backend/scripts/init-db.sql
   ```

4. **Update Environment**
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=syncsphere
   DB_USER=postgres
   DB_PASSWORD=your_password
   ```

### macOS Manual Setup

1. **Install PostgreSQL with Homebrew**
   ```bash
   # Install Homebrew if not installed
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   
   # Install PostgreSQL
   brew install postgresql@15
   
   # Start PostgreSQL service
   brew services start postgresql@15
   ```

2. **Create Database**
   ```bash
   # Create database
   createdb syncsphere
   
   # Initialize schema
   psql -d syncsphere -f backend/scripts/init-db.sql
   ```

3. **Configure Environment**
   ```bash
   # Add to ~/.zshrc or ~/.bash_profile
   export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
   ```

### Linux Manual Setup

#### Ubuntu/Debian
```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start and enable service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database
sudo -u postgres createdb syncsphere

# Set password for postgres user
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"

# Initialize schema
sudo -u postgres psql -d syncsphere -f backend/scripts/init-db.sql
```

#### CentOS/RHEL/Fedora
```bash
# Install PostgreSQL
sudo dnf install postgresql postgresql-server postgresql-contrib

# Initialize database
sudo postgresql-setup --initdb

# Start and enable service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres createdb syncsphere
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"

# Initialize schema
sudo -u postgres psql -d syncsphere -f backend/scripts/init-db.sql
```

## 🐳 Docker Setup Details

### Using Docker Compose

1. **Start Services**
   ```bash
   # Start PostgreSQL and Redis
   docker-compose -f docker-compose.postgres.yml up -d
   
   # Start with pgAdmin (optional)
   docker-compose -f docker-compose.postgres.yml --profile admin up -d
   ```

2. **Access Services**
   - PostgreSQL: `localhost:5432`
   - Redis: `localhost:6379`
   - pgAdmin: `http://localhost:8080` (admin@syncsphere.com / admin)

3. **Manage Containers**
   ```bash
   # View logs
   docker-compose -f docker-compose.postgres.yml logs -f
   
   # Stop services
   docker-compose -f docker-compose.postgres.yml down
   
   # Restart services
   docker-compose -f docker-compose.postgres.yml restart
   ```

### Manual Docker Setup

```bash
# Run PostgreSQL container
docker run --name syncsphere-postgres \
  -e POSTGRES_DB=syncsphere \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:15

# Initialize schema
docker exec -i syncsphere-postgres psql -U postgres -d syncsphere < backend/scripts/init-db.sql
```

## ⚙️ Configuration

### Environment Variables

Create or update `backend/.env` file:

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
REDIS_PASSWORD=

# Application Settings
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173
JWT_SECRET=dev-jwt-secret-key-for-local-development-only
```

### Database Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | localhost | Database server host |
| `DB_PORT` | 5432 | Database server port |
| `DB_NAME` | syncsphere | Database name |
| `DB_USER` | postgres | Database user |
| `DB_PASSWORD` | postgres | Database password |
| `DB_MAX_CONNECTIONS` | 20 | Maximum connection pool size |
| `DB_IDLE_TIMEOUT` | 30000 | Connection idle timeout (ms) |
| `DB_CONNECTION_TIMEOUT` | 5000 | Connection timeout (ms) |

## 🧪 Testing and Verification

### Test Database Connection

```bash
# Basic connection test
npm run db:test

# Verbose connection test with performance metrics
npm run db:test --verbose
```

### Validate Database Schema

```bash
# Basic schema validation
npm run db:validate

# Detailed schema validation
npm run db:validate:verbose
```

### Health Check Endpoints

Once the backend is running, you can check database health:

```bash
# Basic health check
curl http://localhost:5000/health

# Database-specific health check
curl http://localhost:5000/health/database

# Complete system health check
curl http://localhost:5000/health/system

# Schema validation endpoint
curl http://localhost:5000/health/schema
```

## 🔧 Database Management Commands

### Available npm Scripts

```bash
# Setup Commands
npm run db:setup           # Automated cross-platform setup
npm run db:setup:windows   # Windows-specific setup
npm run db:setup:unix      # macOS/Linux setup
npm run db:setup:docker    # Docker containerized setup

# Database Management
npm run db:create          # Create database and user
npm run db:init            # Initialize database schema
npm run db:reset           # Drop and recreate database
npm run db:drop            # Drop database
npm run db:test            # Test database connection
npm run db:validate        # Validate database schema

# Docker Management
npm run docker:up          # Start PostgreSQL containers
npm run docker:down        # Stop containers
npm run docker:logs        # View container logs
```

### Manual Database Operations

```bash
# Connect to database
psql -h localhost -U postgres -d syncsphere

# Create backup
pg_dump -h localhost -U postgres syncsphere > backup.sql

# Restore from backup
psql -h localhost -U postgres -d syncsphere < backup.sql

# Check database size
psql -h localhost -U postgres -d syncsphere -c "SELECT pg_size_pretty(pg_database_size('syncsphere'));"
```

## 🚨 Troubleshooting

### Common Issues and Solutions

#### 1. Connection Refused Error
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions:**
- Check if PostgreSQL service is running
- Verify port 5432 is not blocked by firewall
- Ensure PostgreSQL is listening on localhost

**Windows:**
```powershell
# Check service status
Get-Service postgresql*

# Start service
Start-Service postgresql-x64-15
```

**macOS:**
```bash
# Check service status
brew services list | grep postgresql

# Start service
brew services start postgresql@15
```

**Linux:**
```bash
# Check service status
sudo systemctl status postgresql

# Start service
sudo systemctl start postgresql
```

#### 2. Authentication Failed
```
Error: password authentication failed for user "postgres"
```

**Solutions:**
- Verify password in `.env` file
- Reset PostgreSQL password
- Check user permissions

**Reset Password:**
```bash
# Connect as superuser and reset password
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'newpassword';"
```

#### 3. Database Does Not Exist
```
Error: database "syncsphere" does not exist
```

**Solutions:**
```bash
# Create database manually
createdb -U postgres syncsphere

# Or run setup script
npm run db:create
```

#### 4. Permission Denied
```
Error: permission denied for database syncsphere
```

**Solutions:**
```bash
# Grant permissions to user
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE syncsphere TO postgres;"
```

#### 5. Port Already in Use
```
Error: Port 5432 is already in use
```

**Solutions:**
- Stop existing PostgreSQL instance
- Use different port in configuration
- Check for other applications using port 5432

### Docker-Specific Issues

#### Container Won't Start
```bash
# Check container logs
docker logs syncsphere-postgres

# Remove and recreate container
docker rm -f syncsphere-postgres
npm run db:setup:docker
```

#### Permission Issues with Volumes
```bash
# Fix volume permissions (Linux/macOS)
sudo chown -R $(whoami) ./data

# Or recreate with proper permissions
docker-compose -f docker-compose.postgres.yml down -v
docker-compose -f docker-compose.postgres.yml up -d
```

### Getting Help

If you encounter issues not covered here:

1. **Check Logs**: Look at PostgreSQL logs for detailed error messages
2. **Verify Configuration**: Double-check `.env` file settings
3. **Test Connection**: Use `npm run db:test` for diagnostic information
4. **Check Documentation**: Review PostgreSQL official documentation
5. **Community Support**: Search for similar issues on Stack Overflow

### Log Locations

**Windows:**
- PostgreSQL logs: `C:\Program Files\PostgreSQL\15\data\log\`
- Application logs: `backend/logs/`

**macOS:**
- PostgreSQL logs: `/opt/homebrew/var/log/postgresql@15.log`
- Application logs: `backend/logs/`

**Linux:**
- PostgreSQL logs: `/var/log/postgresql/`
- Application logs: `backend/logs/`

**Docker:**
```bash
# View PostgreSQL container logs
docker logs syncsphere-postgres

# View application logs
docker-compose -f docker-compose.postgres.yml logs app
```

## 🎯 Next Steps

After successful database setup:

1. **Start the Backend Server**
   ```bash
   cd backend
   npm run dev
   ```

2. **Verify API is Working**
   ```bash
   curl http://localhost:5000/health
   ```

3. **Start the Frontend** (if available)
   ```bash
   cd frontend
   npm run dev
   ```

4. **Access the Application**
   - Backend API: http://localhost:5000
   - Frontend: http://localhost:5173
   - pgAdmin (if using Docker): http://localhost:8080

## 📚 Additional Resources

- [PostgreSQL Official Documentation](https://www.postgresql.org/docs/)
- [Docker PostgreSQL Image](https://hub.docker.com/_/postgres)
- [Node.js pg Driver Documentation](https://node-postgres.com/)
- [SyncSphere API Documentation](./api-documentation.md)

---

**Need help?** If you encounter any issues during setup, please check the troubleshooting section above or refer to the project's issue tracker.