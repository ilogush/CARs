import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { checkPermissions } from '@/lib/rbac-middleware'
import { getAdminModeCompanyId } from '@/lib/admin-mode'

// GET - получить валюты компании
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const companyId = parseInt(id)

    // Проверка прав доступа
    const { scope } = await checkPermissions(
      request,
      ['admin', 'owner', 'manager'],
      companyId
    )

    const adminCompanyId = await getAdminModeCompanyId(request)
    const effectiveCompanyId = adminCompanyId || scope.company_id

    if (scope.role !== 'admin' && effectiveCompanyId !== companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Получаем валюты компании
    const { data: companyCurrencies, error: companyError } = await supabaseAdmin
      .from('company_currencies')
      .select(`
        *,
        currencies (
          id,
          code,
          name,
          symbol,
          is_active
        )
      `)
      .eq('company_id', companyId)

    if (companyError) {
      console.error('Error fetching company currencies:', companyError)
      return NextResponse.json({ error: 'Failed to fetch currencies' }, { status: 500 })
    }

    // Получаем все активные валюты
    const { data: allCurrencies, error: allError } = await supabaseAdmin
      .from('currencies')
      .select('*')
      .eq('is_active', true)
      .order('code')

    if (allError) {
      console.error('Error fetching all currencies:', allError)
      return NextResponse.json({ error: 'Failed to fetch currencies' }, { status: 500 })
    }

    // Формируем ответ с информацией о том, какие валюты выбраны
    const selectedCurrencyIds = new Set(
      companyCurrencies?.map((cc: any) => cc.currency_id) || []
    )
    const defaultCurrencyId = companyCurrencies?.find((cc: any) => cc.is_default)?.currency_id

    const currencies = allCurrencies?.map((currency) => ({
      ...currency,
      is_selected: selectedCurrencyIds.has(currency.id),
      is_default: currency.id === defaultCurrencyId
    })) || []

    return NextResponse.json({
      currencies,
      selected: companyCurrencies || []
    })
  } catch (error: any) {
    console.error('Error in GET /api/companies/[id]/currencies:', error)
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 401 : 403 })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST - Toggle currency status (enable/disable) for company
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const companyId = parseInt(id)
    const body = await request.json()
    const { currency_id, enabled } = body

    if (!currency_id) {
      return NextResponse.json({ error: 'currency_id is required' }, { status: 400 })
    }

    // Check permissions (admin or owner)
    const { scope } = await checkPermissions(
      request,
      ['admin', 'owner'],
      companyId
    )

    const adminCompanyId = await getAdminModeCompanyId(request)
    const effectiveCompanyId = adminCompanyId || scope.company_id

    if (scope.role !== 'admin' && effectiveCompanyId !== companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (enabled) {
      // Enable: Insert check permissions
      const { error: insertError } = await supabaseAdmin
        .from('company_currencies')
        .upsert({
          company_id: companyId,
          currency_id: currency_id,
          is_default: false
        }, { onConflict: 'company_id, currency_id' })

      if (insertError) {
        console.error('Error enabling currency:', insertError)
        return NextResponse.json({ error: 'Failed to enable currency' }, { status: 500 })
      }
    } else {
      // Disable: Delete
      const { error: deleteError } = await supabaseAdmin
        .from('company_currencies')
        .delete()
        .eq('company_id', companyId)
        .eq('currency_id', currency_id)

      if (deleteError) {
        console.error('Error disabling currency:', deleteError)
        return NextResponse.json({ error: 'Failed to disable currency' }, { status: 500 })
      }
    }

    // Helpers for audit
    // ...

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in POST /api/companies/[id]/currencies:', error)
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 401 : 403 })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
