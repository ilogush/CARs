/**
 * SQL Query Utility - Client-side helper for SQL operations
 * 
 * Usage in components:
 * const result = await executeSqlQuery('SELECT * FROM users')
 * const rows = await executeSqlQuery('SELECT * FROM users WHERE id = $1', [123])
 */

interface SqlQueryResult {
  success: boolean
  data?: any
  error?: string
  details?: string
  query?: string
  timestamp?: string
}

interface SqlQueryOptions {
  timeout?: number
  throwOnError?: boolean
  debug?: boolean
}

const DEFAULT_TIMEOUT = 30000 // 30 seconds

/**
 * Execute a SQL query via the API
 * @param query - SQL query string
 * @param options - Query options
 * @returns Query result
 */
export async function executeSqlQuery(
  query: string,
  options: SqlQueryOptions = {}
): Promise<SqlQueryResult> {
  const { 
    timeout = DEFAULT_TIMEOUT,
    throwOnError = false,
    debug = false
  } = options

  if (debug) {
    console.log('[SQL Debug] Executing:', query)
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch('/api/admin/sql-query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query.trim(),
        type: detectQueryType(query)
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const result = await response.json()

    if (debug) {
      console.log('[SQL Debug] Result:', result)
    }

    if (!response.ok) {
      if (throwOnError) {
        throw new Error(result.error || 'Query execution failed')
      }
      return {
        success: false,
        error: result.error,
        details: result.details,
        query: query
      }
    }

    return {
      success: true,
      ...result
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    
    if (throwOnError) {
      throw error
    }

    return {
      success: false,
      error: message,
      query: query
    }
  }
}

/**
 * Detect query type from SQL string
 */
function detectQueryType(query: string): string {
  const match = query.trim().match(/^(\w+)/i)
  return match ? match[1].toUpperCase() : 'SELECT'
}

/**
 * Execute multiple queries in sequence
 */
export async function executeSqlBatch(
  queries: string[],
  options: SqlQueryOptions = {}
): Promise<SqlQueryResult[]> {
  const results: SqlQueryResult[] = []
  
  for (const query of queries) {
    const result = await executeSqlQuery(query, options)
    results.push(result)
    
    if (!result.success && options.throwOnError) {
      break
    }
  }

  return results
}

/**
 * Format SQL query results as table
 */
export function formatQueryResultAsTable(result: SqlQueryResult): string {
  if (!result.success) {
    return `Error: ${result.error}`
  }

  if (!result.data || result.data.length === 0) {
    return 'No results'
  }

  const rows = Array.isArray(result.data) ? result.data : [result.data]
  const headers = Object.keys(rows[0])
  
  let table = headers.join(' | ') + '\n'
  table += headers.map(h => '-'.repeat(h.length)).join(' | ') + '\n'
  
  rows.forEach(row => {
    table += headers.map(h => String(row[h] ?? 'NULL')).join(' | ') + '\n'
  })

  return table
}

/**
 * Download query results as CSV
 */
export function downloadQueryResultAsCSV(
  result: SqlQueryResult,
  filename: string = 'query-result.csv'
): void {
  if (!result.success || !result.data) {
    console.error('Cannot download empty result')
    return
  }

  const rows = Array.isArray(result.data) ? result.data : [result.data]
  const headers = Object.keys(rows[0])
  
  let csv = headers.map(h => `"${h}"`).join(',') + '\n'
  
  rows.forEach(row => {
    csv += headers.map(h => {
      const value = row[h] ?? ''
      return `"${String(value).replace(/"/g, '""')}"`
    }).join(',') + '\n'
  })

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}

/**
 * Get API health status
 */
export async function checkSqlApiHealth(): Promise<boolean> {
  try {
    const response = await fetch('/api/admin/sql-query', {
      method: 'GET'
    })
    return response.ok
  } catch {
    return false
  }
}
