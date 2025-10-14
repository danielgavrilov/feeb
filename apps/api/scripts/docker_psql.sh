#!/bin/bash
# Connect to PostgreSQL container using psql

set -e

echo "🔗 Connecting to PostgreSQL container..."

# Detect docker compose command (docker-compose vs docker compose)
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    echo "❌ Error: Neither 'docker-compose' nor 'docker compose' found"
    exit 1
fi

# Check if the container is running
if ! docker ps | grep -q feeb-postgres; then
    echo "❌ Error: feeb-postgres container is not running"
    echo "Please start the containers first with: $DOCKER_COMPOSE up -d"
    exit 1
fi

# Connect to PostgreSQL
$DOCKER_COMPOSE exec postgres psql -U feeb_user -d feeb_db

