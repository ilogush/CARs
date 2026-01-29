import {
  UserGroupIcon,
  TruckIcon,
  BuildingOfficeIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline'

export default function StatsCards({ stats }: { stats: any }) {
  const cards = [
    {
      name: 'Users',
      value: stats?.users || 0,
      icon: UserGroupIcon,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      name: 'Cars',
      value: stats?.cars || 0,
      icon: TruckIcon,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      name: 'Companies',
      value: stats?.companies || 0,
      icon: BuildingOfficeIcon,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      name: 'Active tasks',
      value: stats?.pendingTasks || 0,
      icon: ClipboardDocumentCheckIcon,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div key={card.name} className="flex items-center justify-between group">
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-400">{card.name}</p>
              <p className="text-3xl font-semibold text-gray-900">{card.value}</p>
            </div>
            <div className={`p-3 rounded-xl bg-gray-50 text-gray-400 group-hover:bg-gray-800 group-hover:text-white transition-all duration-300`}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
        )
      })}
    </div>
  )
}



