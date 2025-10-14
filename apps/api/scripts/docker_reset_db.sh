#!/bin/bash
# Reset the PostgreSQL database (WARNING: Deletes all data!)

set -e

echo "⚠️  WARNING: This will delete ALL data in the PostgreSQL database!"
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

# Detect docker compose command (docker-compose vs docker compose)
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    echo "❌ Error: Neither 'docker-compose' nor 'docker compose' found"
    exit 1
fi

echo "🗑️  Stopping containers and removing volumes..."
$DOCKER_COMPOSE down -v

echo "🚀 Starting fresh containers..."
$DOCKER_COMPOSE up -d

echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

echo "✅ Database reset complete! Now run ./scripts/docker_migrate.sh"

