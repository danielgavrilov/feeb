#!/bin/bash
# Run the OpenFoodFacts data import in the Docker container

set -e

echo "📥 Running OpenFoodFacts data import in Docker container..."

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

# Run the import script
$DOCKER_COMPOSE exec api python -m data_pipeline.import_off

echo "✅ Data import completed!"

