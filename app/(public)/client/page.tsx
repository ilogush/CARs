import { requireRole, getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import ClientDashboard from '@/components/client/ClientDashboard'
import { redirect } from 'next/navigation'

export default async function ClientPage() {
  const user = await requireRole('client')
  
  if (!user) {
    redirect('/auth/login')
  }

  const supabase = await createClient()

  // Инициализируем данные по умолчанию
  let contracts: any[] = []
  let payments: any[] = []
  let clientProfile: any = null

  // Получаем профиль клиента
  try {
    const { data: profileData } = await supabase
      .from('client_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    clientProfile = profileData || null
  } catch (error) {
    console.error('Error fetching client profile:', error)
    clientProfile = null
  }

  // Получаем контракты клиента
  try {
    const { data: contractsData, error: contractsError } = await supabase
      .from('contracts')
      .select(`
        id,
        status,
        start_date,
        end_date,
        total_amount,
        created_at,
        manager_id,
        company_car_id,
        company_cars(
          id,
          license_plate,
          photos,
          template_id,
          car_templates(
            car_brands(name),
            car_models(name),
            car_body_types(name)
          )
        )
      `)
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })

    if (contractsError) {
      console.error('Error fetching contracts:', contractsError)
      contracts = []
    } else {
      contracts = contractsData || []
    }
  } catch (error) {
    console.error('Error in contracts query:', error)
    contracts = []
  }

  // Получаем данные менеджеров для контрактов
  const managerIds = [...new Set(contracts.map((c: any) => c.manager_id).filter(Boolean))]
  let managersMap: Record<string, any> = {}
  
  if (managerIds.length > 0) {
    try {
      const { data: managersData } = await supabase
        .from('users')
        .select('id, name, surname, email')
        .in('id', managerIds)
      
      if (managersData) {
        managersMap = managersData.reduce((acc: any, manager: any) => {
          acc[manager.id] = manager
          return acc
        }, {})
      }
    } catch (error) {
      console.error('Error fetching managers:', error)
      managersMap = {}
    }
  }

  // Получаем ID контрактов для загрузки платежей
  const contractIds = contracts.map((c: any) => c.id)

  if (contractIds.length > 0) {
    try {
      const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        id,
        amount,
        payment_date,
        contract_id,
        payment_status_id,
        payment_statuses(name)
      `)
      .in('contract_id', contractIds)
      .order('payment_date', { ascending: false })

      if (!paymentsError && paymentsData) {
        // Создаем мапу контрактов для быстрого доступа
        const contractsMap = contracts.reduce((acc: any, contract: any) => {
          acc[contract.id] = contract
          return acc
        }, {})

        // Преобразуем структуру данных для соответствия интерфейсу
        payments = paymentsData.map((p: any) => {
          const contract = contractsMap[p.contract_id]
          return {
            id: p.id,
            amount: p.amount,
            status: p.payment_statuses?.name || 'pending',
            payment_date: p.payment_date,
            contracts: contract ? {
              id: contract.id,
              company_cars: contract.company_cars ? {
                car_templates: contract.company_cars.car_templates ? {
                  car_brands: contract.company_cars.car_templates.car_brands,
                  car_models: contract.company_cars.car_templates.car_models
                } : undefined
              } : undefined
            } : undefined
          }
        })
      }
    } catch (error) {
      console.error('Error in payments query:', error)
      payments = []
    }
  }

  // Рассчитываем статистику
  const statistics = {
    totalContracts: contracts.length,
    activeContracts: contracts.filter((c: any) => c.status === 'active').length,
    totalSpent: contracts.reduce((sum: number, c: any) => {
      const amount = typeof c.total_amount === 'number' ? c.total_amount : 0
      return sum + (isNaN(amount) ? 0 : amount)
    }, 0),
    totalPayments: payments.length
  }

  return (
    <div>
      <ClientDashboard
        user={{
          id: user.id,
          email: user.email || '',
          name: user.name || null,
          surname: user.surname || null
        }}
        clientProfile={clientProfile}
        contracts={contracts.map((c: any) => ({
          id: c.id,
          status: c.status,
          start_date: c.start_date,
          end_date: c.end_date,
          total_amount: c.total_amount,
          created_at: c.created_at,
          company_cars: c.company_cars ? {
            id: c.company_cars.id,
            license_plate: c.company_cars.license_plate || '',
            photos: c.company_cars.photos || null,
            car_templates: c.company_cars.car_templates ? {
              car_brands: c.company_cars.car_templates.car_brands || undefined,
              car_models: c.company_cars.car_templates.car_models || undefined,
              car_body_types: c.company_cars.car_templates.car_body_types || undefined
            } : undefined
          } : undefined,
          manager: c.manager_id && managersMap[c.manager_id] ? {
            id: managersMap[c.manager_id].id,
            name: managersMap[c.manager_id].name || null,
            surname: managersMap[c.manager_id].surname || null,
            email: managersMap[c.manager_id].email || ''
          } : undefined
        }))}
        payments={payments}
        statistics={statistics}
      />
    </div>
  )
}


