'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Home, ClipboardList, PlusCircle,
  FileText, Settings, LogOut, Bell, User
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/properties', label: 'Properties', icon: Home },
  { href: '/inspections', label: 'Inspections', icon: ClipboardList },
  { href: '/inspections/new', label: 'New Inspection', icon: PlusCircle },
  { href: '/documents', label: 'Documents', icon: FileText },
]

const bottomItems = [
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/notifications', label: 'Notifications', icon: Bell },
]

interface SidebarProps {
  userEmail?: string
  userName?: string
  userRole?: string
}

export default function Sidebar({ userEmail, userName, userRole }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  const initials = userName
    ? userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : userEmail?.[0]?.toUpperCase() ?? '?'

  return (
    <aside className="w-[220px] flex-shrink-0 flex flex-col"
      style={{ background: '#1a2744', minHeight: '100vh' }}>

      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/10">
        <div className="font-serif text-sm tracking-widest uppercase" style={{ color: '#c8a96e' }}>
          Warrington
        </div>
        <div className="text-[10px] text-white/30 tracking-widest uppercase mt-0.5">
          Residential
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 px-5 py-2.5 text-sm transition-all border-l-[3px] ${
              isActive(href)
                ? 'bg-white/10 text-white border-l-[#c8a96e]'
                : 'text-white/60 border-transparent hover:bg-white/5 hover:text-white'
            }`}
          >
            <Icon size={15} />
            {label}
          </Link>
        ))}

        <div className="mt-4 mb-1 px-5 text-[10px] text-white/25 uppercase tracking-widest">
          Account
        </div>

        {bottomItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 px-5 py-2.5 text-sm transition-all border-l-[3px] ${
              isActive(href)
                ? 'bg-white/10 text-white border-l-[#c8a96e]'
                : 'text-white/60 border-transparent hover:bg-white/5 hover:text-white'
            }`}
          >
            <Icon size={15} />
            {label}
          </Link>
        ))}
      </nav>

      {/* User */}
      <div className="px-5 py-4 border-t border-white/10">
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
            style={{ background: '#c8a96e', color: '#1a2744' }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-white text-xs font-medium truncate">{userName || userEmail}</div>
            <div className="text-white/35 text-[10px] capitalize">
              {userRole?.replace('_', ' ') ?? 'Manager'}
            </div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-white/40 hover:text-white/70 text-xs transition-colors w-full"
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
