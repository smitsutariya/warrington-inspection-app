import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { FileText, Download } from 'lucide-react'

export default async function DocumentsPage() {
  const supabase = createClient()

  const { data: inspections } = await supabase
    .from('inspections')
    .select('*, unit:units(unit_number, property:properties(name))')
    .eq('status', 'complete')
    .order('pdf_generated_at', { ascending: false })

  const TYPE: Record<string, string> = { move_in: 'Move-In', move_out: 'Move-Out' }

  return (
    <div className="p-7">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-navy">Documents</h1>
          <p className="text-sm text-gray-400 mt-0.5">All finalized inspection reports</p>
        </div>
      </div>

      {!inspections?.length && (
        <div className="card text-center py-16">
          <FileText size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No completed reports yet</p>
          <p className="text-gray-300 text-xs mt-1">Completed inspections will appear here as PDFs</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {inspections && inspections.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-5 py-3 text-xs text-gray-400 font-medium uppercase tracking-wide">File Name</th>
                <th className="text-left px-5 py-3 text-xs text-gray-400 font-medium uppercase tracking-wide">Unit</th>
                <th className="text-left px-5 py-3 text-xs text-gray-400 font-medium uppercase tracking-wide">Type</th>
                <th className="text-left px-5 py-3 text-xs text-gray-400 font-medium uppercase tracking-wide">Tenant</th>
                <th className="text-left px-5 py-3 text-xs text-gray-400 font-medium uppercase tracking-wide">Completed</th>
                <th className="text-right px-5 py-3 text-xs text-gray-400 font-medium uppercase tracking-wide">Download</th>
              </tr>
            </thead>
            <tbody>
              {inspections.map((insp, i) => {
                const fileName = `Unit ${insp.unit?.unit_number} - ${insp.unit?.property?.name} - Condition Inspection Report (${TYPE[insp.type] ?? insp.type})`
                return (
                  <tr key={insp.id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${i === inspections.length - 1 ? 'border-none' : ''}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-gray-300 flex-shrink-0" />
                        <span className="text-navy text-xs font-medium truncate max-w-xs">{fileName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 text-xs">
                      Unit {insp.unit?.unit_number}<br />
                      <span className="text-gray-400">{insp.unit?.property?.name}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={insp.type === 'move_in' ? 'badge-info' : 'badge-warn'}>
                        {TYPE[insp.type]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 text-xs">{insp.tenant_name}</td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">
                      {insp.pdf_generated_at
                        ? format(new Date(insp.pdf_generated_at), 'MMM d, yyyy')
                        : format(new Date(insp.updated_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {insp.pdf_url ? (
                        <a
                          href={insp.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:border-navy hover:text-navy transition-colors text-gray-500"
                        >
                          <Download size={11} /> PDF
                        </a>
                      ) : (
                        <span className="text-xs text-gray-300">Generating…</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
