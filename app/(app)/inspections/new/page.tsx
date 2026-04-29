import { createClient } from '@/lib/supabase/server'
import NewInspectionForm from './NewInspectionForm'

export default async function NewInspectionPage({
  searchParams,
}: {
  searchParams: { type?: string }
}) {
  const supabase = createClient()

  const [{ data: properties }, { data: profile }] = await Promise.all([
    supabase.from('properties').select('id, name, landlord_name, landlord_address').order('name'),
    supabase.auth.getUser().then(({ data: { user } }) =>
      supabase.from('profiles').select('*').eq('id', user?.id ?? '').single()
    ),
  ])

  return (
    <div className="p-7 max-w-2xl">
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-navy">New Inspection</h1>
        <p className="text-sm text-gray-400 mt-0.5">Complete Part I before beginning the on-site inspection</p>
      </div>

      {/* Step progress */}
      <div className="flex items-center mb-8">
        {['Setup & Details', 'Inspect Rooms', 'Signatures', 'Send PDF'].map((step, i) => (
          <div key={step} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${i === 0 ? 'bg-navy text-white' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>
                {i + 1}
              </div>
              <span className={`text-xs ${i === 0 ? 'text-navy font-medium' : 'text-gray-400'}`}>{step}</span>
            </div>
            {i < 3 && <div className="w-8 h-px bg-gray-200 mx-2" />}
          </div>
        ))}
      </div>

      <NewInspectionForm
        properties={properties ?? []}
        defaultType={(searchParams.type as 'move_in' | 'move_out') ?? 'move_in'}
        managerName={profile?.data?.full_name ?? ''}
      />
    </div>
  )
}
