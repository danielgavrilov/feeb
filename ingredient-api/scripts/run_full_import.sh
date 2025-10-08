#!/bin/bash
# Full OpenFoodFacts import script with managed logging
# Usage: ./scripts/run_full_import.sh

set -e

# Get script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Create logs directory
LOGS_DIR="$PROJECT_ROOT/logs"
mkdir -p "$LOGS_DIR"

# Generate timestamped log files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
VERBOSE_LOG="$LOGS_DIR/import_verbose_${TIMESTAMP}.log"
SUMMARY_LOG="$LOGS_DIR/import_summary.log"

# Archive old verbose logs (keep only last 3)
cd "$LOGS_DIR"
ls -t import_verbose_*.log 2>/dev/null | tail -n +4 | xargs rm -f 2>/dev/null || true

echo "========================================" | tee -a "$SUMMARY_LOG"
echo "Import started: $(date)" | tee -a "$SUMMARY_LOG"
echo "Verbose log: $VERBOSE_LOG" | tee -a "$SUMMARY_LOG"
echo "========================================" | tee -a "$SUMMARY_LOG"
echo ""

# Activate venv if present
if [ -f "$PROJECT_ROOT/../.venv/bin/activate" ]; then
    source "$PROJECT_ROOT/../.venv/bin/activate"
fi

# Run import with unlimited products
cd "$PROJECT_ROOT"
SAMPLE_PRODUCT_LIMIT=0 python -m data_pipeline.import_off 2>&1 | tee "$VERBOSE_LOG"

# Capture exit code
EXIT_CODE=${PIPESTATUS[0]}

# Log completion
echo "" | tee -a "$SUMMARY_LOG"
echo "========================================" | tee -a "$SUMMARY_LOG"
if [ $EXIT_CODE -eq 0 ]; then
    echo "Import completed successfully: $(date)" | tee -a "$SUMMARY_LOG"
else
    echo "Import failed with exit code $EXIT_CODE: $(date)" | tee -a "$SUMMARY_LOG"
fi
echo "========================================" | tee -a "$SUMMARY_LOG"
echo "" | tee -a "$SUMMARY_LOG"

# Show summary stats
echo "Database summary:"
sqlite3 "$PROJECT_ROOT/ingredient_api.db" <<EOF
SELECT 'Products: ' || COUNT(*) FROM product;
SELECT 'Ingredients: ' || COUNT(*) FROM ingredient;
SELECT 'Allergens: ' || COUNT(*) FROM allergen;
SELECT 'Product-Ingredient links: ' || COUNT(*) FROM product_ingredient;
SELECT 'Product-Allergen links: ' || COUNT(*) FROM product_allergen;
SELECT 'Nutrition records: ' || COUNT(*) FROM product_nutrition;
EOF

exit $EXIT_CODE

