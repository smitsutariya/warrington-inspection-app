import { createClient } from '@/lib/supabase/server'
import ProfileForm from './ProfileForm'

export default async function ProfilePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user?.id ?? '').single()

  const PERMISSIONS: { feature: string; admin: boolean; pm: boolean | string; bm: boolean | string }[] = [
    { feature: 'Create Inspection',  admin: true,  pm: false,       bm: true },
    { feature: 'Edit Inspection',    admin: true,  pm: 'Limited',   bm: true },
    { feature: 'Sign Report (PM)',   admin: false, pm: true,        bm: false },
    { feature: 'View All Properties',admin: true,  pm: true,        bm: 'Assigned' },
    { feature: 'Manage Templates',   admin: true,  pm: false,       bm: false },
    { feature: 'Export PDF',         admin: true,  pm: true,        bm: true },
    { feature: 'View Audit Log',     admin: true,  pm: true,        bm: true },
    { feature: 'Manage Users',       admin: true,  pm: false,       bm: false },
  ]

  return (
    <div className="p-7">
      <h1 className="font-serif text-2xl text-navy mb-6">Profile & Roles</h1>

      <div className="grid grid-cols-2 gap-6">
        <ProfileForm profile={profile} />

        <div className="card">
          <div className="section-title">Role Permissions</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-xs text-gray-400 font-medium">Feature</th>
                <th className="text-center py-2 text-xs text-gray-400 font-medium">Admin</th>
                <th className="text-center py-2 text-xs text-gray-400 font-medium">PM</th>
                <th className="text-center py-2 text-xs text-gray-400 font-medium">Bldg Mgr</th>
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map(({ feature, admin, pm, bm }) => {
                const currentRole = profile?.role
                const Cell = ({ val, role }: { val: boolean | string; role: string }) => {
                  const isMe = currentRole === role
                  if (val === true) return <span className={`text-xs font-medium ${isMe ? 'text-blue-600' : 'text-green-600'}`}>{isMe ? '✓ You' : '✓'}</span>
                  if (val === false) return <span className="text-gray-200 text-xs">—</span>
                  return <span className={`text-xs ${isMe ? 'text-blue-500' : 'text-gray-400'}`}>{val}</span>
                }
                return (
                  <tr key={feature} className="border-b border-gray-50 last:border-none">
                    <td className="py-2.5 text-gray-600 text-xs">{feature}</td>
                    <td className="py-2.5 text-center"><Cell val={admin} role="admin" /></td>
                    <td className="py-2.5 text-center"><Cell val={pm} role="property_manager" /></td>
                    <td className="py-2.5 text-center"><Cell val={bm} role="building_manager" /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
