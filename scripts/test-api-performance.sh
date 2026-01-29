#!/bin/bash

# API Performance Testing Script
# This script tests the optimized API endpoints and measures performance improvements

echo "🚀 API Performance Testing Script"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
AUTH_TOKEN="${AUTH_TOKEN:-}"

if [ -z "$AUTH_TOKEN" ]; then
    echo -e "${RED}Error: AUTH_TOKEN environment variable not set${NC}"
    echo "Usage: AUTH_TOKEN=your_token ./test-api-performance.sh"
    exit 1
fi

echo "📊 Testing API Endpoints..."
echo ""

# Function to test endpoint performance
test_endpoint() {
    local endpoint=$1
    local name=$2
    
    echo -e "${YELLOW}Testing: ${name}${NC}"
    
    # Warm-up request
    curl -s -o /dev/null "${API_BASE_URL}${endpoint}" \
        -H "Authorization: Bearer ${AUTH_TOKEN}"
    
    # Measure 5 requests
    total_time=0
    for i in {1..5}; do
        start=$(date +%s%3N)
        response=$(curl -s -w "\n%{http_code}\n%{time_total}" \
            "${API_BASE_URL}${endpoint}" \
            -H "Authorization: Bearer ${AUTH_TOKEN}")
        end=$(date +%s%3N)
        
        http_code=$(echo "$response" | tail -2 | head -1)
        time_total=$(echo "$response" | tail -1)
        
        elapsed=$((end - start))
        total_time=$((total_time + elapsed))
        
        echo "  Request $i: ${elapsed}ms (HTTP ${http_code})"
    done
    
    avg_time=$((total_time / 5))
    echo -e "${GREEN}  Average: ${avg_time}ms${NC}"
    echo ""
}

# Test car-brands endpoint
test_endpoint "/api/car-brands?page=1&pageSize=20" "GET /api/car-brands"

# Test contracts endpoint
test_endpoint "/api/contracts?page=1&pageSize=20" "GET /api/contracts"

# Test payments endpoint
test_endpoint "/api/payments?page=1&pageSize=20" "GET /api/payments"

# Test companies endpoint
test_endpoint "/api/companies?page=1&pageSize=20" "GET /api/companies"

# Test bookings endpoint
test_endpoint "/api/bookings?page=1&pageSize=20" "GET /api/bookings"

# Test with search filter
echo -e "${YELLOW}Testing Search Performance${NC}"
test_endpoint "/api/car-brands?page=1&pageSize=20&filters=%7B%22q%22%3A%22toy%22%7D" "GET /api/car-brands (with search)"

echo ""
echo "✅ Performance testing complete!"
echo ""
echo "Expected results after optimization:"
echo "  - car-brands: 50-150ms"
echo "  - contracts: 100-300ms"
echo "  - payments: 120-350ms"
echo "  - companies: 80-250ms"
echo "  - bookings: 90-280ms"
