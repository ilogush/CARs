import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'

/**
 * API endpoint для логирования неудачных попыток входа
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 20 failed attempts per 5 minutes per IP (more lenient for logging)
    const clientIp = getClientIp(request)
    const rateLimitResult = isRateLimited(`login-failed:${clientIp}`, 20, 300000)
    
    if (rateLimitResult.limited) {
      return NextResponse.json(
        { error: 'Too many failed login attempts. Please try again later.' },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
          }
        }
      )
    }

    const body = await request.json()
    const { email, error: errorMessage } = body

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Получаем IP и User Agent
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ip = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Пытаемся найти пользователя по email
    let userId: string | null = null
    let role: string | null = null
    
    if (email) {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('id, role')
        .eq('email', email)
        .single()
      
      if (userData) {
        userId = userData.id
        role = userData.role
      }
    }

    // Логируем неудачную попытку входа
    const { error: insertError } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: userId,
        role: role || 'unknown',
        company_id: null,
        entity_type: 'user',
        entity_id: userId || email || 'unknown',
        action: 'login_failed',
        before_state: null,
        after_state: {
          email: email || 'unknown',
          error: errorMessage || 'Authentication failed',
          login_time: new Date().toISOString()
        },
        ip,
        user_agent: userAgent
      })

    if (insertError) {
      console.error('Error inserting failed login audit log:', insertError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error logging failed login:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
