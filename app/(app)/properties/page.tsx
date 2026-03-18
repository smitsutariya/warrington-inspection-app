import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { MapPin, Users, ClipboardList } from 'lucide-react'

export default async function PropertiesPage() {
  const supabase = createClient()

  const { data: properties } = await supabase
    .from('properties')
    .select(`
      *,
      units(id, unit_number),
      inspections(id, status)
    `)
    .order('name')

  return (
    <div className="p-7">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl text-navy">Properties</h1>
        <span className="badge-gray">{properties?.length ?? 0} properties</span>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {properties?.map((property, i) => {
          const activeInspections = property.inspections?.filter(
            (insp: { status: string }) => !['complete'].includes(insp.status)
          ).length ?? 0
          const unitCount = property.units?.length ?? 0

          const bgColors = [
            'from-navy to-navy-light',
            'from-teal to-teal/80',
            'from-[#6b4c1e] to-[#c8a96e]',
          ]

          return (
            <div key={property.id} className="card hover:shadow-sm transition-shadow">
              <div className={`h-24 rounded-lg bg-gradient-to-br ${bgColors[i % 3]} mb-4 flex items-center justify-center`}>
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
                  <p className="font-serif text-xl text-navy">{activeInspections}</p>
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
