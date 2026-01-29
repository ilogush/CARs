import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Обновляем request cookies
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          
          // Создаем новый response с обновленными cookies
          supabaseResponse = NextResponse.next({
            request,
          })
          
          // Устанавливаем cookies в response
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Обновляем сессию пользователя (автоматически обновляет expired tokens)
  try {
    await supabase.auth.getUser()
  } catch (error) {
    // Игнорируем ошибки аутентификации в middleware
    // Пользователь будет перенаправлен на страницу логина в компонентах
  }

  return supabaseResponse
}


