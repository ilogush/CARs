import { NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { checkPermissions } from '@/lib/rbac-middleware'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const email = searchParams.get('email')

        if (!email) {
            return Response.json({ error: 'Email is required' }, { status: 400 })
        }

        // Check permissions
        await checkPermissions(request, ['admin', 'owner', 'manager'])

        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Search for user by email
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', email.trim())
            .single()

        if (error || !user) {
            return Response.json({ user: null })
        }

        return Response.json({ user })
    } catch (error: any) {
        console.error('Error in /api/clients/search:', error)
        return Response.json({ error: 'Internal server error' }, { status: 500 })
    }
}
