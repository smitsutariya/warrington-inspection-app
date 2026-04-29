'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#123C3F' }}
    >
      {/* Background teal accent shape */}
      <div
        className="absolute top-0 right-0 w-64 h-64 opacity-10 pointer-events-none"
        style={{
          background: '#00A2AF',
          borderRadius: '0 0 0 100%',
        }}
      />

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image
            src="/brand/logo-sidebar.jpg"
            alt="Warrington Residential"
            width={200}
            height={78}
            className="mx-auto object-contain"
            priority
          />
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{ background: '#FCFCFD', border: '1px solid rgba(18,60,63,0.08)' }}
        >
          <h1
            className="mb-1"
            style={{ fontFamily: 'Lora, Georgia, serif', fontSize: 22, color: '#123C3F', fontWeight: 400 }}
          >
            Sign in
          </h1>
          <p
            className="mb-6 text-sm"
            style={{ color: '#4d7073', fontFamily: 'Satoshi, sans-serif' }}
          >
            Inspection Management Portal
          </p>

          {error && (
            <div
              className="text-sm rounded-lg px-4 py-3 mb-4"
              style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input"
                placeholder="you@warringtonresidential.ca"
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                background: loading ? '#1B5B5F' : '#00A2AF',
                color: '#fff',
                fontFamily: 'Satoshi, sans-serif',
              }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p
          className="text-center text-xs mt-6"
          style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'Satoshi, sans-serif' }}
        >
          Contact your administrator to reset your password
        </p>

        {/* Brand address footer */}
        <p
          className="text-center text-xs mt-3"
          style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'Satoshi, sans-serif' }}
        >
          1030 W Georgia St, Suite #300, Vancouver, BC V6E 2Y3
        </p>
      </div>
    </div>
  )
}
