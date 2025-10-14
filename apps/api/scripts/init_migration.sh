#!/bin/bash
# Initialize first database migration

set -e

echo "================================="
echo "Initialize Database Migration"
echo "================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Please copy .env.sample to .env and configure your DATABASE_URL"
    exit 1
fi

echo "Creating initial migration..."
echo ""

# Create initial migration
alembic revision --autogenerate -m "Create ingredient allergen tables"

echo ""
echo "================================="
echo "✓ Migration created!"
echo "================================="
echo ""
echo "Next steps:"
echo "  1. Review the migration in alembic/versions/"
echo "  2. Apply the migration:"
echo "     alembic upgrade head"
echo ""

