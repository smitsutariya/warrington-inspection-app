'use client'
import Link from 'next/link'
import { format } from 'date-fns'
import { ExternalLink } from 'lucide-react'

const STATUS: Record<string, { label: string; cls: string }> = {
  draft:          { label: 'Draft',           cls: 'badge-gray' },
  in_progress:    { label: 'In Progress',     cls: 'badge-info' },
  pending_tenant: { label: 'Pending Tenant',  cls: 'badge-warn' },
  pending_pm:     { label: 'Pending PM',      cls: 'badge-warn' },
  complete:       { label: 'Complete',        cls: 'badge-success' },
}

const TYPE: Record<string, { label: string; cls: string }> = {
  move_in:  { label: 'Move-In',  cls: 'badge-info' },
  move_out: { label: 'Move-Out', cls: 'badge-warn' },
}

export default function InspectionsTable({ inspections }: { inspections: any[] }) {
  if (!inspections.length) {
    return (
      <div className="card text-center py-16">
        <p className="text-gray-400 text-sm">No inspections found</p>
        <Link href="/inspections/new" className="btn-primary inline-flex mt-4 text-sm">
          Create first inspection
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/60">
            <th className="text-left px-5 py-3 text-xs text-gray-400 font-medium uppercase tracking-wide">Unit / Property</th>
            <th className="text-left px-5 py-3 text-xs text-gray-400 font-medium uppercase tracking-wide">Type</th>
            <th className="text-left px-5 py-3 text-xs text-gray-400 font-medium uppercase tracking-wide">Tenant</th>
            <th className="text-left px-5 py-3 text-xs text-gray-400 font-medium uppercase tracking-wide">Status</th>
            <th className="text-left px-5 py-3 text-xs text-gray-400 font-medium uppercase tracking-wide">Date</th>
            <th className="text-right px-5 py-3 text-xs text-gray-400 font-medium uppercase tracking-wide">Action</th>
          </tr>
        </thead>
        <tbody>
          {inspections.map((insp, i) => (
            <tr
              key={insp.id}
              className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${i === inspections.length - 1 ? 'border-none' : ''}`}
            >
              <td className="px-5 py-3.5">
                <p className="font-medium text-navy">Unit {insp.unit?.unit_number}</p>
                <p className="text-xs text-gray-400 mt-0.5">{insp.unit?.property?.name ?? insp.property?.name}</p>
              </td>
              <td className="px-5 py-3.5">
                <span className={TYPE[insp.type]?.cls ?? 'badge-gray'}>
                  {TYPE[insp.type]?.label ?? insp.type}
                </span>
              </td>
              <td className="px-5 py-3.5 text-gray-600">{insp.tenant_name || '—'}</td>
              <td className="px-5 py-3.5">
                <span className={STATUS[insp.status]?.cls ?? 'badge-gray'}>
                  {STATUS[insp.status]?.label ?? insp.status}
                </span>
              </td>
              <td className="px-5 py-3.5 text-gray-500 text-xs">
                {insp.inspection_date
                  ? format(new Date(insp.inspection_date), 'MMM d, yyyy')
                  : format(new Date(insp.created_at), 'MMM d, yyyy')}
              </td>
              <td className="px-5 py-3.5 text-right">
                <Link
                  href={`/inspections/${insp.id}`}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:border-navy hover:text-navy transition-colors text-gray-500"
                >
                  Open <ExternalLink size={11} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
