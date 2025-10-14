#!/bin/bash
# Quick status check for imports and database state
# Usage: ./scripts/check_import_status.sh

set -e

# Get script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo "========================================" 
echo "Import Status Check"
echo "========================================"
echo ""

# Check for running import process
echo "Running processes:"
if ps aux | grep -v grep | grep "python -m data_pipeline.import_off"; then
    echo "  ✓ Import process is RUNNING"
else
    echo "  ✗ No import process running"
fi
echo ""

# Check latest logs
echo "Recent log files:"
if [ -d "$PROJECT_ROOT/logs" ]; then
    ls -lth "$PROJECT_ROOT/logs" | head -n 6
else
    echo "  No logs directory found"
fi
echo ""

# Check database stats
echo "Database statistics:"
if [ -f "$PROJECT_ROOT/ingredient_api.db" ]; then
    sqlite3 "$PROJECT_ROOT/ingredient_api.db" <<EOF
.mode column
.headers on
SELECT 'Products' as TableName, COUNT(*) as Count FROM product
UNION ALL
SELECT 'Ingredients', COUNT(*) FROM ingredient
UNION ALL
SELECT 'Allergens', COUNT(*) FROM allergen
UNION ALL
SELECT 'Product-Ingredient links', COUNT(*) FROM product_ingredient
UNION ALL
SELECT 'Product-Allergen links', COUNT(*) FROM product_allergen
UNION ALL
SELECT 'Nutrition records', COUNT(*) FROM product_nutrition;
EOF
else
    echo "  Database file not found"
fi
echo ""

# Check last import summary
echo "Last import summary (from logs/import_summary.log):"
if [ -f "$PROJECT_ROOT/logs/import_summary.log" ]; then
    tail -n 15 "$PROJECT_ROOT/logs/import_summary.log"
else
    echo "  No summary log found"
fi
echo ""

echo "========================================"
echo "To monitor live import progress:"
echo "  tail -f logs/import_verbose_*.log | grep -E '\\[STEP|Progress|Complete'"
echo "========================================"

