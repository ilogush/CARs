import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20'), 100)
    const sortBy = searchParams.get('sortBy')
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null
    const filters = JSON.parse(searchParams.get('filters') || '{}')

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if table exists
    const { error: checkError } = await supabaseAdmin.from('generated_reports').select('id').limit(1)
    if (checkError && checkError.code === '42P01') {
      console.warn('Reports table missing')
      return Response.json({ data: [], totalCount: 0 })
    }

    let query = supabaseAdmin
      .from('generated_reports')
      .select('*', { count: 'exact' })

    // Apply filters
    if (filters.q) {
      const val = filters.q as string
      query = query.or('title.ilike.%' + val + '%,type.ilike.%' + val + '%')
    }

    if (sortBy) {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count, error } = await query.range(from, to)

    if (error) {
      console.error('Supabase error fetching reports:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({
      data: data || [],
      totalCount: count || 0
    })

  } catch (error) {
    console.error('Internal server error in /api/reports:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
