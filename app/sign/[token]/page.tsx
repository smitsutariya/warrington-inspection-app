'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { CheckCircle, AlertCircle } from 'lucide-react'

export default function SignPage({ params }: { params: { token: string } }) {
  const supabase = createClient()
  const [inspection, setInspection] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [signed, setSigned] = useState(false)
  const [agrees, setAgrees] = useState(true)
  const [disagreement, setDisagreement] = useState('')
  const [forwarding, setForwarding] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    try {
      const decoded = atob(params.token.replace(/-/g, '+').replace(/_/g, '/'))
      const [inspectionId] = decoded.split(':')
      supabase
        .from('inspections')
        .select('*, unit:units(unit_number, property:properties(name, address))')
        .eq('id', inspectionId)
        .single()
        .then(({ data, error: err }) => {
          if (err || !data) { setError('Report not found or link has expired.'); setLoading(false); return }
          if (data.tenant_signed_at) setSigned(true)
          setInspection(data)
          setLoading(false)
        })
    } catch {
      setError('Invalid signing link.')
      setLoading(false)
    }
  }, [params.token])

  const setupCanvas = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let drawing = false
    canvas.addEventListener('mousedown', () => { drawing = true })
    canvas.addEventListener('mouseup', () => { drawing = false })
    canvas.addEventListener('mouseleave', () => { drawing = false })
    canvas.addEventListener('mousemove', e => {
      if (!drawing) return
      const rect = canvas.getBoundingClientRect()
      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
      ctx.strokeStyle = '#123C3F'; ctx.lineWidth = 2; ctx.lineCap = 'round'
      ctx.stroke(); ctx.beginPath(); ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
    })
    canvas.addEventListener('touchmove', e => {
      e.preventDefault()
      const touch = e.touches[0]
      const rect = canvas.getBoundingClientRect()
      ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top)
      ctx.strokeStyle = '#123C3F'; ctx.lineWidth = 2; ctx.lineCap = 'round'
      ctx.stroke(); ctx.beginPath(); ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top)
    }, { passive: false })
  }

  const handleSign = async () => {
    if (!inspection) return
    setSubmitting(true)
    const sig = canvasRef.current?.toDataURL('image/png') ?? ''
    await supabase.from('inspections').update({
      tenant_signed_at: new Date().toISOString(),
      tenant_signature_data: sig,
      tenant_agrees: agrees,
      tenant_disagreement_reason: agrees ? null : disagreement,
      forwarding_address: forwarding || null,
      status: 'pending_pm',
    }).eq('id', inspection.id)
    await supabase.from('audit_logs').insert({
      inspection_id: inspection.id,
      action: 'tenant_signed',
      details: { method: 'remote_link', agrees },
    })
    setSigned(true)
    setSubmitting(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F4F5F7' }}>
      <p style={{ color: '#4d7073', fontFamily: 'Satoshi, sans-serif', fontSize: 14 }}>Loading report…</p>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F4F5F7' }}>
      <div className="card max-w-sm w-full text-center">
        <AlertCircle size={32} className="mx-auto mb-3" style={{ color: '#991b1b' }} />
        <p style={{ fontFamily: 'Lora, serif', color: '#123C3F', fontSize: 16 }}>{error}</p>
        <p className="text-sm mt-2" style={{ color: '#4d7073' }}>Please contact your building manager for a new link.</p>
      </div>
    </div>
  )

  if (signed) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F4F5F7' }}>
      <div className="card max-w-sm w-full text-center">
        <div className="mb-4 flex justify-center">
          <Image src="/brand/logo-light-bg.jpg" alt="Warrington Residential" width={160} height={52} className="object-contain" />
        </div>
        <CheckCircle size={40} className="mx-auto mb-4" style={{ color: '#00A2AF' }} />
        <h1 style={{ fontFamily: 'Lora, serif', fontSize: 20, color: '#123C3F', marginBottom: 8 }}>Report Signed</h1>
        <p className="text-sm" style={{ color: '#4d7073', fontFamily: 'Satoshi, sans-serif' }}>
          Thank you, {inspection?.tenant_name}. Your signature has been recorded. You will receive a copy of the final report once your property manager has also signed.
        </p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: '#F4F5F7' }}>
      <div className="max-w-lg mx-auto">
        {/* Header with logo */}
        <div className="text-center mb-6">
          <Image
            src="/brand/logo-light-bg.jpg"
            alt="Warrington Residential"
            width={180}
            height={60}
            className="mx-auto object-contain"
          />
        </div>

        <div className="card mb-4">
          <h1 style={{ fontFamily: 'Lora, serif', fontSize: 20, color: '#123C3F', marginBottom: 4 }}>
            Condition Inspection Report
          </h1>
          <p className="text-sm mb-4" style={{ color: '#4d7073' }}>Please review and sign your inspection report</p>

          <div className="p-3 rounded-lg text-xs space-y-1" style={{ background: '#F4F5F7', color: '#4d7073' }}>
            <p><span className="font-medium" style={{ color: '#123C3F' }}>Property:</span> {inspection?.unit?.property?.name}</p>
            <p><span className="font-medium" style={{ color: '#123C3F' }}>Unit:</span> {inspection?.unit?.unit_number}</p>
            <p><span className="font-medium" style={{ color: '#123C3F' }}>Tenant:</span> {inspection?.tenant_name}</p>
            <p><span className="font-medium" style={{ color: '#123C3F' }}>Date:</span> {inspection?.inspection_date}</p>
            <p><span className="font-medium" style={{ color: '#123C3F' }}>Type:</span> {inspection?.type === 'move_in' ? 'Move-In' : 'Move-Out'}</p>
          </div>
        </div>

        <div className="card mb-4">
          <div className="section-title">Your Statement</div>
          <label className="flex items-start gap-3 mb-3 cursor-pointer">
            <input type="radio" checked={agrees} onChange={() => setAgrees(true)} className="mt-0.5" />
            <span className="text-sm" style={{ color: '#123C3F' }}>I agree that this report fairly represents the condition of the rental unit</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="radio" checked={!agrees} onChange={() => setAgrees(false)} className="mt-0.5" />
            <span className="text-sm" style={{ color: '#123C3F' }}>I do not agree that this report fairly represents the condition of the unit</span>
          </label>
          {!agrees && (
            <textarea
              className="input mt-3 text-sm"
              rows={3}
              placeholder="Please describe your disagreement…"
              value={disagreement}
              onChange={e => setDisagreement(e.target.value)}
            />
          )}
        </div>

        {inspection?.type === 'move_out' && (
          <div className="card mb-4">
            <div className="section-title">Forwarding Address</div>
            <input
              type="text"
              className="input text-sm"
              placeholder="Apt #, Street Address, City, Province, Postal Code"
              value={forwarding}
              onChange={e => setForwarding(e.target.value)}
            />
          </div>
        )}

        <div className="card mb-4">
          <div className="section-title">Your Signature</div>
          <p className="text-xs mb-3" style={{ color: '#4d7073' }}>Sign below using your mouse or finger</p>
          <canvas
            ref={node => { if (node) setupCanvas(node); (canvasRef as any).current = node }}
            width={500}
            height={120}
            className="w-full rounded-lg touch-none"
            style={{ border: '1.5px dashed rgba(18,60,63,0.2)', background: '#F4F5F7', cursor: 'crosshair' }}
          />
          <button
            onClick={() => {
              const ctx = canvasRef.current?.getContext('2d')
              if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
            }}
            className="text-xs mt-2"
            style={{ color: '#4d7073' }}
          >
            Clear signature
          </button>
        </div>

        <button
          onClick={handleSign}
          disabled={submitting}
          className="w-full py-3 rounded-md text-sm font-medium disabled:opacity-50"
          style={{ background: '#00A2AF', color: '#fff', fontFamily: 'Satoshi, sans-serif' }}
        >
          {submitting ? 'Submitting…' : 'Submit Signature'}
        </button>

        <p className="text-center text-xs mt-4" style={{ color: '#4d7073', fontFamily: 'Satoshi, sans-serif' }}>
          By submitting your signature you agree to the statements above. This signature is legally binding under BC Tenancy Regulations.
        </p>

        <div className="text-center mt-6">
          <Image src="/brand/logo-light-bg.jpg" alt="Warrington Residential" width={100} height={34} className="mx-auto object-contain opacity-40" />
          <p className="text-xs mt-1" style={{ color: '#4d7073', fontFamily: 'Satoshi, sans-serif' }}>
            1030 W Georgia St, Suite #300, Vancouver, BC V6E 2Y3
          </p>
        </div>
      </div>
    </div>
  )
}
