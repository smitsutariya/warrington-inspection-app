'use client'
import { useState } from 'react'
import { format } from 'date-fns'
import { FileText, Download, RefreshCw } from 'lucide-react'
import { usePDFGeneration } from '@/hooks/usePDFGeneration'

const TYPE: Record<string, string> = { move_in: 'Move-In', move_out: 'Move-Out' }

export default function DocumentsClient({ inspections }: { inspections: any[] }) {
  const { generateAndStore, generating } = usePDFGeneration()
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [localUrls, setLocalUrls] = useState<Record<string, string>>({})

  const handleRegenerate = async (inspectionId: string) => {
    setGeneratingId(inspectionId)
    const result = await generateAndStore(inspectionId)
    if (result) {
      // Mark as generated — PDF was downloaded to computer
      setLocalUrls(prev => ({ ...prev, [inspectionId]: 'generated' }))
    }
    setGeneratingId(null)
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: '#FCFCFD', border: '1px solid rgba(18,60,63,0.12)' }}
    >
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(18,60,63,0.08)', background: '#F4F5F7' }}>
            <th className="text-left px-5 py-3 text-xs font-medium uppercase tracking-wide" style={{ color: '#4d7073' }}>File Name</th>
            <th className="text-left px-5 py-3 text-xs font-medium uppercase tracking-wide" style={{ color: '#4d7073' }}>Unit</th>
            <th className="text-left px-5 py-3 text-xs font-medium uppercase tracking-wide" style={{ color: '#4d7073' }}>Type</th>
            <th className="text-left px-5 py-3 text-xs font-medium uppercase tracking-wide" style={{ color: '#4d7073' }}>Tenant</th>
            <th className="text-left px-5 py-3 text-xs font-medium uppercase tracking-wide" style={{ color: '#4d7073' }}>Completed</th>
            <th className="text-right px-5 py-3 text-xs font-medium uppercase tracking-wide" style={{ color: '#4d7073' }}>Download</th>
          </tr>
        </thead>
        <tbody>
          {inspections.map((insp, i) => {
            const fileName = `Unit ${insp.unit?.unit_number} - ${insp.unit?.property?.name} - Condition Inspection Report (${TYPE[insp.type] ?? insp.type})`
            const isThisGenerating = generatingId === insp.id
            const wasJustGenerated = localUrls[insp.id] === 'generated'
            const hasPdfUrl = !!insp.pdf_url

            return (
              <tr
                key={insp.id}
                style={{ borderBottom: i === inspections.length - 1 ? 'none' : '1px solid rgba(18,60,63,0.06)' }}
                className="hover:bg-gray-50/30 transition-colors"
              >
                {/* File name */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <FileText size={14} style={{ color: '#00A2AF', flexShrink: 0 }} />
                    <span
                      className="text-xs font-medium truncate max-w-xs"
                      style={{ color: '#123C3F' }}
                      title={fileName}
                    >
                      {fileName}
                    </span>
                  </div>
                </td>

                {/* Unit */}
                <td className="px-5 py-3.5">
                  <p className="text-xs font-medium" style={{ color: '#123C3F' }}>Unit {insp.unit?.unit_number}</p>
                  <p className="text-xs" style={{ color: '#4d7073' }}>{insp.unit?.property?.name}</p>
                </td>

                {/* Type */}
                <td className="px-5 py-3.5">
                  <span className={insp.type === 'move_in' ? 'badge-info' : 'badge-warn'}>
                    {TYPE[insp.type]}
                  </span>
                </td>

                {/* Tenant */}
                <td className="px-5 py-3.5 text-xs" style={{ color: '#4d7073' }}>
                  {insp.tenant_name || '—'}
                </td>

                {/* Date */}
                <td className="px-5 py-3.5 text-xs" style={{ color: '#4d7073' }}>
                  {insp.pdf_generated_at
                    ? format(new Date(insp.pdf_generated_at), 'MMM d, yyyy')
                    : format(new Date(insp.updated_at), 'MMM d, yyyy')}
                </td>

                {/* Download / Regenerate */}
                <td className="px-5 py-3.5 text-right">
                  {isThisGenerating ? (
                    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: '#00A2AF' }}>
                      <RefreshCw size={11} className="animate-spin" />
                      Generating…
                    </span>
                  ) : hasPdfUrl ? (
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={insp.pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
                        style={{
                          border: '1px solid rgba(0,162,175,0.3)',
                          color: '#00A2AF',
                          background: '#cef4f6',
                        }}
                      >
                        <Download size={11} /> Download PDF
                      </a>
                      <button
                        onClick={() => handleRegenerate(insp.id)}
                        className="text-xs px-2 py-1.5 rounded-lg transition-colors"
                        style={{ color: '#4d7073', border: '1px solid rgba(18,60,63,0.12)' }}
                        title="Re-generate PDF"
                      >
                        <RefreshCw size={11} />
                      </button>
                    </div>
                  ) : wasJustGenerated ? (
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-xs" style={{ color: '#166534' }}>✓ Downloaded</span>
                      <button
                        onClick={() => handleRegenerate(insp.id)}
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
                        style={{ border: '1px solid rgba(18,60,63,0.12)', color: '#4d7073' }}
                      >
                        <RefreshCw size={11} /> Download Again
                      </button>
                    </div>
                  ) : (
                    // No pdf_url stored — offer to regenerate
                    <button
                      onClick={() => handleRegenerate(insp.id)}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
                      style={{
                        background: '#123C3F',
                        color: '#fff',
                        border: '1px solid #123C3F',
                      }}
                    >
                      <Download size={11} /> Generate PDF
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
