'use client'
import { format } from 'date-fns'

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  inspection_created: { label: 'Inspection created',       color: '#5f5e5a' },
  field_changed:      { label: 'Field updated',            color: '#ba7517' },
  photo_added:        { label: 'Photo added',              color: '#185fa5' },
  tenant_signed:      { label: 'Tenant signed',            color: '#1d9e75' },
  landlord_signed:    { label: 'PM signed',                color: '#1d9e75' },
  report_locked:      { label: 'Report locked & PDF sent', color: '#1d9e75' },
  deposit_saved:      { label: 'Deposit statement saved',  color: '#ba7517' },
  link_sent:          { label: 'Signing link sent',        color: '#185fa5' },
}

export default function AuditLogView({ logs }: { logs: any[] }) {
  if (!logs.length) {
    return <p className="text-sm text-gray-400 text-center py-12">No audit events yet</p>
  }

  return (
    <div className="max-w-2xl">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-navy">Audit Trail</h2>
          <span className="text-xs text-gray-400">{logs.length} events</span>
        </div>

        <div className="space-y-0">
          {logs.map((log, i) => {
            const action = ACTION_LABELS[log.action] ?? { label: log.action, color: '#888780' }
            return (
              <div key={log.id} className={`flex gap-4 py-3 ${i < logs.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className="flex-shrink-0 flex flex-col items-center">
                  <div
                    className="w-2 h-2 rounded-full mt-1.5"
                    style={{ background: action.color }}
                  />
                  {i < logs.length - 1 && <div className="w-px flex-1 bg-gray-100 mt-1" />}
                </div>
                <div className="flex-1 pb-1">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm text-gray-700">{action.label}</p>
                    <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                      {format(new Date(log.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  {log.details && Object.keys(log.details).length > 0 && log.action === 'field_changed' && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {log.details.field} → {String(log.details.value)}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {log.user?.full_name ?? 'System'}
                    {log.user?.role && (
                      <span className="ml-1 capitalize">({log.user.role.replace('_', ' ')})</span>
                    )}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
