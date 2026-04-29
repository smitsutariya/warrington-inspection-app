import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Search, Plus } from 'lucide-react'
import InspectionsTable from './InspectionsTable'

export default async function InspectionsPage({
  searchParams,
}: {
  searchParams: { status?: string; type?: string; property?: string }
}) {
  const supabase = createClient()

  let query = supabase
    .from('inspections')
    .select(`
      *,
      unit:units(unit_number, property:properties(name, id)),
      property:properties(name)
    `)
    .order('created_at', { ascending: false })

  if (searchParams.status) query = query.eq('status', searchParams.status)
  if (searchParams.type) query = query.eq('type', searchParams.type)
  if (searchParams.property) query = query.eq('property_id', searchParams.property)

  const { data: inspections } = await query
  const { data: properties } = await supabase.from('properties').select('id, name').order('name')

  return (
    <div className="p-7">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-navy">Inspections</h1>
          <p className="text-sm text-gray-400 mt-0.5">{inspections?.length ?? 0} total</p>
        </div>
        <Link href="/inspections/new" className="btn-primary flex items-center gap-2">
          <Plus size={15} /> New Inspection
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        {(['', 'move_in', 'move_out'] as const).map(t => (
          <Link
            key={t}
            href={t ? `/inspections?type=${t}` : '/inspections'}
            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
              searchParams.type === t || (!searchParams.type && !t)
                ? 'bg-navy text-white border-navy'
                : 'bg-white text-gray-500 border-gray-200 hover:border-navy'
            }`}
          >
            {t === '' ? 'All Types' : t === 'move_in' ? 'Move-In' : 'Move-Out'}
          </Link>
        ))}
        <span className="w-px bg-gray-200 mx-1" />
        {(['', 'draft', 'in_progress', 'pending_tenant', 'pending_pm', 'complete'] as const).map(s => (
          <Link
            key={s}
            href={s ? `/inspections?status=${s}` : '/inspections'}
            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
              searchParams.status === s || (!searchParams.status && !s)
                ? 'bg-navy text-white border-navy'
                : 'bg-white text-gray-500 border-gray-200 hover:border-navy'
            }`}
          >
            {s === '' ? 'All Statuses' :
             s === 'draft' ? 'Draft' :
             s === 'in_progress' ? 'In Progress' :
             s === 'pending_tenant' ? 'Pending Tenant' :
             s === 'pending_pm' ? 'Pending PM' : 'Complete'}
          </Link>
        ))}
      </div>

      <InspectionsTable inspections={inspections ?? []} />
    </div>
  )
}
