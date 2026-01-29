'use client'

interface CompanyViewProps {
  company: any
}

export default function CompanyView({ company }: CompanyViewProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg leading-6 font-medium text-gray-900 mb-4">{company.name}</h2>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Location</dt>
            <dd className="mt-1 text-sm text-gray-900">{company.location?.name}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Владелец</dt>
            <dd className="mt-1 text-sm text-gray-900">{company.owner?.email}</dd>
          </div>
        </dl>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Автомобили ({company.cars?.length || 0})
        </h3>
        <div className="space-y-4">
          {company.cars && company.cars.length > 0 ? (
            company.cars.map((car: any) => (
              <div key={car.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {car.brand_model?.brand} {car.brand_model?.model} {car.year}
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {car.color} • {car.seats} мест • {car.transmission === 'automatic' ? 'Автоматическая' : 'Механическая'} • {car.price_per_day} ₽/день
                    </p>
                    {car.description && (
                      <p className="text-sm text-gray-600 mt-2">{car.description}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    car.status === 'available' ? 'bg-green-100 text-green-800' :
                    car.status === 'rented' ? 'bg-yellow-100 text-yellow-800' :
                    car.status === 'booked' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-200 text-gray-800'
                  }`}>
                    {car.status === 'available' ? 'Свободен' :
                     car.status === 'rented' ? 'В аренде' :
                     car.status === 'booked' ? 'Бронирование' :
                     'На ремонте'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm">Нет автомобилей</p>
          )}
        </div>
      </div>
    </div>
  )
}




