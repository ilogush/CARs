'use client'

import { Company, Car, Manager } from '@/types/database.types'

interface CompanyDetailsProps {
  company: any
}

export default function CompanyDetails({ company }: CompanyDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Name</dt>
            <dd className="mt-1 text-sm text-gray-900">{company.name}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Location</dt>
            <dd className="mt-1 text-sm text-gray-900">{company.location?.name}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Owner</dt>
            <dd className="mt-1 text-sm text-gray-900">{company.owner?.email}</dd>
          </div>
        </dl>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cars ({company.cars?.length || 0})</h3>
        <div className="space-y-2">
          {company.cars && company.cars.length > 0 ? (
            company.cars.map((car: any) => (
              <div key={car.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {car.brand_model?.brand} {car.brand_model?.model} {car.year}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {car.color} • {car.seats} seats • {car.transmission} • {car.price_per_day} ₽/day
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${car.status === 'available' ? 'bg-green-100 text-green-800' :
                      car.status === 'rented' ? 'bg-yellow-100 text-yellow-800' :
                        car.status === 'booked' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-200 text-gray-800'
                    }`}>
                    {car.status === 'available' ? 'available' :
                      car.status === 'rented' ? 'rented' :
                        car.status === 'booked' ? 'booked' :
                          'maintenance'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm">No cars</p>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Managers ({company.managers?.length || 0})</h3>
        <div className="space-y-2">
          {company.managers && company.managers.length > 0 ? (
            company.managers.map((manager: any) => (
              <div key={manager.id} className="p-4 border border-gray-200 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">{manager.user?.email}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded ${manager.is_active ? 'bg-gray-200 text-gray-800' : 'bg-red-100 text-red-800'
                  }`}>
                  {manager.is_active ? 'active' : 'blocked'}
                </span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm">No managers</p>
          )}
        </div>
      </div>
    </div>
  )
}




