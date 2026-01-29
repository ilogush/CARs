#!/bin/bash

# Script to replace console.error with logger.error in TypeScript files
# Usage: bash scripts/replace-console-errors.sh

echo "🔄 Replacing console.error with logger.error in API routes..."

# Find all TypeScript files in app/api directory
find app/api -name "*.ts" -type f | while read -r file; do
  # Check if file contains console.error
  if grep -q "console\.error" "$file"; then
    echo "Processing: $file"
    
    # Add logger import if not present
    if ! grep -q "import { logger } from '@/lib/logger'" "$file"; then
      # Find the last import line and add logger import after it
      sed -i '' '/^import.*from/a\
import { logger } from '\''@/lib/logger'\''
' "$file"
    fi
    
    # Replace console.error with logger.error (remove colons)
    sed -i '' "s/console\.error('\([^']*\):', /logger.error('\1', /g" "$file"
    sed -i '' 's/console\.error("\([^"]*\):", /logger.error("\1", /g' "$file"
    sed -i '' "s/console\.error('\([^']*\)')/logger.error('\1')/g" "$file"
    sed -i '' 's/console\.error("\([^"]*\)")/logger.error("\1")/g' "$file"
  fi
done

echo "✅ Done! Remember to review changes before committing."
