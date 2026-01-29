import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20'), 100)
    const sortBy = searchParams.get('sortBy')
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null

    // Safe parsing of filters with error handling
    let filters: Record<string, any> = {}
    try {
      const filtersParam = searchParams.get('filters')
      if (filtersParam) {
        filters = JSON.parse(filtersParam)
      }
    } catch (parseError) {
      console.warn('Invalid filters JSON, using empty filters:', parseError)
      filters = {}
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables')
      return Response.json({ error: 'Server configuration error: Missing Supabase credentials' }, { status: 500 })
    }

    const supabaseAdmin = createSupabaseClient(
      supabaseUrl,
      supabaseServiceKey
    )

    // Check if table exists
    const { error: checkError } = await supabaseAdmin.from('tasks').select('id').limit(1)
    if (checkError && checkError.code === '42P01') {
      console.warn('Tasks table missing')
      return Response.json({ data: [], totalCount: 0 })
    }

    // Use Supabase relation syntax - simpler approach without explicit FK hints
    // The FK columns assigned_to and created_by point to users.id
    let query = supabaseAdmin
      .from('tasks')
      .select('*', { count: 'exact' })

    // Apply filters
    if (filters.q) {
      const val = filters.q as string
      query = query.or('title.ilike.%' + val + '%,description.ilike.%' + val + '%')
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status)
      } else {
        query = query.eq('status', filters.status)
      }
    }

    if (filters.created_by) {
      query = query.eq('created_by', filters.created_by)
    }

    if (sortBy) {
      query = query.order(sortBy, { ascending: sortOrder === 'asc', nullsFirst: false })
    } else {
      // Order by due_date with nulls last
      query = query.order('due_date', { ascending: true, nullsFirst: false })
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count, error } = await query.range(from, to)

    if (error) {
      console.error('Supabase error fetching tasks:', error)
      console.error('Error code:', error.code)
      console.error('Error details:', error.details)
      console.error('Error hint:', error.hint)

      // If relation/foreign key error, try query without user relations
      if (error.message?.includes('relation') ||
        error.message?.includes('does not exist') ||
        error.message?.includes('foreign key') ||
        error.code === '42P01' ||
        error.code === '42704') {
        console.warn('Retrying without user relations due to FK/relation error')

        try {
          let simpleQuery = supabaseAdmin
            .from('tasks')
            .select('*', { count: 'exact' })

          // Reapply filters
          if (filters.q) {
            const val = filters.q as string
            simpleQuery = simpleQuery.or('title.ilike.%' + val + '%,description.ilike.%' + val + '%')
          }
          if (filters.status) {
            if (Array.isArray(filters.status)) {
              simpleQuery = simpleQuery.in('status', filters.status)
            } else {
              simpleQuery = simpleQuery.eq('status', filters.status)
            }
          }
          if (filters.created_by) {
            simpleQuery = simpleQuery.eq('created_by', filters.created_by)
          }
          if (sortBy) {
            simpleQuery = simpleQuery.order(sortBy, { ascending: sortOrder === 'asc', nullsFirst: false })
          } else {
            simpleQuery = simpleQuery.order('due_date', { ascending: true, nullsFirst: false })
          }

          const { data: simpleData, count: simpleCount, error: simpleError } = await simpleQuery.range(from, to)

          if (simpleError) {
            console.error('Error in fallback query:', simpleError)
            return Response.json({
              error: 'Database error',
              details: simpleError.message,
              code: simpleError.code
            }, { status: 500 })
          }

          return Response.json({
            data: simpleData || [],
            totalCount: simpleCount || 0
          })
        } catch (fallbackError: any) {
          console.error('Error in fallback query execution:', fallbackError)
          return Response.json({
            error: 'Internal server error',
            details: fallbackError.message
          }, { status: 500 })
        }
      }

      return Response.json({
        error: 'Database error',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    return Response.json({
      data: data || [],
      totalCount: count || 0
    })

  } catch (error: any) {
    console.error('Internal server error in /api/tasks:', error)
    return Response.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const taskSchema = z.object({
      title: z.string().min(1, 'Title is required'),
      description: z.string().nullable().optional(),
      status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending'),
      due_date: z.string().nullable().optional(),
      assigned_to: z.union([
        z.string().uuid().nullable(),
        z.array(z.string().uuid())
      ]).optional(),
    })

    const validatedData = taskSchema.parse(body)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables')
      return Response.json({ error: 'Server configuration error: Missing Supabase credentials' }, { status: 500 })
    }

    const supabaseAdmin = createSupabaseClient(
      supabaseUrl,
      supabaseServiceKey
    )

    // Handle multiple recipients: create a task for each assigned user
    const assignedToArray = Array.isArray(validatedData.assigned_to)
      ? validatedData.assigned_to
      : (validatedData.assigned_to ? [validatedData.assigned_to] : [])

    if (assignedToArray.length === 0) {
      return Response.json({ error: 'At least one recipient is required' }, { status: 400 })
    }

    // Create tasks for each recipient
    const tasksToInsert = assignedToArray.map(assignedTo => ({
      title: validatedData.title,
      description: validatedData.description || null,
      status: validatedData.status || 'pending',
      due_date: validatedData.due_date ? new Date(validatedData.due_date).toISOString() : null,
      assigned_to: assignedTo,
      created_by: user.id,
    }))

    const { data: tasks, error } = await supabaseAdmin
      .from('tasks')
      .insert(tasksToInsert)
      .select('*')

    if (error) {
      console.error('Error creating tasks:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Audit Log
    try {
      const { logAuditAction } = await import('@/lib/audit-middleware')
      // Log audit for each task created
      for (const task of (tasks || [])) {
        await logAuditAction(request, {
          entity_type: 'task',
          entity_id: task.id.toString(),
          action: 'create',
          after_state: task
        })
      }
    } catch (auditError) {
      console.error('Failed to log audit action:', auditError)
    }

    // Return the first task (or all tasks if needed)
    return Response.json({
      data: tasks && tasks.length > 0 ? tasks[0] : null,
      created: tasks?.length || 0,
      tasks: tasks || []
    }, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('Internal server error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
