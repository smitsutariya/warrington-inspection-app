import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { FileText } from 'lucide-react'
import DocumentsClient from './DocumentsClient'

export default async function DocumentsPage() {
  const supabase = createClient()

  const { data: inspections } = await supabase
    .from('inspections')
    .select('*, unit:units(unit_number, property:properties(name))')
    .eq('status', 'complete')
    .order('updated_at', { ascending: false })

  return (
    <div className="p-7">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl" style={{ color: '#123C3F' }}>Documents</h1>
          <p className="text-sm mt-0.5" style={{ color: '#4d7073' }}>All finalized inspection reports</p>
        </div>
      </div>

      {!inspections?.length ? (
        <div className="card text-center py-16">
          <FileText size={32} className="mx-auto mb-3" style={{ color: '#E1E5EE' }} />
          <p className="text-sm" style={{ color: '#4d7073' }}>No completed reports yet</p>
          <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>Complete an inspection and lock it to generate a PDF</p>
        </div>
      ) : (
        <DocumentsClient inspections={inspections} />
      )}
    </div>
  )
}
