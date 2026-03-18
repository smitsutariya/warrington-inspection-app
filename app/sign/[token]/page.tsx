'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
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
    // Decode token to get inspection_id
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
          if (data.tenant_signed_at) { setSigned(true) }
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
      ctx.strokeStyle = '#1a2744'; ctx.lineWidth = 2; ctx.lineCap = 'round'
      ctx.stroke(); ctx.beginPath(); ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
    })
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-400 text-sm">Loading report…</div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card max-w-sm w-full text-center">
        <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
        <p className="text-navy font-medium">{error}</p>
        <p className="text-gray-400 text-sm mt-2">Please contact your building manager for a new link.</p>
      </div>
    </div>
  )

  if (signed) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card max-w-sm w-full text-center">
        <CheckCircle size={40} className="text-green-500 mx-auto mb-4" />
        <h1 className="font-serif text-xl text-navy mb-2">Report Signed</h1>
        <p className="text-gray-500 text-sm">
          Thank you, {inspection?.tenant_name}. Your signature has been recorded. You will receive a copy of the final report once your property manager has also signed.
        </p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="font-serif text-lg tracking-widest text-navy uppercase">Warrington</div>
          <div className="text-xs text-gray-400 tracking-widest uppercase">Residential</div>
        </div>

        <div className="card mb-4">
          <h1 className="font-serif text-xl text-navy mb-1">Condition Inspection Report</h1>
          <p className="text-sm text-gray-500">Please review and sign your inspection report</p>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs space-y-1 text-gray-600">
            <p><span className="font-medium">Property:</span> {inspection?.unit?.property?.name}</p>
            <p><span className="font-medium">Unit:</span> {inspection?.unit?.unit_number}</p>
            <p><span className="font-medium">Tenant:</span> {inspection?.tenant_name}</p>
            <p><span className="font-medium">Inspection Date:</span> {inspection?.inspection_date}</p>
            <p><span className="font-medium">Type:</span> {inspection?.type === 'move_in' ? 'Move-In' : 'Move-Out'}</p>
          </div>
        </div>

        <div className="card mb-4">
          <div className="section-title">Your Statement</div>
          <label className="flex items-start gap-3 mb-3 cursor-pointer">
            <input type="radio" checked={agrees} onChange={() => setAgrees(true)} className="mt-0.5" />
            <span className="text-sm text-gray-700">I agree that this report fairly represents the condition of the rental unit</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="radio" checked={!agrees} onChange={() => setAgrees(false)} className="mt-0.5" />
            <span className="text-sm text-gray-700">I do not agree that this report fairly represents the condition of the unit</span>
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
          <p className="text-xs text-gray-400 mb-3">Sign below using your mouse or finger</p>
          <canvas
            ref={node => { if (node) setupCanvas(node); (canvasRef as any).current = node }}
            width={500}
            height={120}
            className="w-full border border-dashed border-gray-200 rounded-lg bg-gray-50 cursor-crosshair touch-none"
          />
          <button
            onClick={() => {
              const ctx = canvasRef.current?.getContext('2d')
              if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
            }}
            className="text-xs text-gray-400 hover:text-gray-600 mt-2"
          >
            Clear signature
          </button>
        </div>

        <button
          onClick={handleSign}
          disabled={submitting}
          className="w-full btn-teal py-3 text-sm font-medium disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit Signature'}
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">
          By submitting your signature you agree to the statements above. This signature is legally binding under BC Tenancy Regulations.
        </p>
      </div>
    </div>
  )
}
