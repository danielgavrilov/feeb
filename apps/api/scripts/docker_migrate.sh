#!/bin/bash
# Run Alembic migrations in the Docker container

set -e

echo "🔄 Running Alembic migrations in Docker container..."

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
if ! docker ps | grep -q feeb-api; then
    echo "❌ Error: feeb-api container is not running"
    echo "Please start the containers first with: $DOCKER_COMPOSE up -d"
    exit 1
fi

# Run migrations
$DOCKER_COMPOSE exec api alembic upgrade head

echo "✅ Migrations completed successfully!"

