import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { MapPin, ClipboardList } from 'lucide-react'

export default async function PropertiesPage() {
  const supabase = createClient()

  // Fetch properties and units separately to avoid join failures
  const { data: properties, error } = await supabase
    .from('properties')
    .select('*')
    .order('name')

  const { data: units } = await supabase
    .from('units')
    .select('id, property_id')

  const { data: inspections } = await supabase
    .from('inspections')
    .select('id, property_id, status')

  const unitCountMap: Record<string, number> = {}
  const activeInspMap: Record<string, number> = {}

  units?.forEach(u => {
    unitCountMap[u.property_id] = (unitCountMap[u.property_id] ?? 0) + 1
  })

  inspections?.forEach(i => {
    if (i.status !== 'complete') {
      activeInspMap[i.property_id] = (activeInspMap[i.property_id] ?? 0) + 1
    }
  })

  const bgColors = [
    'bg-navy',
    'bg-teal',
    'bg-[#6b4c1e]',
    'bg-[#2d3f6b]',
    'bg-[#1d6b5e]',
  ]

  return (
    <div className="p-7">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-navy">Properties</h1>
          <p className="text-sm text-gray-400 mt-0.5">{properties?.length ?? 0} properties</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
          Error loading properties: {error.message}
        </div>
      )}

      {!properties?.length && !error && (
        <div className="card text-center py-16">
          <p className="text-gray-400 text-sm">No properties found</p>
          <p className="text-gray-300 text-xs mt-2">Add properties in your Supabase database</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">
        {properties?.map((property, i) => {
          const unitCount = unitCountMap[property.id] ?? 0
          const activeCount = activeInspMap[property.id] ?? 0

          return (
            <div key={property.id} className="card hover:shadow-sm transition-shadow">
              <div className={`h-24 rounded-lg ${bgColors[i % bgColors.length]} mb-4 flex items-center justify-center`}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M16 3L3 14h3v15h7v-7h6v7h7V14h3L16 3z" fill="white" opacity="0.4"/>
                </svg>
              </div>

              <h2 className="font-medium text-navy text-base mb-1">{property.name}</h2>
              <p className="text-xs text-gray-400 flex items-center gap-1 mb-4">
                <MapPin size={11} />
                {property.address}, {property.city}, {property.province}
              </p>

              <div className="flex gap-4 pt-3 border-t border-gray-50">
                <div>
                  <p className="font-serif text-xl text-navy">{unitCount}</p>
                  <p className="text-xs text-gray-400">Units</p>
                </div>
                <div>
                  <p className="font-serif text-xl text-navy">{activeCount}</p>
                  <p className="text-xs text-gray-400">Active</p>
                </div>
              </div>

              <Link
                href={`/inspections?property=${property.id}`}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2 text-xs border border-gray-100 rounded-lg hover:border-navy hover:text-navy transition-colors text-gray-400"
              >
                <ClipboardList size={12} />
                View inspections
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
