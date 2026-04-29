'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ProfileForm({ profile }: { profile: any }) {
  const supabase = createClient()
  const [form, setForm] = useState({ full_name: profile?.full_name ?? '', email: profile?.email ?? '' })
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('profiles').update({ full_name: form.full_name }).eq('id', profile.id)
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 2000)
  }

  const initials = form.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="card">
      <div className="section-title">User Profile</div>
      <div className="flex items-center gap-4 mb-5">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-base font-semibold flex-shrink-0"
          style={{ background: '#c8a96e', color: '#1a2744' }}
        >
          {initials}
        </div>
        <div>
          <p className="font-medium text-navy">{profile?.full_name}</p>
          <p className="text-xs text-gray-400 capitalize mt-0.5">
            {profile?.role?.replace('_', ' ')}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="label">Full Name</label>
          <input type="text" className="input" value={form.full_name}
            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" className="input" value={form.email} disabled className="input bg-gray-50 text-gray-400" />
          <p className="text-xs text-gray-400 mt-1">Email cannot be changed here</p>
        </div>
        <div>
          <label className="label">Role</label>
          <input type="text" className="input bg-gray-50 text-gray-400" value={profile?.role?.replace('_', ' ')} disabled />
          <p className="text-xs text-gray-400 mt-1">Contact your administrator to change your role</p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full disabled:opacity-50"
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
