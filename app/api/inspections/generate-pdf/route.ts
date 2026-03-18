import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { inspection_id } = await request.json()
  const supabase = createClient()

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
      .eq('id', inspection_id)
      .single(),
    supabase
      .from('inspection_sections')
      .select('*, items:inspection_items(*)')
      .order('display_order'),
    supabase
      .from('inspection_responses')
      .select('*')
      .eq('inspection_id', inspection_id),
    supabase
      .from('inspection_photos')
      .select('*')
      .eq('inspection_id', inspection_id),
    supabase
      .from('deposit_statements')
      .select('*')
      .eq('inspection_id', inspection_id)
      .single(),
  ])

  if (!inspection) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const responsesMap = Object.fromEntries((responses ?? []).map(r => [r.item_id, r]))

  // Build PDF content as structured data (client-side PDF generation handles rendering)
  const pdfData = {
    inspection,
    sections: (sections ?? []).map(s => ({
      ...s,
      items: (s.items ?? []).map((item: any) => ({
        ...item,
        response: responsesMap[item.id] ?? null,
      })),
    })),
    photos: photos ?? [],
    deposit: deposit,
  }

  // Mark as PDF generated
  await supabase.from('inspections').update({
    pdf_generated_at: new Date().toISOString(),
  }).eq('id', inspection_id)

  return NextResponse.json({ success: true, data: pdfData })
}
