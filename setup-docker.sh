#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print with emoji and color
print_step() {
    echo -e "\n\\\"
}

print_success() {
    echo -e "\ \\"
}

print_warning() {
    echo -e "\ \\"
}

print_error() {
    echo -e "\ \\"
}

# Check if Docker is installed
print_step " Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    echo -e "\ Visit: https://docs.docker.com/engine/install/\"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Ask for port configuration
print_step " Port Configuration"
default_port=3000
read -p "Enter the port number to host the application (default: \): " port
port=\

# Validate port number
if ! [[ "\" =~ ^[0-9]+$ ]] || [ "\" -lt 1 ] || [ "\" -gt 65535 ]; then
    print_warning "Invalid port number. Using default port \"
    port=\
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_step " Creating .env file from template..."
    if [ -f .env.example ]; then
        cp .env.example .env
        print_warning "Please update the .env file with your GitHub credentials"
    else
        print_error ".env.example file not found"
        exit 1
    fi
fi

# Update docker-compose.yml with the specified port
print_step " Configuring Docker environment..."
cat > docker-compose.yml << EOL
version: '3.8'
services:
  app:
    build: .
    ports:
      - "\:3000"
    environment:
      - PORT=\
    volumes:
      - .:/app
      - /app/node_modules
    env_file:
      - .env
EOL

# Build and start the Docker containers
print_step " Building Docker containers..."
docker-compose build

print_step " Starting the application..."
docker-compose up -d

# Wait for the application to start
print_step " Waiting for the application to start..."
sleep 5

# Check if the application is running
if docker-compose ps | grep -q "Up"; then
    print_success "Application is running successfully!"
    print_success "Access the application at: http://localhost:\"
else
    print_error "Failed to start the application. Check the logs with: docker-compose logs"
fi

# Print useful commands
echo -e "\n\ Useful commands:\"
echo -e "  - View logs: docker-compose logs -f"
echo -e "  - Stop application: docker-compose down"
echo -e "  - Restart application: docker-compose restart"
echo -e "  - View container status: docker-compose ps"
echo -e "  - Change port: Edit docker-compose.yml and run 'docker-compose up -d'"
