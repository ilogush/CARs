import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { logUserLogin } from '@/lib/audit-middleware'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

/**
 * API endpoint для логирования входа в систему
 * Вызывается после успешной аутентификации на клиенте
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 10 requests per minute per IP
    const clientIp = getClientIp(request)
    const rateLimitResult = isRateLimited(clientIp, 10, 60000)
    
    if (rateLimitResult.limited) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
          }
        }
      )
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Логируем успешный вход
    await logUserLogin(request, user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error logging login', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
