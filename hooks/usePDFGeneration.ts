'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { generateInspectionPDF } from '@/lib/pdf'

export function usePDFGeneration() {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const generateAndStore = async (inspectionId: string) => {
    setGenerating(true)
    setError(null)

    try {
      // Fetch all data needed for PDF
      const [
        { data: inspection },
        { data: sections },
        { data: responses },
        { data: photos },
        { data: deposit },
      ] = await Promise.all([
        supabase
          .from('inspections')
          .select('*, unit:units(unit_number, property:properties(*))')
          .eq('id', inspectionId)
          .single(),
        supabase
          .from('inspection_sections')
          .select('*, items:inspection_items(*)')
          .order('display_order'),
        supabase
          .from('inspection_responses')
          .select('*')
          .eq('inspection_id', inspectionId),
        supabase
          .from('inspection_photos')
          .select('*')
          .eq('inspection_id', inspectionId),
        supabase
          .from('deposit_statements')
          .select('*')
          .eq('inspection_id', inspectionId)
          .single(),
      ])

      if (!inspection) throw new Error('Inspection not found')

      const responsesMap = Object.fromEntries((responses ?? []).map(r => [r.item_id, r]))
      const sectionsWithResponses = (sections ?? []).map(s => ({
        ...s,
        items: (s.items ?? [])
          .sort((a: any, b: any) => a.display_order - b.display_order)
          .map((item: any) => ({ ...item, response: responsesMap[item.id] ?? null })),
      }))

      // Generate PDF blob
      const blob = await generateInspectionPDF(
        inspection as any,
        sectionsWithResponses as any,
        photos ?? [],
        deposit
      )

      // Upload to Supabase Storage
      const fileName = `${inspectionId}/report-${Date.now()}.pdf`
      const { error: uploadError } = await supabase.storage
        .from('inspection-pdfs')
        .upload(fileName, blob, { contentType: 'application/pdf', upsert: true })

      if (uploadError) throw uploadError

      // Get signed URL (valid 7 days)
      const { data: { signedUrl } } = await supabase.storage
        .from('inspection-pdfs')
        .createSignedUrl(fileName, 60 * 60 * 24 * 7)

      // Update inspection record with PDF URL
      await supabase
        .from('inspections')
        .update({
          pdf_url: signedUrl,
          pdf_generated_at: new Date().toISOString(),
          locked: true,
          status: 'complete',
        })
        .eq('id', inspectionId)

      // Audit log
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('audit_logs').insert({
        inspection_id: inspectionId,
        user_id: user?.id,
        action: 'report_locked',
        details: { pdf_url: signedUrl },
      })

      // Trigger download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const propName = inspection.unit?.property?.name ?? 'Property'
      const unitNum = inspection.unit?.unit_number ?? ''
      a.download = `Unit ${unitNum} - ${propName} - Condition Inspection Report (${inspection.type === 'move_in' ? 'Move In' : 'Move Out'}).pdf`
      a.click()
      URL.revokeObjectURL(url)

      return signedUrl
    } catch (err: any) {
      setError(err.message ?? 'PDF generation failed')
      return null
    } finally {
      setGenerating(false)
    }
  }

  return { generateAndStore, generating, error }
}
