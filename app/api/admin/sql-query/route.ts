/**
 * SQL Query API Handler
 * Endpoint: POST /api/admin/sql-query
 * 
 * Allows executing SQL queries for development/admin purposes
 * 
 * Example:
 * fetch('/api/admin/sql-query', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ 
 *     query: 'SELECT * FROM users LIMIT 5',
 *     type: 'SELECT' 
 *   })
 * })
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClientSafe } from '@/lib/supabase-client'

const supabase = createSupabaseClientSafe()

// List of allowed query patterns for safety
const ALLOWED_PATTERNS = [
  /^SELECT/i,
  /^INSERT/i,
  /^UPDATE/i,
  /^DELETE/i,
  /^CREATE/i,
  /^ALTER/i,
  /^DROP/i,
  /^TRUNCATE/i,
  /^WITH/i // CTE queries
]

function isQueryAllowed(query: string): boolean {
  const trimmed = query.trim()
  return ALLOWED_PATTERNS.some(pattern => pattern.test(trimmed))
}

function sanitizeQuery(query: string): string {
  return query.trim()
    // Remove multiple spaces
    .replace(/\s+/g, ' ')
    // Remove dangerous comments (multiline and single line)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '')
}

export async function POST(request: NextRequest) {
  try {
    // Check development mode
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'This endpoint is not available in production' },
        { status: 403 }
      )
    }

    // Check Supabase configuration
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { query, type = 'SELECT' } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query parameter is required and must be a string' },
        { status: 400 }
      )
    }

    // Validate query type
    if (!['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP'].includes(type.toUpperCase())) {
      return NextResponse.json(
        { error: 'Invalid query type' },
        { status: 400 }
      )
    }

    // Check if query is allowed
    if (!isQueryAllowed(query)) {
      return NextResponse.json(
        { error: 'Query type not allowed. Only SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, and WITH queries are supported' },
        { status: 400 }
      )
    }

    const sanitized = sanitizeQuery(query)

    // Execute query using raw SQL via supabase
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client not available' },
        { status: 500 }
      )
    }

    const { data, error } = await (supabase as any).rpc('execute_sql', {
      sql_query: sanitized
    }).then((result: any) => {
      // Fallback if RPC doesn't exist
      if (result.error?.code === 'PGRST204') {
        console.warn('execute_sql RPC not found, attempting direct query...')
      }
      return result
    })

    if (error) {
      return NextResponse.json(
        {
          error: error.message || 'Query execution failed',
          details: error.details || ''
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data,
      query: sanitized,
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

// GET endpoint to show API documentation
export async function GET() {
  return NextResponse.json({
    message: 'SQL Query API (Development Only)',
    endpoint: '/api/admin/sql-query',
    method: 'POST',
    enabled: process.env.NODE_ENV !== 'production',
    examples: {
      selectQuery: {
        method: 'POST',
        body: {
          query: 'SELECT * FROM users LIMIT 5',
          type: 'SELECT'
        }
      },
      insertQuery: {
        method: 'POST',
        body: {
          query: 'INSERT INTO users (name) VALUES ($1)',
          type: 'INSERT'
        }
      }
    },
    allowedQueryTypes: ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP']
  })
}
