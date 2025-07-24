#!/bin/bash

# SyncSphere PostgreSQL Docker Setup Script
# This script sets up PostgreSQL and Redis using Docker Compose

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.postgres.yml"
INCLUDE_REDIS=true
INCLUDE_PGADMIN=false
FORCE_RECREATE=false

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

# Function to check if Docker is installed
check_docker() {
    if ! command -v docker >/dev/null 2>&1; then
        print_error "Docker is not installed. Please install Docker first."
        print_info "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        print_info "Visit: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    print_status "Docker and Docker Compose are available"
}

# Function to check if Docker daemon is running
check_docker_daemon() {
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker daemon is not running. Please start Docker first."
        exit 1
    fi
    
    print_status "Docker daemon is running"
}

# Function to create necessary directories
create_directories() {
    print_progress "Creating necessary directories..."
    
    mkdir -p docker/postgres
    mkdir -p docker/redis
    
    print_status "Directories created"
}

# Function to stop existing containers
stop_existing_containers() {
    print_progress "Stopping existing containers..."
    
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local project_root="$(dirname "$(dirname "$script_dir")")"
    
    cd "$project_root"
    
    if [[ -f "$COMPOSE_FILE" ]]; then
        docker-compose -f "$COMPOSE_FILE" down 2>/dev/null || docker compose -f "$COMPOSE_FILE" down 2>/dev/null || true
    fi
    
    # Stop individual containers if they exist
    docker stop syncsphere-postgres syncsphere-redis syncsphere-pgadmin 2>/dev/null || true
    docker rm syncsphere-postgres syncsphere-redis syncsphere-pgadmin 2>/dev/null || true
    
    print_status "Existing containers stopped"
}

# Function to start PostgreSQL with Docker Compose
start_postgresql() {
    print_progress "Starting PostgreSQL with Docker Compose..."
    
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local project_root="$(dirname "$(dirname "$script_dir")")"
    
    cd "$project_root"
    
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        print_error "Docker Compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    # Build compose command
    local compose_cmd="docker-compose"
    if ! command -v docker-compose >/dev/null 2>&1; then
        compose_cmd="docker compose"
    fi
    
    local services="postgres"
    if [[ "$INCLUDE_REDIS" == "true" ]]; then
        services="$services redis"
    fi
    
    # Start services
    if [[ "$FORCE_RECREATE" == "true" ]]; then
        $compose_cmd -f "$COMPOSE_FILE" up -d --force-recreate $services
    else
        $compose_cmd -f "$COMPOSE_FILE" up -d $services
    fi
    
    print_status "PostgreSQL container started"
}

# Function to start pgAdmin if requested
start_pgadmin() {
    if [[ "$INCLUDE_PGADMIN" == "true" ]]; then
        print_progress "Starting pgAdmin..."
        
        local compose_cmd="docker-compose"
        if ! command -v docker-compose >/dev/null 2>&1; then
            compose_cmd="docker compose"
        fi
        
        $compose_cmd -f "$COMPOSE_FILE" --profile admin up -d pgadmin
        
        print_status "pgAdmin started at http://localhost:8080"
        print_info "Login: admin@syncsphere.com / admin"
    fi
}

# Function to wait for PostgreSQL to be ready
wait_for_postgresql() {
    print_progress "Waiting for PostgreSQL to be ready..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if docker exec syncsphere-postgres pg_isready -U postgres -d syncsphere >/dev/null 2>&1; then
            print_status "PostgreSQL is ready"
            return 0
        fi
        
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    print_error "PostgreSQL failed to start within expected time"
    return 1
}

# Function to test database connection
test_database_connection() {
    print_progress "Testing database connection..."
    
    if docker exec syncsphere-postgres psql -U postgres -d syncsphere -c "SELECT version();" >/dev/null 2>&1; then
        local version=$(docker exec syncsphere-postgres psql -U postgres -d syncsphere -tAc "SELECT version();")
        print_status "Database connection successful"
        print_info "Version: $version"
        return 0
    else
        print_error "Failed to connect to database"
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
        sed -i.bak "s/DB_HOST=.*/DB_HOST=localhost/" "$env_path"
        sed -i.bak "s/DB_PORT=.*/DB_PORT=5432/" "$env_path"
        sed -i.bak "s/DB_NAME=.*/DB_NAME=syncsphere/" "$env_path"
        sed -i.bak "s/DB_USER=.*/DB_USER=postgres/" "$env_path"
        sed -i.bak "s/DB_PASSWORD=.*/DB_PASSWORD=postgres/" "$env_path"
        sed -i.bak "s/REDIS_HOST=.*/REDIS_HOST=localhost/" "$env_path"
        sed -i.bak "s/REDIS_PORT=.*/REDIS_PORT=6379/" "$env_path"
        
        # Remove backup file
        rm -f "$env_path.bak"
        
        print_status ".env file updated with Docker configuration"
    else
        print_warning ".env file not found at: $env_path"
        print_info "Please ensure your .env file has the following configuration:"
        echo -e "${CYAN}DB_HOST=localhost${NC}"
        echo -e "${CYAN}DB_PORT=5432${NC}"
        echo -e "${CYAN}DB_NAME=syncsphere${NC}"
        echo -e "${CYAN}DB_USER=postgres${NC}"
        echo -e "${CYAN}DB_PASSWORD=postgres${NC}"
        echo -e "${CYAN}REDIS_HOST=localhost${NC}"
        echo -e "${CYAN}REDIS_PORT=6379${NC}"
    fi
}

# Function to show container status
show_container_status() {
    print_info "Container Status:"
    echo ""
    docker ps --filter "name=syncsphere" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --no-redis            Don't start Redis container"
    echo "  --with-pgadmin        Start pgAdmin container"
    echo "  --force-recreate      Force recreate containers"
    echo "  --stop                Stop all containers"
    echo "  --restart             Restart all containers"
    echo "  --logs                Show container logs"
    echo "  --status              Show container status"
    echo "  --help                Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    Start PostgreSQL and Redis"
    echo "  $0 --with-pgadmin     Start with pgAdmin web interface"
    echo "  $0 --stop             Stop all containers"
    echo "  $0 --logs             Show container logs"
}

# Function to show logs
show_logs() {
    local compose_cmd="docker-compose"
    if ! command -v docker-compose >/dev/null 2>&1; then
        compose_cmd="docker compose"
    fi
    
    $compose_cmd -f "$COMPOSE_FILE" logs -f
}

# Function to stop containers
stop_containers() {
    print_progress "Stopping containers..."
    stop_existing_containers
    print_status "All containers stopped"
}

# Function to restart containers
restart_containers() {
    print_progress "Restarting containers..."
    stop_existing_containers
    sleep 2
    start_postgresql
    if [[ "$INCLUDE_PGADMIN" == "true" ]]; then
        start_pgadmin
    fi
    print_status "Containers restarted"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-redis)
            INCLUDE_REDIS=false
            shift
            ;;
        --with-pgadmin)
            INCLUDE_PGADMIN=true
            shift
            ;;
        --force-recreate)
            FORCE_RECREATE=true
            shift
            ;;
        --stop)
            stop_containers
            exit 0
            ;;
        --restart)
            restart_containers
            exit 0
            ;;
        --logs)
            show_logs
            exit 0
            ;;
        --status)
            show_container_status
            exit 0
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
    echo -e "${CYAN}🐳 SyncSphere PostgreSQL Docker Setup${NC}"
    echo -e "${CYAN}====================================${NC}"
    echo ""
    
    # Check prerequisites
    check_docker
    check_docker_daemon
    
    # Create directories
    create_directories
    
    # Stop existing containers
    stop_existing_containers
    
    # Start PostgreSQL
    echo ""
    start_postgresql
    
    # Start pgAdmin if requested
    if [[ "$INCLUDE_PGADMIN" == "true" ]]; then
        start_pgadmin
    fi
    
    # Wait for PostgreSQL to be ready
    echo ""
    if ! wait_for_postgresql; then
        print_error "Setup failed: PostgreSQL not ready"
        exit 1
    fi
    
    # Test database connection
    echo ""
    if ! test_database_connection; then
        print_error "Setup failed: Cannot connect to database"
        exit 1
    fi
    
    # Update .env file
    echo ""
    update_environment_file
    
    # Show status
    echo ""
    show_container_status
    
    echo ""
    print_status "Docker setup completed successfully!"
    echo -e "${GREEN}====================================${NC}"
    echo -e "${CYAN}PostgreSQL: localhost:5432${NC}"
    echo -e "${CYAN}Database: syncsphere${NC}"
    echo -e "${CYAN}User: postgres${NC}"
    echo -e "${CYAN}Password: postgres${NC}"
    
    if [[ "$INCLUDE_REDIS" == "true" ]]; then
        echo -e "${CYAN}Redis: localhost:6379${NC}"
    fi
    
    if [[ "$INCLUDE_PGADMIN" == "true" ]]; then
        echo -e "${CYAN}pgAdmin: http://localhost:8080${NC}"
        echo -e "${CYAN}pgAdmin Login: admin@syncsphere.com / admin${NC}"
    fi
    
    echo ""
    print_status "You can now start the SyncSphere backend server!"
    echo -e "${CYAN}Run: npm run dev${NC}"
    echo ""
    print_info "Useful commands:"
    echo -e "${CYAN}  $0 --stop        Stop containers${NC}"
    echo -e "${CYAN}  $0 --restart     Restart containers${NC}"
    echo -e "${CYAN}  $0 --logs        Show logs${NC}"
    echo -e "${CYAN}  $0 --status      Show status${NC}"
}

# Run main function
main "$@"