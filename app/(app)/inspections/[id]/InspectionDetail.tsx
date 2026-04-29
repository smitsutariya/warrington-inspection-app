'use client'
import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Camera, Save, FileCheck, Clock, CheckCircle } from 'lucide-react'
import SignaturePad from './SignaturePad'
import DepositCalculator from './DepositCalculator'
import AuditLogView from './AuditLogView'
import PhotoUpload from './PhotoUpload'
import { CONDITION_CODE_SHORT, type ConditionCode } from '@/types'

const CODES: { code: ConditionCode; label: string }[] = [
  { code: 'satisfactory', label: '✓' },
  { code: 'cleaning',     label: 'C' },
  { code: 'damaged',      label: 'D' },
  { code: 'painting',     label: 'P' },
  { code: 'missing',      label: 'M' },
  { code: 'wear_tear',    label: 'W' },
  { code: 'stained',      label: 'S' },
]

const CODE_COLORS: Record<string, string> = {
  satisfactory: 'bg-green-500 border-green-500 text-white',
  cleaning:     'bg-blue-500 border-blue-500 text-white',
  damaged:      'bg-red-500 border-red-500 text-white',
  painting:     'bg-amber-500 border-amber-500 text-white',
  missing:      'bg-purple-500 border-purple-500 text-white',
  wear_tear:    'bg-gray-500 border-gray-500 text-white',
  stained:      'bg-orange-500 border-orange-500 text-white',
}

const STATUS_INFO = {
  draft:          { label: 'Draft',          color: 'badge-gray' },
  in_progress:    { label: 'In Progress',    color: 'badge-info' },
  pending_tenant: { label: 'Pending Tenant', color: 'badge-warn' },
  pending_pm:     { label: 'Pending PM',     color: 'badge-warn' },
  complete:       { label: 'Complete',       color: 'badge-success' },
}

type Tab = 'form' | 'deposit' | 'signatures' | 'audit'

export default function InspectionDetail({
  inspection, sections, photos, deposit, auditLogs, moveInResponses
}: any) {
  const supabase = createClient()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('form')
  const [responses, setResponses] = useState<Record<string, any>>(() => {
    const map: Record<string, any> = {}
    sections.forEach((s: any) => s.items?.forEach((item: any) => {
      if (item.response) map[item.id] = item.response
    }))
    return map
  })
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const isMoveOut = inspection.type === 'move_out'
  const isLocked = inspection.locked

  const toggleSection = (id: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const updateResponse = useCallback(async (
    itemId: string,
    field: string,
    value: string
  ) => {
    if (isLocked) return

    setResponses(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value, item_id: itemId }
    }))

    clearTimeout(debounceRef.current[itemId])
    debounceRef.current[itemId] = setTimeout(async () => {
      const current = responses[itemId] ?? {}
      const payload = {
        inspection_id: inspection.id,
        item_id: itemId,
        ...current,
        [field]: value,
      }

      await supabase
        .from('inspection_responses')
        .upsert(payload, { onConflict: 'inspection_id,item_id' })

      await supabase.from('audit_logs').insert({
        inspection_id: inspection.id,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'field_changed',
        details: { item_id: itemId, field, value },
      })
    }, 800)
  }, [inspection.id, isLocked, responses])

  const handleSave = async () => {
    setSaving(true)
    await supabase
      .from('inspections')
      .update({ status: 'in_progress', updated_at: new Date().toISOString() })
      .eq('id', inspection.id)
    setSaveMsg('Saved!')
    setTimeout(() => setSaveMsg(''), 2000)
    setSaving(false)
    router.refresh()
  }

  const property = inspection.unit?.property
  const fileName = `Unit ${inspection.unit?.unit_number} - ${property?.name} - Condition Inspection Report (${inspection.type === 'move_in' ? 'Move In' : 'Move Out'})`

  const tabs: { id: Tab; label: string }[] = [
    { id: 'form',       label: 'Inspection Rooms' },
    { id: 'deposit',    label: 'Deposit Statement' },
    { id: 'signatures', label: 'Signatures' },
    { id: 'audit',      label: 'Audit Log' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-7 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="font-serif text-lg text-navy">{fileName}</h1>
            <span className={STATUS_INFO[inspection.status as keyof typeof STATUS_INFO]?.color ?? 'badge-gray'}>
              {STATUS_INFO[inspection.status as keyof typeof STATUS_INFO]?.label}
            </span>
            {isMoveOut && <span className="badge-warn">Move-Out</span>}
          </div>
          <p className="text-xs text-gray-400">
            {inspection.tenant_name} &nbsp;·&nbsp; {inspection.inspection_date}
            {isLocked && <span className="ml-2 text-green-600 font-medium">🔒 Locked — read only</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saveMsg && <span className="text-xs text-green-600">{saveMsg}</span>}
          {!isLocked && (
            <button onClick={handleSave} disabled={saving} className="btn-secondary flex items-center gap-1.5 text-xs">
              <Save size={13} /> {saving ? 'Saving…' : 'Save'}
            </button>
          )}
          {inspection.pdf_url && (
            <a href={inspection.pdf_url} target="_blank" rel="noreferrer"
              className="btn-primary flex items-center gap-1.5 text-xs">
              <FileCheck size={13} /> Download PDF
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-7 flex-shrink-0">
        <div className="flex gap-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-navy text-navy font-medium'
                  : 'border-transparent text-gray-400 hover:text-navy'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-7">

        {/* FORM TAB */}
        {activeTab === 'form' && (
          <div className="space-y-3 max-w-5xl">
            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs text-gray-500 bg-white rounded-xl border border-gray-100 px-4 py-3 mb-2">
              {CODES.map(({ code, label }) => (
                <span key={code} className="flex items-center gap-1.5">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${CODE_COLORS[code] ?? 'border-gray-200 text-gray-500'}`}>{label}</span>
                  {code.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}
                </span>
              ))}
            </div>

            {sections.map((section: any) => {
              const isCollapsed = collapsedSections.has(section.id)
              return (
                <div key={section.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between px-5 py-3.5 bg-gray-50/80 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-navy text-sm">{section.name}</span>
                      <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-100">
                        {section.items?.length} items
                      </span>
                    </div>
                    {isCollapsed ? <ChevronDown size={15} className="text-gray-400" /> : <ChevronUp size={15} className="text-gray-400" />}
                  </button>

                  {!isCollapsed && (
                    <div>
                      {/* Column headers */}
                      <div className={`grid px-5 py-2 border-b border-gray-50 bg-gray-50/40 text-[10px] text-gray-400 uppercase tracking-wide font-medium ${isMoveOut ? 'grid-cols-[180px_1fr_160px_160px]' : 'grid-cols-[180px_1fr_160px]'} gap-3`}>
                        <span>Item</span>
                        <span>Comments</span>
                        <span>Move-In</span>
                        {isMoveOut && <span>Move-Out</span>}
                      </div>

                      {section.items?.map((item: any) => {
                        const resp = responses[item.id] ?? {}
                        const moveInResp = moveInResponses?.[item.id]
                        return (
                          <div
                            key={item.id}
                            className={`grid px-5 py-3 border-b border-gray-50 last:border-none items-start gap-3 ${isMoveOut ? 'grid-cols-[180px_1fr_160px_160px]' : 'grid-cols-[180px_1fr_160px]'}`}
                          >
                            <span className="text-sm text-gray-700 pt-1">{item.name}</span>

                            <textarea
                              value={resp.move_out_comment ?? resp.move_in_comment ?? ''}
                              onChange={e => updateResponse(item.id, isMoveOut ? 'move_out_comment' : 'move_in_comment', e.target.value)}
                              disabled={isLocked}
                              className="input text-xs resize-none min-h-[32px] h-8 py-1.5 disabled:bg-gray-50 disabled:text-gray-400"
                              placeholder="Add comment…"
                            />

                            {/* Move-in codes */}
                            <div className="flex flex-wrap gap-1">
                              {CODES.map(({ code, label }) => {
                                const isSelected = isMoveOut
                                  ? moveInResp?.move_in_code === code
                                  : resp.move_in_code === code
                                return (
                                  <button
                                    key={code}
                                    type="button"
                                    disabled={isLocked || (isMoveOut && !!moveInResponses)}
                                    onClick={() => !isMoveOut && updateResponse(item.id, 'move_in_code', code)}
                                    className={`w-6 h-6 rounded-full text-[10px] font-bold border transition-all ${
                                      isSelected
                                        ? CODE_COLORS[code]
                                        : 'border-gray-200 text-gray-400 hover:border-gray-400'
                                    } ${(isMoveOut && !!moveInResponses) || isLocked ? 'cursor-default opacity-70' : ''}`}
                                    title={code}
                                  >
                                    {label}
                                  </button>
                                )
                              })}
                            </div>

                            {/* Move-out codes (move-out only) */}
                            {isMoveOut && (
                              <div className="flex flex-wrap gap-1">
                                {CODES.map(({ code, label }) => (
                                  <button
                                    key={code}
                                    type="button"
                                    disabled={isLocked}
                                    onClick={() => updateResponse(item.id, 'move_out_code', code)}
                                    className={`w-6 h-6 rounded-full text-[10px] font-bold border transition-all ${
                                      resp.move_out_code === code
                                        ? CODE_COLORS[code]
                                        : 'border-gray-200 text-gray-400 hover:border-gray-400'
                                    } ${isLocked ? 'cursor-default' : ''}`}
                                    title={code}
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Keys & Controls */}
            <KeysSection inspection={inspection} isLocked={isLocked} onSave={handleSave} />
            {/* Smoke Alarms */}
            <SmokeAlarmSection inspection={inspection} isLocked={isLocked} />
          </div>
        )}

        {/* DEPOSIT TAB */}
        {activeTab === 'deposit' && (
          <DepositCalculator
            inspectionId={inspection.id}
            initialDeposit={deposit}
            isLocked={isLocked}
            tenantName={inspection.tenant_name}
          />
        )}

        {/* SIGNATURES TAB */}
        {activeTab === 'signatures' && (
          <SignaturePad
            inspection={inspection}
            isLocked={isLocked}
            onComplete={() => router.refresh()}
          />
        )}

        {/* AUDIT LOG TAB */}
        {activeTab === 'audit' && (
          <AuditLogView logs={auditLogs} />
        )}
      </div>
    </div>
  )
}

function KeysSection({ inspection, isLocked, onSave }: any) {
  const supabase = createClient()
  const [keys, setKeys] = useState({
    suite_keys_given: inspection.suite_keys_given ?? 0,
    suite_keys_returned: inspection.suite_keys_returned ?? 0,
    building_keys_given: inspection.building_keys_given ?? 0,
    building_keys_returned: inspection.building_keys_returned ?? 0,
    mailbox_keys_given: inspection.mailbox_keys_given ?? 0,
    mailbox_keys_returned: inspection.mailbox_keys_returned ?? 0,
    fob1_code: inspection.fob1_code ?? '',
    fob2_code: inspection.fob2_code ?? '',
    parking_stall: inspection.parking_stall ?? '',
    parking_decal: inspection.parking_decal ?? '',
    locker_number: inspection.locker_number ?? '',
    keys_missing_at_moveout: inspection.keys_missing_at_moveout ?? false,
  })

  const save = async () => {
    await supabase.from('inspections').update(keys).eq('id', inspection.id)
  }

  return (
    <div className="card">
      <div className="section-title">Keys & Controls</div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[
          { label: 'Suite Keys Given / Returned', given: 'suite_keys_given', ret: 'suite_keys_returned' },
          { label: 'Building Keys Given / Returned', given: 'building_keys_given', ret: 'building_keys_returned' },
          { label: 'Mailbox Keys Given / Returned', given: 'mailbox_keys_given', ret: 'mailbox_keys_returned' },
        ].map(({ label, given, ret }) => (
          <div key={given}>
            <label className="label">{label}</label>
            <div className="flex gap-2">
              <input type="number" min="0" className="input" disabled={isLocked}
                value={(keys as any)[given]}
                onChange={e => setKeys(k => ({ ...k, [given]: +e.target.value }))}
                onBlur={save} placeholder="Given" />
              <input type="number" min="0" className="input" disabled={isLocked}
                value={(keys as any)[ret]}
                onChange={e => setKeys(k => ({ ...k, [ret]: +e.target.value }))}
                onBlur={save} placeholder="Ret" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-4">
        <div><label className="label">FOB #1 Code</label>
          <input type="text" className="input" disabled={isLocked} value={keys.fob1_code}
            onChange={e => setKeys(k => ({ ...k, fob1_code: e.target.value }))} onBlur={save} /></div>
        <div><label className="label">FOB #2 Code</label>
          <input type="text" className="input" disabled={isLocked} value={keys.fob2_code}
            onChange={e => setKeys(k => ({ ...k, fob2_code: e.target.value }))} onBlur={save} /></div>
        <div><label className="label">Parking Stall #</label>
          <input type="text" className="input" disabled={isLocked} value={keys.parking_stall}
            onChange={e => setKeys(k => ({ ...k, parking_stall: e.target.value }))} onBlur={save} /></div>
        <div><label className="label">Locker #</label>
          <input type="text" className="input" disabled={isLocked} value={keys.locker_number}
            onChange={e => setKeys(k => ({ ...k, locker_number: e.target.value }))} onBlur={save} /></div>
      </div>
      <div className="mt-4">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" disabled={isLocked} checked={keys.keys_missing_at_moveout}
            onChange={e => { setKeys(k => ({ ...k, keys_missing_at_moveout: e.target.checked })); save() }} />
          Keys missing at move-out
        </label>
      </div>
    </div>
  )
}

function SmokeAlarmSection({ inspection, isLocked }: any) {
  const supabase = createClient()
  const [alarms, setAlarms] = useState({
    smoke_alarm_move_in: inspection.smoke_alarm_move_in ?? 'functioning',
    smoke_alarm_move_out: inspection.smoke_alarm_move_out ?? 'functioning',
  })

  const save = async (updated: typeof alarms) => {
    await supabase.from('inspections').update(updated).eq('id', inspection.id)
  }

  return (
    <div className="card">
      <div className="section-title">Smoke Alarms</div>
      <div className="grid grid-cols-2 gap-4">
        {(['move_in', 'move_out'] as const).map(phase => (
          <div key={phase}>
            <label className="label">{phase === 'move_in' ? 'Move-In' : 'Move-Out'} — Tested</label>
            <select
              className="input"
              disabled={isLocked}
              value={(alarms as any)[`smoke_alarm_${phase}`]}
              onChange={e => {
                const updated = { ...alarms, [`smoke_alarm_${phase}`]: e.target.value }
                setAlarms(updated)
                save(updated)
              }}
            >
              <option value="functioning">Functioning</option>
              <option value="not_functioning">Not Functioning</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}
