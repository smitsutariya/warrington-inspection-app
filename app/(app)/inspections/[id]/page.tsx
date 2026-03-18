import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import InspectionDetail from './InspectionDetail'

export default async function InspectionPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [
    { data: inspection },
    { data: sections },
    { data: responses },
    { data: photos },
    { data: deposit },
    { data: auditLogs },
  ] = await Promise.all([
    supabase
      .from('inspections')
      .select('*, unit:units(unit_number, property:properties(name, address, city, province, landlord_name, landlord_address))')
      .eq('id', params.id)
      .single(),
    supabase
      .from('inspection_sections')
      .select('*, items:inspection_items(*, response:inspection_responses(*))')
      .order('display_order'),
    supabase
      .from('inspection_responses')
      .select('*')
      .eq('inspection_id', params.id),
    supabase
      .from('inspection_photos')
      .select('*')
      .eq('inspection_id', params.id)
      .order('created_at'),
    supabase
      .from('deposit_statements')
      .select('*')
      .eq('inspection_id', params.id)
      .single(),
    supabase
      .from('audit_logs')
      .select('*, user:profiles(full_name, role)')
      .eq('inspection_id', params.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  if (!inspection) notFound()

  // Attach responses to items
  const responsesMap = Object.fromEntries((responses ?? []).map(r => [r.item_id, r]))
  const sectionsWithResponses = (sections ?? []).map(section => ({
    ...section,
    items: (section.items ?? [])
      .sort((a: any, b: any) => a.display_order - b.display_order)
      .map((item: any) => ({
        ...item,
        response: responsesMap[item.id] ?? null,
      })),
  }))

  // Load move-in inspection if this is move-out
  let moveInInspection = null
  if (inspection.move_in_inspection_id) {
    const { data } = await supabase
      .from('inspection_responses')
      .select('*')
      .eq('inspection_id', inspection.move_in_inspection_id)
    moveInInspection = Object.fromEntries((data ?? []).map(r => [r.item_id, r]))
  }

  return (
    <InspectionDetail
      inspection={inspection}
      sections={sectionsWithResponses}
      photos={photos ?? []}
      deposit={deposit}
      auditLogs={auditLogs ?? []}
      moveInResponses={moveInInspection}
    />
  )
}
