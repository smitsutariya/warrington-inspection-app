'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, RefreshCw } from 'lucide-react'

interface Props {
  properties: { id: string; name: string; landlord_name: string; landlord_address?: string }[]
  defaultType: 'move_in' | 'move_out'
  managerName: string
}

function nullifyEmpty(obj: Record<string, any>) {
  const result: Record<string, any> = {}
  for (const [k, v] of Object.entries(obj)) {
    result[k] = v === '' ? null : v
  }
  return result
}

export default function NewInspectionForm({ properties, defaultType, managerName }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [prefilling, setPrefilling] = useState(false)
  const [prefilled, setPrefilled] = useState(false)

  const [form, setForm] = useState({
    property_id: '',
    unit_id: '',
    type: defaultType,
    inspection_date: new Date().toISOString().split('T')[0],
    tenant_name: '',
    tenant_email: '',
    tenant_agent_name: '',
    possession_date: '',
    end_of_tenancy_date: '',
    property_manager_name: '',
    resident_manager_name: managerName,
  })

  const [units, setUnits] = useState<{ id: string; unit_number: string }[]>([])
  const [priorInspections, setPriorInspections] = useState<{
    id: string
    tenant_name: string
    tenant_email: string
    tenant_agent_name: string
    inspection_date: string
    possession_date: string
    property_manager_name: string
    resident_manager_name: string
    suite_keys_given: number
    building_keys_given: number
    mailbox_keys_given: number
    fob1_code: string
    fob2_code: string
    parking_stall: string
    parking_decal: string
    locker_number: string
  }[]>([])
  const [move_in_inspection_id, setMoveInInspectionId] = useState('')

  // Load units when property changes
  useEffect(() => {
    if (!form.property_id) return
    setUnits([])
    update('unit_id', '')
    supabase
      .from('units')
      .select('id, unit_number')
      .eq('property_id', form.property_id)
      .order('unit_number')
      .then(({ data }) => setUnits(data ?? []))
  }, [form.property_id])

  // Load prior move-in inspections when unit changes (for move-out)
  useEffect(() => {
    if (!form.unit_id || form.type !== 'move_out') {
      setPriorInspections([])
      setMoveInInspectionId('')
      setPrefilled(false)
      return
    }
    supabase
      .from('inspections')
      .select(`
        id, tenant_name, tenant_email, tenant_agent_name,
        inspection_date, possession_date,
        property_manager_name, resident_manager_name,
        suite_keys_given, building_keys_given, mailbox_keys_given,
        fob1_code, fob2_code, parking_stall, parking_decal, locker_number
      `)
      .eq('unit_id', form.unit_id)
      .eq('type', 'move_in')
      .eq('status', 'complete')
      .order('inspection_date', { ascending: false })
      .then(({ data }) => setPriorInspections(data ?? []))
  }, [form.unit_id, form.type])

  // When user selects a prior move-in report, prefill all fields from it
  const handleMoveInSelect = async (selectedId: string) => {
    setMoveInInspectionId(selectedId)
    setPrefilled(false)
    if (!selectedId) return

    setPrefilling(true)
    const selected = priorInspections.find(p => p.id === selectedId)
    if (selected) {
      setForm(f => ({
        ...f,
        // Tenant details — prefill from move-in
        tenant_name:            selected.tenant_name            ?? f.tenant_name,
        tenant_email:           selected.tenant_email           ?? f.tenant_email,
        tenant_agent_name:      selected.tenant_agent_name      ?? f.tenant_agent_name,
        // Manager details — prefill from move-in
        property_manager_name:  selected.property_manager_name  ?? f.property_manager_name,
        resident_manager_name:  selected.resident_manager_name  ?? f.resident_manager_name,
        // Possession date reference
        possession_date:        selected.possession_date        ?? f.possession_date,
      }))
      setPrefilled(true)
    }
    setPrefilling(false)
  }

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  // When type changes to move_in, clear prefill state
  const handleTypeChange = (newType: string) => {
    update('type', newType)
    if (newType === 'move_in') {
      setMoveInInspectionId('')
      setPrefilled(false)
      setPriorInspections([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    const cleanForm = nullifyEmpty(form)

    const payload = {
      unit_id:                cleanForm.unit_id,
      property_id:            cleanForm.property_id,
      type:                   cleanForm.type,
      status:                 'draft',
      inspection_date:        cleanForm.inspection_date        || null,
      tenant_name:            cleanForm.tenant_name            || null,
      tenant_email:           cleanForm.tenant_email           || null,
      tenant_agent_name:      cleanForm.tenant_agent_name      || null,
      possession_date:        cleanForm.possession_date        || null,
      end_of_tenancy_date:    cleanForm.end_of_tenancy_date    || null,
      property_manager_name:  cleanForm.property_manager_name  || null,
      resident_manager_name:  cleanForm.resident_manager_name  || null,
      created_by:             user?.id,
      suite_keys_given:       0,
      suite_keys_returned:    0,
      building_keys_given:    0,
      building_keys_returned: 0,
      mailbox_keys_given:     0,
      mailbox_keys_returned:  0,
      keys_missing_at_moveout: false,
      locked:                 false,
      ...(form.type === 'move_out' && move_in_inspection_id
        ? { move_in_inspection_id }
        : {}),
    }

    const { data: inspection, error: err } = await supabase
      .from('inspections')
      .insert(payload)
      .select()
      .single()

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    await supabase.from('audit_logs').insert({
      inspection_id: inspection.id,
      user_id: user?.id,
      action: 'inspection_created',
      details: { type: form.type, unit_id: form.unit_id },
    })

    router.push(`/inspections/${inspection.id}`)
  }

  const isMoveOut = form.type === 'move_out'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div
          className="text-sm rounded-lg px-4 py-3"
          style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}
        >
          {error}
        </div>
      )}

      {/* ── Property & Unit ─────────────────────────────────────────── */}
      <div className="card">
        <div className="section-title">Property &amp; Unit</div>
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
            <select
              className="input"
              value={form.type}
              onChange={e => handleTypeChange(e.target.value)}
              required
            >
              <option value="move_in">Move-In</option>
              <option value="move_out">Move-Out</option>
            </select>
          </div>
          <div>
            <label className="label">Inspection Date *</label>
            <input
              type="date"
              className="input"
              value={form.inspection_date}
              onChange={e => update('inspection_date', e.target.value)}
              required
            />
          </div>
        </div>

        {/* ── Move-Out: link prior move-in + prefill notice ─────────── */}
        {isMoveOut && form.unit_id && (
          <div
            className="mt-4 p-4 rounded-lg"
            style={{
              background: prefilled ? '#eaf3de' : '#fef9ee',
              border: `1px solid ${prefilled ? '#97c459' : 'rgba(0,162,175,0.25)'}`,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <label className="label" style={{ color: prefilled ? '#3b6d11' : '#1B5B5F', marginBottom: 0 }}>
                Link Prior Move-In Report
              </label>
              {prefilling && (
                <span className="flex items-center gap-1 text-xs" style={{ color: '#00A2AF' }}>
                  <RefreshCw size={11} className="animate-spin" /> Loading…
                </span>
              )}
              {prefilled && (
                <span className="flex items-center gap-1 text-xs font-medium" style={{ color: '#3b6d11' }}>
                  <CheckCircle size={12} /> Details prefilled
                </span>
              )}
            </div>

            {priorInspections.length === 0 ? (
              <p className="text-xs" style={{ color: '#4d7073' }}>
                No completed move-in inspections found for this unit.
                You can still create a move-out inspection and fill in details manually.
              </p>
            ) : (
              <>
                <select
                  className="input"
                  value={move_in_inspection_id}
                  onChange={e => handleMoveInSelect(e.target.value)}
                  style={{ borderColor: prefilled ? '#97c459' : undefined }}
                >
                  <option value="">Select move-in report to link…</option>
                  {priorInspections.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.tenant_name ?? 'Unknown tenant'} — Move-In on {p.inspection_date}
                    </option>
                  ))}
                </select>
                <p className="text-xs mt-1.5" style={{ color: '#4d7073' }}>
                  {prefilled
                    ? 'Tenant name, email, and manager details have been prefilled below. You can edit them if needed.'
                    : 'Selecting a report will prefill tenant and manager details, and load move-in conditions side-by-side.'}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Tenant Information ───────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="section-title" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>
            Tenant Information
          </div>
          {prefilled && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#eaf3de', color: '#3b6d11' }}>
              Prefilled from move-in
            </span>
          )}
        </div>
        <div style={{ borderBottom: '1px solid var(--border)', marginBottom: 12, paddingBottom: 0 }} />

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Tenant Full Name(s) *</label>
            <input
              type="text"
              className="input"
              placeholder="Sarah Kim"
              value={form.tenant_name}
              onChange={e => update('tenant_name', e.target.value)}
              required
              style={prefilled && form.tenant_name ? { borderColor: '#00A2AF', background: '#f0fbfc' } : {}}
            />
          </div>
          <div>
            <label className="label">Tenant Email</label>
            <input
              type="email"
              className="input"
              placeholder="tenant@email.com"
              value={form.tenant_email}
              onChange={e => update('tenant_email', e.target.value)}
              style={prefilled && form.tenant_email ? { borderColor: '#00A2AF', background: '#f0fbfc' } : {}}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Tenant Agent / Representative</label>
            <input
              type="text"
              className="input"
              placeholder="Optional"
              value={form.tenant_agent_name}
              onChange={e => update('tenant_agent_name', e.target.value)}
              style={prefilled && form.tenant_agent_name ? { borderColor: '#00A2AF', background: '#f0fbfc' } : {}}
            />
          </div>
          <div>
            <label className="label">
              {isMoveOut ? 'End of Tenancy Date' : 'Possession Date'}
            </label>
            <input
              type="date"
              className="input"
              value={isMoveOut ? form.end_of_tenancy_date : form.possession_date}
              onChange={e => update(isMoveOut ? 'end_of_tenancy_date' : 'possession_date', e.target.value)}
            />
          </div>
        </div>

        {isMoveOut && form.possession_date && (
          <div className="mt-3 flex items-center gap-2">
            <label className="label" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>
              Original Possession Date
            </label>
            <input
              type="date"
              className="input"
              value={form.possession_date}
              onChange={e => update('possession_date', e.target.value)}
              style={{ borderColor: '#00A2AF', background: '#f0fbfc' }}
            />
          </div>
        )}
      </div>

      {/* ── Landlord / Manager ───────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="section-title" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>
            Landlord / Manager
          </div>
          {prefilled && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#eaf3de', color: '#3b6d11' }}>
              Prefilled from move-in
            </span>
          )}
        </div>
        <div style={{ borderBottom: '1px solid var(--border)', marginBottom: 12 }} />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Property Manager *</label>
            <input
              type="text"
              className="input"
              placeholder="Diana Chu"
              value={form.property_manager_name}
              onChange={e => update('property_manager_name', e.target.value)}
              required
              style={prefilled && form.property_manager_name ? { borderColor: '#00A2AF', background: '#f0fbfc' } : {}}
            />
          </div>
          <div>
            <label className="label">Resident / Building Manager</label>
            <input
              type="text"
              className="input"
              value={form.resident_manager_name}
              onChange={e => update('resident_manager_name', e.target.value)}
              style={prefilled && form.resident_manager_name ? { borderColor: '#00A2AF', background: '#f0fbfc' } : {}}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" className="btn-secondary" onClick={() => router.back()}>
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn-teal disabled:opacity-50"
        >
          {loading ? 'Creating…' : 'Create & Start Inspection →'}
        </button>
      </div>
    </form>
  )
}
