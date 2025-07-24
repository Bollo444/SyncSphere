#!/bin/bash

# SyncSphere PostgreSQL Setup Script for macOS/Linux
# This script automates PostgreSQL installation and configuration on Unix-like systems

set -e

# Default configuration
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_NAME="${DB_NAME:-syncsphere}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
SKIP_INSTALL=false
FORCE=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_info() {
    echo -e "${CYAN}🔍 $1${NC}"
}

print_progress() {
    echo -e "${YELLOW}🔧 $1${NC}"
}

# Function to detect operating system
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ -f /etc/debian_version ]]; then
        echo "debian"
    elif [[ -f /etc/redhat-release ]]; then
        echo "redhat"
    elif [[ -f /etc/arch-release ]]; then
        echo "arch"
    else
        echo "unknown"
    fi
}

# Function to check if PostgreSQL is installed
check_postgresql_installed() {
    if command -v psql >/dev/null 2>&1; then
        local version=$(psql --version 2>/dev/null)
        print_status "PostgreSQL is already installed: $version"
        return 0
    fi
    
    # Check for PostgreSQL service on Linux
    if systemctl is-active --quiet postgresql 2>/dev/null; then
        print_status "PostgreSQL service is running"
        return 0
    fi
    
    # Check for PostgreSQL on macOS
    if brew services list 2>/dev/null | grep -q postgresql; then
        print_status "PostgreSQL service found via Homebrew"
        return 0
    fi
    
    return 1
}

# Function to install PostgreSQL on macOS
install_postgresql_macos() {
    print_progress "Installing PostgreSQL on macOS..."
    
    # Check if Homebrew is installed
    if ! command -v brew >/dev/null 2>&1; then
        print_error "Homebrew not found. Installing Homebrew first..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    
    # Install PostgreSQL
    print_progress "Installing PostgreSQL via Homebrew..."
    brew install postgresql@15
    
    # Start PostgreSQL service
    print_progress "Starting PostgreSQL service..."
    brew services start postgresql@15
    
    # Add PostgreSQL to PATH
    echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
    export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
    
    print_status "PostgreSQL installed successfully on macOS"
}

# Function to install PostgreSQL on Debian/Ubuntu
install_postgresql_debian() {
    print_progress "Installing PostgreSQL on Debian/Ubuntu..."
    
    # Update package list
    sudo apt-get update
    
    # Install PostgreSQL
    sudo apt-get install -y postgresql postgresql-contrib
    
    # Start and enable PostgreSQL service
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    print_status "PostgreSQL installed successfully on Debian/Ubuntu"
}

# Function to install PostgreSQL on Red Hat/CentOS/Fedora
install_postgresql_redhat() {
    print_progress "Installing PostgreSQL on Red Hat/CentOS/Fedora..."
    
    # Detect package manager
    if command -v dnf >/dev/null 2>&1; then
        sudo dnf install -y postgresql postgresql-server postgresql-contrib
    elif command -v yum >/dev/null 2>&1; then
        sudo yum install -y postgresql postgresql-server postgresql-contrib
    else
        print_error "No supported package manager found"
        return 1
    fi
    
    # Initialize database
    sudo postgresql-setup --initdb
    
    # Start and enable PostgreSQL service
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    print_status "PostgreSQL installed successfully on Red Hat/CentOS/Fedora"
}

# Function to install PostgreSQL on Arch Linux
install_postgresql_arch() {
    print_progress "Installing PostgreSQL on Arch Linux..."
    
    # Install PostgreSQL
    sudo pacman -S --noconfirm postgresql
    
    # Initialize database
    sudo -u postgres initdb -D /var/lib/postgres/data
    
    # Start and enable PostgreSQL service
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    print_status "PostgreSQL installed successfully on Arch Linux"
}

# Function to configure PostgreSQL user and authentication
configure_postgresql() {
    print_progress "Configuring PostgreSQL authentication..."
    
    local os_type=$(detect_os)
    
    # Set password for postgres user
    if [[ "$os_type" == "macos" ]]; then
        # On macOS with Homebrew, postgres user might not need password initially
        createdb postgres 2>/dev/null || true
        psql -d postgres -c "ALTER USER postgres PASSWORD '$DB_PASSWORD';" 2>/dev/null || {
            # If postgres user doesn't exist, create it
            createuser -s postgres 2>/dev/null || true
            psql -d postgres -c "ALTER USER postgres PASSWORD '$DB_PASSWORD';" 2>/dev/null || true
        }
    else
        # On Linux, use sudo to access postgres user
        sudo -u postgres psql -c "ALTER USER postgres PASSWORD '$DB_PASSWORD';"
    fi
    
    print_status "PostgreSQL user configured"
}

# Function to test PostgreSQL connection
test_postgresql_connection() {
    print_info "Testing PostgreSQL connection..."
    
    export PGPASSWORD="$DB_PASSWORD"
    
    if psql -h localhost -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT version();" >/dev/null 2>&1; then
        local version=$(psql -h localhost -p "$DB_PORT" -U "$DB_USER" -d postgres -tAc "SELECT version();")
        print_status "PostgreSQL connection successful"
        print_info "Version: $version"
        return 0
    else
        print_error "Failed to connect to PostgreSQL"
        return 1
    fi
}

# Function to create database
create_syncsphere_database() {
    print_progress "Creating SyncSphere database..."
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Check if database already exists
    local db_exists=$(psql -h localhost -p "$DB_PORT" -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';")
    
    if [[ "$db_exists" == "1" ]]; then
        if [[ "$FORCE" == "true" ]]; then
            print_warning "Database '$DB_NAME' exists. Dropping and recreating..."
            psql -h localhost -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
        else
            print_status "Database '$DB_NAME' already exists"
            return 0
        fi
    fi
    
    # Create database
    if psql -h localhost -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"; then
        print_status "Database '$DB_NAME' created successfully"
        return 0
    else
        print_error "Failed to create database '$DB_NAME'"
        return 1
    fi
}

# Function to initialize database schema
initialize_database_schema() {
    print_progress "Initializing database schema..."
    
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local schema_path="$script_dir/init-db.sql"
    
    if [[ ! -f "$schema_path" ]]; then
        print_error "Schema file not found: $schema_path"
        return 1
    fi
    
    export PGPASSWORD="$DB_PASSWORD"
    
    if psql -h localhost -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$schema_path" >/dev/null 2>&1; then
        print_status "Database schema initialized successfully"
        return 0
    else
        print_error "Failed to initialize database schema"
        return 1
    fi
}

# Function to update .env file
update_environment_file() {
    print_progress "Updating .env configuration..."
    
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local env_path="$(dirname "$script_dir")/.env"
    
    if [[ -f "$env_path" ]]; then
        # Update existing .env file
        sed -i.bak "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" "$env_path"
        sed -i.bak "s/DB_PORT=.*/DB_PORT=$DB_PORT/" "$env_path"
        sed -i.bak "s/DB_NAME=.*/DB_NAME=$DB_NAME/" "$env_path"
        sed -i.bak "s/DB_USER=.*/DB_USER=$DB_USER/" "$env_path"
        
        # Remove backup file
        rm -f "$env_path.bak"
        
        print_status ".env file updated with database configuration"
    else
        print_warning ".env file not found at: $env_path"
        print_info "Please ensure your .env file has the following configuration:"
        echo -e "${CYAN}DB_HOST=localhost${NC}"
        echo -e "${CYAN}DB_PORT=$DB_PORT${NC}"
        echo -e "${CYAN}DB_NAME=$DB_NAME${NC}"
        echo -e "${CYAN}DB_USER=$DB_USER${NC}"
        echo -e "${CYAN}DB_PASSWORD=$DB_PASSWORD${NC}"
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --password PASSWORD    Set PostgreSQL password (default: postgres)"
    echo "  --database DATABASE    Set database name (default: syncsphere)"
    echo "  --port PORT           Set PostgreSQL port (default: 5432)"
    echo "  --skip-install        Skip PostgreSQL installation"
    echo "  --force               Force recreate database if exists"
    echo "  --help                Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  DB_PASSWORD           PostgreSQL password"
    echo "  DB_NAME              Database name"
    echo "  DB_PORT              PostgreSQL port"
    echo "  DB_USER              PostgreSQL user"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --password)
            DB_PASSWORD="$2"
            shift 2
            ;;
        --database)
            DB_NAME="$2"
            shift 2
            ;;
        --port)
            DB_PORT="$2"
            shift 2
            ;;
        --skip-install)
            SKIP_INSTALL=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    echo -e "${CYAN}🚀 SyncSphere PostgreSQL Setup for Unix${NC}"
    echo -e "${CYAN}======================================${NC}"
    echo ""
    
    # Detect operating system
    local os_type=$(detect_os)
    print_info "Detected OS: $os_type"
    
    # Check if PostgreSQL is already installed
    if check_postgresql_installed; then
        if [[ "$SKIP_INSTALL" == "false" ]]; then
            print_info "PostgreSQL is already installed, skipping installation"
        fi
    elif [[ "$SKIP_INSTALL" == "false" ]]; then
        print_progress "Installing PostgreSQL..."
        
        case $os_type in
            macos)
                install_postgresql_macos
                ;;
            debian)
                install_postgresql_debian
                ;;
            redhat)
                install_postgresql_redhat
                ;;
            arch)
                install_postgresql_arch
                ;;
            *)
                print_error "Unsupported operating system: $os_type"
                print_info "Please install PostgreSQL manually and run with --skip-install"
                exit 1
                ;;
        esac
        
        # Wait for service to start
        print_progress "Waiting for PostgreSQL service to start..."
        sleep 5
        
        # Configure PostgreSQL
        configure_postgresql
    fi
    
    # Test connection
    echo ""
    if ! test_postgresql_connection; then
        print_error "Cannot connect to PostgreSQL. Please check the installation and try again."
        exit 1
    fi
    
    # Create database
    echo ""
    if ! create_syncsphere_database; then
        print_error "Failed to create SyncSphere database."
        exit 1
    fi
    
    # Initialize schema
    echo ""
    if ! initialize_database_schema; then
        print_error "Failed to initialize database schema."
        exit 1
    fi
    
    # Update .env file
    echo ""
    update_environment_file
    
    echo ""
    print_status "PostgreSQL setup completed successfully!"
    echo -e "${GREEN}==========================================${NC}"
    echo -e "${CYAN}Database: $DB_NAME${NC}"
    echo -e "${CYAN}Host: localhost${NC}"
    echo -e "${CYAN}Port: $DB_PORT${NC}"
    echo -e "${CYAN}User: $DB_USER${NC}"
    echo ""
    print_status "You can now start the SyncSphere backend server!"
    echo -e "${CYAN}Run: npm run dev${NC}"
}

# Run main function
main "$@"