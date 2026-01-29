import DataTable from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'

export default function LocationsHealth({ locations }: { locations: any[] }) {
  if (!locations || locations.length === 0) return null

  const columns = [
    { key: 'name', label: 'Location' },
    { key: 'companiesCount', label: 'Companies' },
    { key: 'carsCount', label: 'Cars' },
    {
      key: 'status',
      label: 'Status',
      render: (loc: any) => (
        loc.companiesCount > 0 ? (
          <StatusBadge variant="success">Active</StatusBadge>
        ) : (
          <StatusBadge variant="error">No data</StatusBadge>
        )
      )
    }
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-1 py-4">
        <h2 className="text-lg font-bold text-gray-900">Locations Health</h2>
      </div>
      <DataTable
        columns={columns}
        data={locations}
        disablePagination
        initialPageSize={locations.length}
      />
    </div>
  )
}



