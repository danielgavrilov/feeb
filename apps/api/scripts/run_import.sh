#!/bin/bash
# Script to run OpenFoodFacts data import

set -e

echo "================================="
echo "OpenFoodFacts Data Import"
echo "================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Please copy .env.sample to .env and configure your DATABASE_URL"
    exit 1
fi

echo "This will download and import OpenFoodFacts data."
echo "Estimated download size: ~2GB"
echo "Estimated import time: 15-30 minutes"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Import cancelled"
    exit 0
fi

echo ""
echo "Starting import..."
echo ""

python -m data_pipeline.import_off

echo ""
echo "================================="
echo "✓ Import complete!"
echo "================================="
echo ""
echo "You can now start the API server:"
echo "  uvicorn app.main:app --reload"
echo ""

