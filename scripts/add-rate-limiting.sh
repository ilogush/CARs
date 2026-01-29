#!/bin/bash

# Script to add rate limiting to POST endpoints
# This adds the necessary imports and rate limiting code to API routes

FILES=(
  "app/api/admin/sql-query/route.ts"
  "app/api/auth/logout/route.ts"
  "app/api/bookings/route.ts"
  "app/api/calendar-events/route.ts"
  "app/api/cars/route.ts"
  "app/api/chat/route.ts"
  "app/api/clients/route.ts"
  "app/api/companies/route.ts"
  "app/api/company-cars/route.ts"
  "app/api/contracts/route.ts"
  "app/api/hotels/route.ts"
  "app/api/location-seasons/route.ts"
  "app/api/managers/route.ts"
  "app/api/payments/route.ts"
  "app/api/tasks/route.ts"
  "app/api/users/route.ts"
)

RATE_LIMIT_CODE="    // Rate limiting: 10 requests per minute per IP
    const clientIp = getClientIp(request)
    const rateLimitResult = isRateLimited(clientIp, 10, 60000)
    
    if (rateLimitResult.limited) {
      return Response.json(
        { error: 'Too many requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
          }
        }
      )
    }

"

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."
    
    # Check if rate limiting import already exists
    if grep -q "isRateLimited.*getClientIp.*rate-limit" "$file"; then
      echo "  Already has rate limiting import, skipping..."
      continue
    fi
    
    # Add import after the last import statement
    sed -i '' '/^import.*from/a\
import { isRateLimited, getClientIp } from '\''@/lib/rate-limit'\''
' "$file"
    
    echo "  Added rate limiting import to $file"
  else
    echo "  Warning: $file not found"
  fi
done

echo "Done! Please manually add the rate limiting code block to each POST function."
