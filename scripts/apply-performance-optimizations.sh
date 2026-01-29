#!/bin/bash

# Performance Optimization Migration Script
# Run this script to apply all performance optimizations to your Supabase database

set -e

echo "🚀 Starting Performance Optimization Migration..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Apply migrations
echo "📦 Applying database migrations..."
echo ""

# Check if connected to Supabase project
if ! supabase projects list &> /dev/null; then
    echo "⚠️  Not logged in to Supabase."
    echo "Run: supabase login"
    exit 1
fi

# Apply the new performance indexes migration
echo "1️⃣  Applying extended performance indexes..."
supabase db push

echo ""
echo "✅ All migrations applied successfully!"
echo ""

# Verify indexes were created
echo "🔍 Verifying indexes..."
echo ""
echo "Run the following SQL to check indexes:"
echo ""
echo "SELECT"
echo "  schemaname,"
echo "  tablename,"
echo "  indexname,"
echo "  indexdef"
echo "FROM pg_indexes"
echo "WHERE schemaname = 'public'"
echo "  AND indexname LIKE 'idx_%'"
echo "ORDER BY tablename, indexname;"
echo ""

echo "📊 Performance Tips:"
echo ""
echo "1. Monitor slow queries with:"
echo "   SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
echo ""
echo "2. Check index usage:"
echo "   SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public';"
echo ""
echo "3. Analyze table statistics:"
echo "   ANALYZE;"
echo ""

echo "✅ Migration complete! Your database should now be faster."
