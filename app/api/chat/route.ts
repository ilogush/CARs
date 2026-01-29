import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { checkPermissions } from '@/lib/rbac-middleware'
import { getAdminModeCompanyId } from '@/lib/admin-mode'
import { z } from 'zod'

/**
 * GET /api/chat
 * Returns chat messages for a company
 * Query params: company_id (required for admin, optional for owner)
 */
export async function GET(request: NextRequest) {
  try {
    const { user, scope } = await checkPermissions(
      request,
      ['admin', 'owner']
    )

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Determine company_id
    let targetCompanyId: number | null = null
    
    const adminCompanyId = await getAdminModeCompanyId(request)
    if (adminCompanyId) {
      targetCompanyId = adminCompanyId
    } else if (scope.role === 'owner' && scope.company_id) {
      targetCompanyId = scope.company_id
    } else if (scope.role === 'admin') {
      // Admin needs company_id in query params
      const companyIdParam = request.nextUrl.searchParams.get('company_id')
      if (companyIdParam) {
        targetCompanyId = parseInt(companyIdParam)
      }
    }

    if (!targetCompanyId) {
      return Response.json({ error: 'Company ID is required' }, { status: 400 })
    }

    // Get chat messages for the company
    const { data: messages, error } = await supabaseAdmin
      .from('company_chat_messages')
      .select(`
        *,
        created_by_user:users!company_chat_messages_created_by_fkey(id, name, surname, email, avatar_url)
      `)
      .eq('company_id', targetCompanyId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching chat messages:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ data: messages || [] })

  } catch (error: any) {
    console.error('Error in GET /api/chat:', error)
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return Response.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 401 : 403 })
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/chat
 * Creates a new chat message
 * Body: { message: string, company_id?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, scope } = await checkPermissions(
      request,
      ['admin', 'owner']
    )

    const body = await request.json()
    
    const messageSchema = z.object({
      message: z.string().min(1, 'Message is required'),
      company_id: z.number().optional(),
    })

    const validatedData = messageSchema.parse(body)

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Determine company_id
    let targetCompanyId: number | null = null
    
    const adminCompanyId = await getAdminModeCompanyId(request)
    if (adminCompanyId) {
      targetCompanyId = adminCompanyId
    } else if (validatedData.company_id) {
      targetCompanyId = validatedData.company_id
    } else if (scope.role === 'owner' && scope.company_id) {
      targetCompanyId = scope.company_id
    } else if (scope.role === 'admin') {
      return Response.json({ error: 'Company ID is required for admin' }, { status: 400 })
    }

    if (!targetCompanyId) {
      return Response.json({ error: 'Company ID is required' }, { status: 400 })
    }

    // Verify that user has access to this company
    if (scope.role === 'owner' && scope.company_id !== targetCompanyId) {
      return Response.json({ error: 'Access denied' }, { status: 403 })
    }

    // Create message
    const { data: message, error } = await supabaseAdmin
      .from('company_chat_messages')
      .insert({
        company_id: targetCompanyId,
        message: validatedData.message,
        created_by: user.id,
      })
      .select(`
        *,
        created_by_user:users!company_chat_messages_created_by_fkey(id, name, surname, email, avatar_url)
      `)
      .single()

    if (error) {
      console.error('Error creating chat message:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ data: message }, { status: 201 })

  } catch (error: any) {
    console.error('Error in POST /api/chat:', error)
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues[0].message }, { status: 400 })
    }
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return Response.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 401 : 403 })
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
