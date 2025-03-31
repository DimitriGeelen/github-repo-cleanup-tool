#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if a command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}Error: $1 is not installed.${NC}"
        exit 1
    fi
}

# Function to check Docker status
check_docker_status() {
    if ! docker info &> /dev/null; then
        echo -e "${RED}Error: Docker is not running.${NC}"
        echo -e "${YELLOW}Please start Docker and try again.${NC}"
        exit 1
    fi
}

# Main setup function
setup_docker() {
    echo -e "${CYAN}Starting Docker setup for github-repo-cleanup-tool...${NC}"

    # Check for required commands
    check_command docker
    check_command docker-compose

    # Check Docker status
    check_docker_status

    # Build and start containers
    echo -e "${CYAN}Building Docker containers...${NC}"
    docker-compose build || { echo -e "${RED}Failed to build containers${NC}"; exit 1; }

    echo -e "${CYAN}Starting Docker containers...${NC}"
    docker-compose up -d || { echo -e "${RED}Failed to start containers${NC}"; exit 1; }

    echo -e "${GREEN}Setup completed successfully!${NC}"
    echo -e "${CYAN}You can now access the application at: http://localhost:3000${NC}"
}

# Run the setup
setup_docker
