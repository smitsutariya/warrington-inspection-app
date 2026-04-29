import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import InspectionDetail from './InspectionDetail'

export default async function InspectionPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: inspection } = await supabase
    .from('inspections')
    .select('*, unit:units(unit_number, property:properties(name, address, city, province, landlord_name, landlord_address))')
    .eq('id', params.id)
    .single()

  if (!inspection) notFound()

  const [
    { data: sections },
    { data: items },
    { data: responses },
    { data: photos },
    { data: deposit },
    { data: auditLogs },
  ] = await Promise.all([
    supabase
      .from('inspection_sections')
      .select('*')
      .order('display_order'),
    supabase
      .from('inspection_items')
      .select('*')
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
      .maybeSingle(),
    supabase
      .from('audit_logs')
      .select('*, user:profiles(full_name, role)')
      .eq('inspection_id', params.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const responsesMap = Object.fromEntries(
    (responses ?? []).map(r => [r.item_id, r])
  )

  const itemsBySection: Record<string, any[]> = {}
  for (const item of items ?? []) {
    if (!itemsBySection[item.section_id]) itemsBySection[item.section_id] = []
    itemsBySection[item.section_id].push({
      ...item,
      response: responsesMap[item.id] ?? null,
    })
  }

  const sectionsWithResponses = (sections ?? []).map(section => ({
    ...section,
    items: (itemsBySection[section.id] ?? []).sort(
      (a: any, b: any) => a.display_order - b.display_order
    ),
  }))

  let moveInResponses: Record<string, any> | null = null
  if (inspection.move_in_inspection_id) {
    const { data: moveInData } = await supabase
      .from('inspection_responses')
      .select('*')
      .eq('inspection_id', inspection.move_in_inspection_id)
    moveInResponses = Object.fromEntries(
      (moveInData ?? []).map(r => [r.item_id, r])
    )
  }

  return (
    <InspectionDetail
      inspection={inspection}
      sections={sectionsWithResponses}
      photos={photos ?? []}
      deposit={deposit ?? null}
      auditLogs={auditLogs ?? []}
      moveInResponses={moveInResponses}
    />
  )
}
