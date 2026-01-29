'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useToast } from '@/lib/toast'
import PageHeader from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

import Loader from '@/components/ui/Loader'

// Схема валидации для платежа
const paymentSchema = z.object({
  payment_type_id: z.string().min(1, 'Выберите тип платежа'),
  amount: z.string().min(1, 'Укажите сумму').refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Сумма должна быть больше 0'),
  payment_method: z.string().min(1, 'Укажите способ оплаты'),
  notes: z.string().optional()
})

// Схема валидации для формы закрытия контракта
const closeContractSchema = z.object({
  payments: z.array(paymentSchema).min(1, 'Добавьте хотя бы один платеж')
})

type CloseContractFormData = z.infer<typeof closeContractSchema>

export default function CloseContractPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const toast = useToast()
  const { id } = use(params)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [contract, setContract] = useState<any>(null)
  const [paymentTypes, setPaymentTypes] = useState<any[]>([])
  const [paymentStatuses, setPaymentStatuses] = useState<any[]>([])

  const {
    register,
    handleSubmit,
    control,
    formState: { errors }
  } = useForm<CloseContractFormData>({
    resolver: zodResolver(closeContractSchema),
    defaultValues: {
      payments: [
        {
          payment_type_id: '',
          amount: '',
          payment_method: 'cash',
          notes: ''
        }
      ]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'payments'
  })

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    try {
      setInitialLoading(true)
      // Загрузка контракта
      const contractRes = await fetch(`/api/contracts/${id}`)
      const contractData = await contractRes.json()
      if (contractData.data && contractData.data.length > 0) {
        setContract(contractData.data[0])
      }

      // Загрузка типов платежей
      const typesRes = await fetch('/api/payment-types?page=1&pageSize=1000&showInactive=false')
      const typesData = await typesRes.json()
      if (typesData.data) {
        setPaymentTypes(typesData.data)
      }

      // Загрузка статусов платежей
      const statusesRes = await fetch('/api/payment-statuses?page=1&pageSize=1000&showInactive=false')
      const statusesData = await statusesRes.json()
      if (statusesData.data) {
        setPaymentStatuses(statusesData.data)
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
    } finally {
      setInitialLoading(false)
    }
  }

  async function onSubmit(data: CloseContractFormData) {
    setLoading(true)
    try {
      // Создаем платежи
      const paymentPromises = data.payments.map(payment =>
        fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contract_id: parseInt(id),
            payment_type_id: parseInt(payment.payment_type_id),
            payment_status_id: paymentStatuses.find(s => s.value === 1)?.id || paymentStatuses[0]?.id,
            amount: parseFloat(payment.amount),
            payment_method: payment.payment_method,
            notes: payment.notes || null
          })
        })
      )

      await Promise.all(paymentPromises)

      // Закрываем контракт
      const closeRes = await fetch(`/api/contracts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed'
        })
      })

      if (!closeRes.ok) {
        throw new Error('Ошибка закрытия контракта')
      }

      // Обновляем статус авто на available
      if (contract?.company_car_id) {
        await fetch(`/api/company-cars/${contract.company_car_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'available'
          })
        })
      }

      toast.success('Контракт успешно закрыт')
      router.push('/dashboard/contracts')
    } catch (error: any) {
      toast.error(error.message || 'Ошибка закрытия контракта')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader />
      </div>
    )
  }

  // Получаем популярные типы платежей для быстрого выбора
  const popularPaymentTypes = [
    { name: 'Deposit Returned', label: 'Возврат депозита' },
    { name: 'Cleaning Fee', label: 'Мойка авто' },
    { name: 'Damage Compensation', label: 'Повреждения' },
    { name: 'Extended Rental', label: 'Продление аренды' },
    { name: 'Late Fee', label: 'Штраф за опоздание' },
    { name: 'Fuel Reimbursement', label: 'Возмещение топлива' }
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Закрытие контракта"
        rightActions={
          <Link href={`/dashboard/contracts/${id}`}>
            <Button variant="secondary" icon={<ArrowLeftIcon className="w-4 h-4" />}>
              Назад
            </Button>
          </Link>
        }
      />

      {contract && (
        <Card>
          <div className="grid grid-cols-4 gap-4 mb-6 pb-6 border-b border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Контракт ID</label>
              <input
                type="text"
                value={contract.id}
                disabled
                className="block w-full rounded-md border border-gray-200 text-sm py-2 px-3 bg-gray-50 text-gray-600 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Клиент</label>
              <input
                type="text"
                value={contract.client?.name || contract.users?.name || ''}
                disabled
                className="block w-full rounded-md border border-gray-200 text-sm py-2 px-3 bg-gray-50 text-gray-600 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Сумма контракта</label>
              <input
                type="text"
                value={`${contract.total_amount} ฿`}
                disabled
                className="block w-full rounded-md border border-gray-200 text-sm py-2 px-3 bg-gray-50 text-gray-600 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Статус</label>
              <input
                type="text"
                value={contract.status === 'active' ? 'Активен' : contract.status}
                disabled
                className="block w-full rounded-md border border-gray-200 text-sm py-2 px-3 bg-gray-50 text-gray-600 cursor-not-allowed"
              />
            </div>
          </div>
        </Card>
      )}

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Платежи при закрытии контракта</h3>
            <Button
              type="button"
              variant="secondary"
              icon={<PlusIcon className="w-4 h-4" />}
              onClick={() => append({
                payment_type_id: '',
                amount: '',
                payment_method: 'cash',
                notes: ''
              })}
            >
              Добавить платеж
            </Button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-4 gap-4 p-4 border border-gray-200 rounded-md">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Тип платежа *
                </label>
                <select
                  {...register(`payments.${index}.payment_type_id`)}
                  className="block w-full rounded-md border border-gray-200 text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-300 transition-colors"
                >
                  <option value="">Выберите тип</option>
                  {paymentTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} ({type.sign === '+' ? '+' : '-'})
                    </option>
                  ))}
                </select>
                {errors.payments?.[index]?.payment_type_id && (
                  <p className="mt-1 text-xs text-red-600">{errors.payments[index]?.payment_type_id?.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Сумма *
                </label>
                <input
                  type="text"
                  {...register(`payments.${index}.amount`)}
                  placeholder="0.00"
                  className="block w-full rounded-md border border-gray-200 text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-300 transition-colors"
                />
                {errors.payments?.[index]?.amount && (
                  <p className="mt-1 text-xs text-red-600">{errors.payments[index]?.amount?.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Способ оплаты *
                </label>
                <select
                  {...register(`payments.${index}.payment_method`)}
                  className="block w-full rounded-md border border-gray-200 text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-300 transition-colors"
                >
                  <option value="cash">Наличные</option>
                  <option value="card">Карта</option>
                  <option value="bank_transfer">Банковский перевод</option>
                  <option value="online">Онлайн</option>
                </select>
                {errors.payments?.[index]?.payment_method && (
                  <p className="mt-1 text-xs text-red-600">{errors.payments[index]?.payment_method?.message}</p>
                )}
              </div>

              <div className="flex items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Примечания
                  </label>
                  <input
                    type="text"
                    {...register(`payments.${index}.notes`)}
                    placeholder="Опционально"
                    className="block w-full rounded-md border border-gray-200 text-sm py-2 px-3 bg-white text-gray-900 focus:ring-0 focus:border-gray-300 transition-colors"
                  />
                </div>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="ml-2 p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {errors.payments && typeof errors.payments === 'object' && 'root' in errors.payments && (
            <p className="text-sm text-red-600">{errors.payments.root?.message}</p>
          )}

          {/* Быстрый выбор популярных платежей */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-500 mb-2">Быстрый выбор:</p>
            <div className="flex flex-wrap gap-2">
              {popularPaymentTypes.map((popular) => {
                const paymentType = paymentTypes.find(pt => pt.name === popular.name)
                if (!paymentType) return null
                return (
                  <button
                    key={popular.name}
                    type="button"
                    onClick={() => {
                      append({
                        payment_type_id: paymentType.id.toString(),
                        amount: '',
                        payment_method: 'cash',
                        notes: ''
                      })
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    {popular.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Link href={`/dashboard/contracts/${id}`}>
              <Button type="button" variant="secondary">
                Отмена
              </Button>
            </Link>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Закрытие...' : 'Закрыть контракт'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
