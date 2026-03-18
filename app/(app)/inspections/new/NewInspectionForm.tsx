'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  properties: { id: string; name: string; landlord_name: string; landlord_address?: string }[]
  defaultType: 'move_in' | 'move_out'
  managerName: string
}

export default function NewInspectionForm({ properties, defaultType, managerName }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    property_id: '',
    unit_id: '',
    type: defaultType,
    inspection_date: new Date().toISOString().split('T')[0],
    tenant_name: '',
    tenant_email: '',
    possession_date: '',
    end_of_tenancy_date: '',
    property_manager_name: '',
    resident_manager_name: managerName,
  })

  const [units, setUnits] = useState<{ id: string; unit_number: string }[]>([])
  const [priorInspections, setPriorInspections] = useState<{ id: string; tenant_name: string; inspection_date: string }[]>([])
  const [move_in_inspection_id, setMoveInInspectionId] = useState('')

  useEffect(() => {
    if (!form.property_id) return
    supabase
      .from('units')
      .select('id, unit_number')
      .eq('property_id', form.property_id)
      .order('unit_number')
      .then(({ data }) => setUnits(data ?? []))
  }, [form.property_id])

  useEffect(() => {
    if (!form.unit_id || form.type !== 'move_out') return
    supabase
      .from('inspections')
      .select('id, tenant_name, inspection_date')
      .eq('unit_id', form.unit_id)
      .eq('type', 'move_in')
      .eq('status', 'complete')
      .order('inspection_date', { ascending: false })
      .then(({ data }) => setPriorInspections(data ?? []))
  }, [form.unit_id, form.type])

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()

    const { data: inspection, error: err } = await supabase
      .from('inspections')
      .insert({
        ...form,
        created_by: user?.id,
        status: 'draft',
        suite_keys_given: 0,
        suite_keys_returned: 0,
        building_keys_given: 0,
        building_keys_returned: 0,
        mailbox_keys_given: 0,
        mailbox_keys_returned: 0,
        keys_missing_at_moveout: false,
        locked: false,
        ...(form.type === 'move_out' && move_in_inspection_id ? { move_in_inspection_id } : {}),
      })
      .select()
      .single()

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    // Log action
    await supabase.from('audit_logs').insert({
      inspection_id: inspection.id,
      user_id: user?.id,
      action: 'inspection_created',
      details: { type: form.type, unit_id: form.unit_id },
    })

    router.push(`/inspections/${inspection.id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      {/* Property & Unit */}
      <div className="card">
        <div className="section-title">Property & Unit</div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Property *</label>
            <select
              className="input"
              value={form.property_id}
              onChange={e => { update('property_id', e.target.value); update('unit_id', '') }}
              required
            >
              <option value="">Select property…</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Unit Number *</label>
            <select
              className="input"
              value={form.unit_id}
              onChange={e => update('unit_id', e.target.value)}
              required
              disabled={!form.property_id}
            >
              <option value="">Select unit…</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>Unit {u.unit_number}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Inspection Type *</label>
            <select className="input" value={form.type} onChange={e => update('type', e.target.value)} required>
              <option value="move_in">Move-In</option>
              <option value="move_out">Move-Out</option>
            </select>
          </div>
          <div>
            <label className="label">Inspection Date *</label>
            <input type="date" className="input" value={form.inspection_date}
              onChange={e => update('inspection_date', e.target.value)} required />
          </div>
        </div>

        {/* Move-out: link to prior move-in */}
        {form.type === 'move_out' && form.unit_id && priorInspections.length > 0 && (
          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
            <label className="label text-amber-700">Link Prior Move-In Report</label>
            <select className="input" value={move_in_inspection_id}
              onChange={e => setMoveInInspectionId(e.target.value)}>
              <option value="">Select move-in report…</option>
              {priorInspections.map(p => (
                <option key={p.id} value={p.id}>
                  {p.tenant_name} — {p.inspection_date}
                </option>
              ))}
            </select>
            <p className="text-xs text-amber-600 mt-1">
              Linking loads move-in conditions side-by-side for comparison
            </p>
          </div>
        )}
      </div>

      {/* Tenant Information */}
      <div className="card">
        <div className="section-title">Tenant Information</div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Tenant Full Name(s) *</label>
            <input type="text" className="input" placeholder="Sarah Kim"
              value={form.tenant_name} onChange={e => update('tenant_name', e.target.value)} required />
          </div>
          <div>
            <label className="label">Tenant Email</label>
            <input type="email" className="input" placeholder="tenant@email.com"
              value={form.tenant_email} onChange={e => update('tenant_email', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">{form.type === 'move_in' ? 'Possession' : 'End of Tenancy'} Date *</label>
            <input type="date" className="input"
              value={form.type === 'move_in' ? form.possession_date : form.end_of_tenancy_date}
              onChange={e => update(form.type === 'move_in' ? 'possession_date' : 'end_of_tenancy_date', e.target.value)}
              required />
          </div>
        </div>
      </div>

      {/* Manager Info */}
      <div className="card">
        <div className="section-title">Landlord / Manager</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Property Manager *</label>
            <input type="text" className="input" placeholder="Diana Chu"
              value={form.property_manager_name}
              onChange={e => update('property_manager_name', e.target.value)} required />
          </div>
          <div>
            <label className="label">Resident / Building Manager</label>
            <input type="text" className="input"
              value={form.resident_manager_name}
              onChange={e => update('resident_manager_name', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
        <button type="submit" disabled={loading} className="btn-teal disabled:opacity-50">
          {loading ? 'Creating…' : 'Create & Start Inspection →'}
        </button>
      </div>
    </form>
  )
}
