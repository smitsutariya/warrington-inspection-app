import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ClipboardList, Home, Clock, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = createClient()

  const [
    { data: inspections },
    { data: properties },
    { count: pendingCount },
    { count: completedCount },
  ] = await Promise.all([
    supabase
      .from('inspections')
      .select('*, unit:units(unit_number, property:properties(name))')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('properties').select('id').limit(100),
    supabase.from('inspections').select('*', { count: 'exact', head: true })
      .in('status', ['pending_tenant', 'pending_pm']),
    supabase.from('inspections').select('*', { count: 'exact', head: true })
      .eq('status', 'complete'),
  ])

  const activeInspections = inspections?.filter(i =>
    ['draft', 'in_progress', 'pending_tenant', 'pending_pm'].includes(i.status)
  ) ?? []

  const statusConfig: Record<string, { label: string; cls: string }> = {
    draft:          { label: 'Draft',           cls: 'badge-gray' },
    in_progress:    { label: 'In Progress',     cls: 'badge-info' },
    pending_tenant: { label: 'Pending Tenant',  cls: 'badge-warn' },
    pending_pm:     { label: 'Pending PM',      cls: 'badge-warn' },
    complete:       { label: 'Complete',        cls: 'badge-success' },
  }

  const typeConfig: Record<string, { label: string; cls: string }> = {
    move_in:  { label: 'Move-In',  cls: 'badge-info' },
    move_out: { label: 'Move-Out', cls: 'badge-warn' },
  }

  return (
    <div className="p-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-navy">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {new Date().toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Link href="/inspections/new" className="btn-primary flex items-center gap-2">
          <span>+</span> New Inspection
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Active Inspections', value: activeInspections.length, icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Pending Signatures', value: pendingCount ?? 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Completed', value: completedCount ?? 0, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Properties', value: properties?.length ?? 0, icon: Home, color: 'text-navy', bg: 'bg-navy/5' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">{label}</p>
                <p className="font-serif text-3xl text-navy">{value}</p>
              </div>
              <div className={`${bg} ${color} p-2 rounded-lg`}>
                <Icon size={18} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {(pendingCount ?? 0) > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-sm text-amber-800">
          <AlertTriangle size={15} className="flex-shrink-0" />
          <span>{pendingCount} inspection{pendingCount !== 1 ? 's' : ''} awaiting signatures — review and complete them to stay compliant with BC Tenancy Regulations.</span>
          <Link href="/inspections?status=pending" className="ml-auto text-amber-700 underline whitespace-nowrap text-xs">View all</Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Recent Inspections */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-navy">Recent Inspections</h2>
            <Link href="/inspections" className="text-xs text-gray-400 hover:text-navy flex items-center gap-1">
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <div className="space-y-0">
            {inspections?.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No inspections yet</p>
            )}
            {inspections?.map((insp, i) => (
              <Link
                key={insp.id}
                href={`/inspections/${insp.id}`}
                className={`flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors ${i < inspections.length - 1 ? 'border-b border-gray-50' : ''}`}
              >
                <div>
                  <p className="text-sm font-medium text-navy">
                    Unit {insp.unit?.unit_number} — {insp.unit?.property?.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{insp.tenant_name || 'No tenant assigned'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={typeConfig[insp.type]?.cls ?? 'badge-gray'}>
                    {typeConfig[insp.type]?.label}
                  </span>
                  <span className={statusConfig[insp.status]?.cls ?? 'badge-gray'}>
                    {statusConfig[insp.status]?.label}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-sm font-medium text-navy mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <Link href="/inspections/new" className="flex items-center justify-between p-3 rounded-lg border border-dashed border-gray-200 hover:border-navy hover:bg-navy/5 transition-all group">
                <div>
                  <p className="text-sm font-medium text-navy">Start Move-In Inspection</p>
                  <p className="text-xs text-gray-400">Create a new move-in report</p>
                </div>
                <ArrowRight size={14} className="text-gray-300 group-hover:text-navy transition-colors" />
              </Link>
              <Link href="/inspections/new?type=move_out" className="flex items-center justify-between p-3 rounded-lg border border-dashed border-gray-200 hover:border-navy hover:bg-navy/5 transition-all group">
                <div>
                  <p className="text-sm font-medium text-navy">Start Move-Out Inspection</p>
                  <p className="text-xs text-gray-400">Load prior move-in &amp; inspect</p>
                </div>
                <ArrowRight size={14} className="text-gray-300 group-hover:text-navy transition-colors" />
              </Link>
              <Link href="/documents" className="flex items-center justify-between p-3 rounded-lg border border-dashed border-gray-200 hover:border-navy hover:bg-navy/5 transition-all group">
                <div>
                  <p className="text-sm font-medium text-navy">View All Documents</p>
                  <p className="text-xs text-gray-400">Download generated PDFs</p>
                </div>
                <ArrowRight size={14} className="text-gray-300 group-hover:text-navy transition-colors" />
              </Link>
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-medium text-navy mb-3">BC Tenancy Compliance</h2>
            <div className="space-y-2 text-xs text-gray-500">
              <p className="flex items-start gap-2">
                <CheckCircle size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
                Move-in report delivered to tenant within 7 days
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
                Move-out report delivered within 15 days of forwarding address
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
                Both landlord and tenant signatures required
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
