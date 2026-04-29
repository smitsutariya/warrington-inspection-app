'use client'
import { useState } from 'react'

const PREFS = [
  { key: 'assigned',          label: 'Inspection assigned to me',     desc: 'When a new inspection is created for your property' },
  { key: 'tenant_signed',     label: 'Tenant signature received',     desc: 'When a tenant signs via the remote link' },
  { key: 'pm_required',       label: 'PM signature required',         desc: 'Reminder when awaiting property manager sign-off' },
  { key: 'report_finalized',  label: 'Report finalized & PDF sent',   desc: 'Confirmation when report is locked and distributed' },
  { key: 'overdue',           label: 'Overdue inspection alerts',     desc: 'If a report hasn\'t been completed within 3 days' },
  { key: 'deposit_saved',     label: 'Deposit statement saved',       desc: 'When a deposit calculation is saved on a report' },
]

export default function NotificationsPage() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    assigned: true, tenant_signed: true, pm_required: true,
    report_finalized: true, overdue: false, deposit_saved: false,
  })
  const [email, setEmail] = useState('')
  const [frequency, setFrequency] = useState('immediate')
  const [saved, setSaved] = useState(false)

  const toggle = (key: string) => setPrefs(p => ({ ...p, [key]: !p[key] }))

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-7">
      <h1 className="font-serif text-2xl text-navy mb-6">Notification Settings</h1>

      <div className="max-w-lg space-y-5">
        <div className="card">
          <div className="section-title">Email Notifications</div>
          <div className="space-y-0">
            {PREFS.map(({ key, label, desc }, i) => (
              <div key={key} className={`flex items-center justify-between py-3.5 ${i < PREFS.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div>
                  <p className="text-sm font-medium text-navy">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>
                <button
                  onClick={() => toggle(key)}
                  className={`w-10 h-6 rounded-full relative transition-colors flex-shrink-0 ml-4 ${prefs[key] ? 'bg-teal' : 'bg-gray-200'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${prefs[key] ? 'left-5' : 'left-1'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-title">Delivery Preferences</div>
          <div className="space-y-4">
            <div>
              <label className="label">Notification Email</label>
              <input type="email" className="input" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com" />
            </div>
            <div>
              <label className="label">Digest Frequency</label>
              <select className="input" value={frequency} onChange={e => setFrequency(e.target.value)}>
                <option value="immediate">Immediate</option>
                <option value="daily">Daily Summary</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <button onClick={handleSave} className="btn-primary w-full">
              {saved ? '✓ Saved' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
