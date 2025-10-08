#!/bin/bash
# Database setup script for Allergen-Aware Ingredient API

set -e

echo "================================="
echo "Database Setup Script"
echo "================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Please copy .env.sample to .env and configure your DATABASE_URL"
    echo ""
    echo "  cp .env.sample .env"
    echo ""
    exit 1
fi

echo "✓ .env file found"

# Check if alembic is installed
if ! command -v alembic &> /dev/null; then
    echo "❌ Error: alembic not found"
    echo "Please install dependencies first:"
    echo ""
    echo "  pip install -r requirements.txt"
    echo ""
    exit 1
fi

echo "✓ Alembic is installed"
echo ""

# Run migrations
echo "Running database migrations..."
alembic upgrade head

echo ""
echo "================================="
echo "✓ Database setup complete!"
echo "================================="
echo ""
echo "Next steps:"
echo "  1. Import OpenFoodFacts data:"
echo "     python -m data_pipeline.import_off"
echo ""
echo "  2. Start the API server:"
echo "     uvicorn app.main:app --reload"
echo ""

