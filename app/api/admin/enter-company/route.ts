import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getUserScope } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    const { companyId } = await request.json()

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    // Используем service role для обхода RLS
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Проверяем существование компании
    const { data: company, error } = await supabaseAdmin
      .from('companies')
      .select('id, name, location_id, locations(name)')
      .eq('id', companyId)
      .single()

    if (error) {
      console.error('Error fetching company:', error)
      return NextResponse.json(
        { error: `Company not found: ${error.message}` },
        { status: 404 }
      )
    }

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    // Логируем вход админа в компанию
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      role: 'admin',
      company_id: companyId,
      entity_type: 'company',
      entity_id: companyId.toString(),
      action: 'login',
      after_state: { admin_entered_company: true, company_name: company.name },
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      user_agent: request.headers.get('user-agent')
    })

    return NextResponse.json({
      success: true,
      company,
      adminMode: true,
      redirectUrl: `/dashboard/companies/${companyId}?admin_mode=true`
    })

  } catch (error) {
    console.error('Error entering company:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('company_id')

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    // Используем service role для обхода RLS
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Логируем выход админа из компании
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      role: 'admin',
      company_id: parseInt(companyId),
      entity_type: 'company',
      entity_id: companyId,
      action: 'logout',
      after_state: { admin_exited_company: true },
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      user_agent: request.headers.get('user-agent')
    })

    return NextResponse.json({
      success: true,
      redirectUrl: '/dashboard/companies'
    })

  } catch (error) {
    console.error('Error exiting company:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
