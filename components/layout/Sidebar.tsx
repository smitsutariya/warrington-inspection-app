'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Home, ClipboardList, PlusCircle,
  FileText, LogOut, Bell, User
} from 'lucide-react'

const navItems = [
  { href: '/dashboard',       label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/properties',      label: 'Properties',     icon: Home },
  { href: '/inspections',     label: 'Inspections',    icon: ClipboardList },
  { href: '/inspections/new', label: 'New Inspection', icon: PlusCircle },
  { href: '/documents',       label: 'Documents',      icon: FileText },
]

const bottomItems = [
  { href: '/profile',       label: 'Profile',        icon: User },
  { href: '/notifications', label: 'Notifications',  icon: Bell },
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
    <aside
      className="w-[220px] flex-shrink-0 flex flex-col"
      style={{ background: '#123C3F', minHeight: '100vh' }}
    >
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <Image
          src="/brand/logo-sidebar.jpg"
          alt="Warrington Residential"
          width={180}
          height={70}
          className="w-full object-contain"
          style={{ maxHeight: 60, maxWidth: 180 }}
          priority
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2.5 px-5 py-2.5 text-sm transition-all"
            style={{
              color: isActive(href) ? '#fff' : 'rgba(255,255,255,0.6)',
              background: isActive(href) ? 'rgba(0,162,175,0.18)' : 'transparent',
              borderLeft: isActive(href) ? '3px solid #00A2AF' : '3px solid transparent',
              fontFamily: 'Satoshi, sans-serif',
            }}
          >
            <Icon size={15} />
            {label}
          </Link>
        ))}

        <div
          className="mt-4 mb-1 px-5 text-xs uppercase tracking-widest"
          style={{ color: 'rgba(255,255,255,0.28)', fontFamily: 'Satoshi, sans-serif', fontSize: 10 }}
        >
          Account
        </div>

        {bottomItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2.5 px-5 py-2.5 text-sm transition-all"
            style={{
              color: isActive(href) ? '#fff' : 'rgba(255,255,255,0.6)',
              background: isActive(href) ? 'rgba(0,162,175,0.18)' : 'transparent',
              borderLeft: isActive(href) ? '3px solid #00A2AF' : '3px solid transparent',
              fontFamily: 'Satoshi, sans-serif',
            }}
          >
            <Icon size={15} />
            {label}
          </Link>
        ))}
      </nav>

      {/* User */}
      <div className="px-5 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
            style={{ background: '#00A2AF', color: '#fff' }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-white text-xs font-medium truncate" style={{ fontFamily: 'Satoshi, sans-serif' }}>
              {userName || userEmail}
            </div>
            <div className="text-xs capitalize" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'Satoshi, sans-serif' }}>
              {userRole?.replace('_', ' ') ?? 'Manager'}
            </div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-xs transition-colors w-full"
          style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Satoshi, sans-serif' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
