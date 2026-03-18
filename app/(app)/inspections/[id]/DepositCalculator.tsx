'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const CHARGES = [
  { key: 'unpaid_rent',          label: 'Unpaid Rent / Late Fees' },
  { key: 'liquidated_damages',   label: 'Liquidated Damages' },
  { key: 'carpet_cleaning',      label: 'Carpet Cleaning' },
  { key: 'window_cover_cleaning',label: 'Window Cover Cleaning' },
  { key: 'suite_cleaning',       label: 'Suite Cleaning' },
  { key: 'painting',             label: 'Painting' },
  { key: 'repair_replacement',   label: 'Repair / Replacement' },
  { key: 'key_fob_replacement',  label: 'Key / FOB / Remote Replacement' },
  { key: 'pet_damage',           label: 'Pet Damage' },
  { key: 'other_charges',        label: 'Other Charges' },
]

const DEPOSITS = [
  { key: 'security_deposit', label: 'Security Deposit' },
  { key: 'key_deposit',      label: 'Key Deposit' },
  { key: 'accrued_interest', label: 'Accrued Interest' },
  { key: 'other_deposit',    label: 'Other Deposit' },
]

export default function DepositCalculator({ inspectionId, initialDeposit, isLocked, tenantName }: any) {
  const supabase = createClient()
  const [saved, setSaved] = useState(false)

  const emptyDeposit = Object.fromEntries([...CHARGES, ...DEPOSITS].map(f => [f.key, 0]))
  const [values, setValues] = useState<Record<string, number>>({ ...emptyDeposit, ...(initialDeposit ?? {}) })

  const totalCharges = CHARGES.reduce((s, f) => s + (values[f.key] ?? 0), 0)
  const totalDeposits = DEPOSITS.reduce((s, f) => s + (values[f.key] ?? 0), 0)
  const balance = totalDeposits - totalCharges
  const dueToTenant = balance > 0
  const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n)

  const update = (key: string, val: string) => {
    setValues(v => ({ ...v, [key]: parseFloat(val) || 0 }))
    setSaved(false)
  }

  const handleSave = async () => {
    await supabase
      .from('deposit_statements')
      .upsert({ inspection_id: inspectionId, ...values }, { onConflict: 'inspection_id' })
    setSaved(true)
  }

  return (
    <div className="max-w-3xl">
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-navy">Security Deposit Statement</h2>
          {!isLocked && (
            <button onClick={handleSave} className="btn-teal text-xs px-3 py-1.5">
              {saved ? '✓ Saved' : 'Save Statement'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-8">
          {/* Charges */}
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              A. Charges to Tenant
            </div>
            <div className="space-y-2">
              {CHARGES.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="flex-1 text-sm text-gray-600">{label}</span>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={isLocked}
                      value={values[key] || ''}
                      onChange={e => update(key, e.target.value)}
                      className="input w-28 pl-6 text-right text-sm disabled:bg-gray-50"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-sm font-medium">A. Balance Due to Landlord</span>
              <span className="font-serif text-lg text-navy">{fmt(totalCharges)}</span>
            </div>
          </div>

          {/* Deposits */}
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              B. Deposits Received from Tenant
            </div>
            <div className="space-y-2">
              {DEPOSITS.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="flex-1 text-sm text-gray-600">{label}</span>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={isLocked}
                      value={values[key] || ''}
                      onChange={e => update(key, e.target.value)}
                      className="input w-28 pl-6 text-right text-sm disabled:bg-gray-50"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-sm font-medium">B. Total Deposits</span>
              <span className="font-serif text-lg text-navy">{fmt(totalDeposits)}</span>
            </div>
          </div>
        </div>

        {/* Balance */}
        <div
          className="mt-5 rounded-xl p-5"
          style={{ background: '#1a2744' }}
        >
          <div className="text-xs text-white/40 uppercase tracking-widest mb-1">Net Balance (B − A)</div>
          <div className="font-serif text-3xl" style={{ color: '#c8a96e' }}>{fmt(Math.abs(balance))}</div>
          <div className="text-sm mt-1" style={{ color: balance >= 0 ? '#9fe1cb' : '#f09595' }}>
            {dueToTenant ? `Refund due to tenant` : `Amount owed to landlord (beyond deposit)`}
          </div>
        </div>

        {/* Tenant consent */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
          <p className="text-xs text-gray-500 mb-2">
            I agree with the amounts noted above and authorize deduction of the Balance Due to Landlord from my Security Deposit and/or Other Deposit(s).
          </p>
          {tenantName && (
            <p className="text-xs text-gray-400">
              Tenant: <strong>{tenantName}</strong>
              {initialDeposit?.tenant_signed_at && (
                <span className="ml-2 text-green-600">
                  ✓ Signed {new Date(initialDeposit.tenant_signed_at).toLocaleDateString()}
                </span>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
