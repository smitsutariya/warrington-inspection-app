'use client'
import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { CheckCircle, Mail, Lock } from 'lucide-react'
import { usePDFGeneration } from '@/hooks/usePDFGeneration'
import { usePDFGeneration } from '@/hooks/usePDFGeneration'

export default function SignaturePad({ inspection, isLocked, onComplete }: any) {
  const supabase = createClient()
  const router = useRouter()
  const tenantCanvasRef = useRef<HTMLCanvasElement>(null)
  const landlordCanvasRef = useRef<HTMLCanvasElement>(null)
  const [tenantSigned, setTenantSigned] = useState(!!inspection.tenant_signed_at)
  const [landlordSigned, setLandlordSigned] = useState(!!inspection.landlord_signed_at)
  const [tenantAgrees, setTenantAgrees] = useState(inspection.tenant_agrees ?? true)
  const [tenantDisagreement, setTenantDisagreement] = useState(inspection.tenant_disagreement_reason ?? '')
  const [forwardingAddress, setForwardingAddress] = useState(inspection.forwarding_address ?? '')
  const [emailMode, setEmailMode] = useState(false)
  const [tenantEmail, setTenantEmail] = useState(inspection.tenant_email ?? '')
  const [locking, setLocking] = useState(false)
  const [linkSent, setLinkSent] = useState(false)

  // Simple canvas drawing
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
      ctx.strokeStyle = '#1a2744'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
    })
    canvas.addEventListener('touchmove', e => {
      e.preventDefault()
      const touch = e.touches[0]
      const rect = canvas.getBoundingClientRect()
      ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top)
      ctx.strokeStyle = '#1a2744'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top)
    }, { passive: false })
  }

  const clearCanvas = (ref: React.RefObject<HTMLCanvasElement>) => {
    const ctx = ref.current?.getContext('2d')
    if (ctx && ref.current) ctx.clearRect(0, 0, ref.current.width, ref.current.height)
  }

  const captureSignature = (ref: React.RefObject<HTMLCanvasElement>) =>
    ref.current?.toDataURL('image/png') ?? ''

  const handleTenantSign = async () => {
    const sig = captureSignature(tenantCanvasRef)
    await supabase.from('inspections').update({
      tenant_signed_at: new Date().toISOString(),
      tenant_signature_data: sig,
      tenant_agrees: tenantAgrees,
      tenant_disagreement_reason: tenantAgrees ? null : tenantDisagreement,
      forwarding_address: forwardingAddress,
      status: 'pending_pm',
    }).eq('id', inspection.id)

    await supabase.from('audit_logs').insert({
      inspection_id: inspection.id,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      action: 'tenant_signed',
      details: { agrees: tenantAgrees },
    })
    setTenantSigned(true)
    router.refresh()
  }

  const handleLandlordSign = async () => {
    const sig = captureSignature(landlordCanvasRef)
    await supabase.from('inspections').update({
      landlord_signed_at: new Date().toISOString(),
      landlord_signature_data: sig,
      status: 'complete',
      locked: true,
    }).eq('id', inspection.id)

    await supabase.from('audit_logs').insert({
      inspection_id: inspection.id,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      action: 'landlord_signed',
      details: {},
    })
    setLandlordSigned(true)
    router.refresh()
  }

  const { generateAndStore, generating } = usePDFGeneration()

  const handleLockAndGenerate = async () => {
    setLocking(true)
    await generateAndStore(inspection.id)
    setLocking(false)
    router.push('/documents')
  }

  const handleSendLink = async () => {
    // Call API route to send signing email
    await fetch('/api/inspections/send-signing-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inspection_id: inspection.id, email: tenantEmail }),
    })
    setLinkSent(true)
  }

  const bothSigned = tenantSigned && landlordSigned

  return (
    <div className="max-w-2xl space-y-5">
      {bothSigned && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">Both parties have signed</p>
            <p className="text-xs text-green-600 mt-0.5">Ready to lock report and generate PDF</p>
          </div>
          <button
            onClick={handleLockAndGenerate}
            disabled={locking}
            className="ml-auto btn-teal flex items-center gap-2 text-sm"
          >
            <Lock size={14} />
            {locking ? 'Generating…' : 'Lock & Generate PDF'}
          </button>
        </div>
      )}

      {/* Tenant Signature */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-navy">Tenant Signature</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {inspection.tenant_name} — Part III / IV
            </p>
          </div>
          {tenantSigned && (
            <span className="badge-success flex items-center gap-1">
              <CheckCircle size={11} /> Signed
            </span>
          )}
        </div>

        {!tenantSigned && !isLocked && (
          <>
            {/* Agree / Disagree */}
            <div className="mb-4">
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" checked={tenantAgrees} onChange={() => setTenantAgrees(true)} />
                  I agree this report fairly represents the condition of the rental unit
                </label>
              </div>
              <div className="flex items-start gap-2 mt-2">
                <input type="radio" checked={!tenantAgrees} onChange={() => setTenantAgrees(false)} className="mt-1" />
                <label className="flex-1 text-sm">
                  I do not agree — reason:
                  {!tenantAgrees && (
                    <textarea
                      className="input mt-1 text-xs"
                      value={tenantDisagreement}
                      onChange={e => setTenantDisagreement(e.target.value)}
                      placeholder="Describe disagreement…"
                    />
                  )}
                </label>
              </div>
            </div>

            {/* Forwarding address (move-out) */}
            {inspection.type === 'move_out' && (
              <div className="mb-4">
                <label className="label">Forwarding Address</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Apt #, Street, City, Province, Postal Code"
                  value={forwardingAddress}
                  onChange={e => setForwardingAddress(e.target.value)}
                />
              </div>
            )}

            {/* Signature options */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setEmailMode(false)}
                className={`text-xs px-3 py-1.5 rounded-lg border ${!emailMode ? 'bg-navy text-white border-navy' : 'border-gray-200 text-gray-500'}`}
              >
                Sign here (in-person)
              </button>
              <button
                onClick={() => setEmailMode(true)}
                className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${emailMode ? 'bg-navy text-white border-navy' : 'border-gray-200 text-gray-500'}`}
              >
                <Mail size={11} /> Send link via email
              </button>
            </div>

            {!emailMode ? (
              <>
                <canvas
                  ref={node => { if (node) { setupCanvas(node) } tenantCanvasRef.current = node }}
                  width={500}
                  height={120}
                  className="w-full border border-dashed border-gray-200 rounded-lg bg-gray-50 cursor-crosshair"
                />
                <div className="flex justify-between mt-2">
                  <button onClick={() => clearCanvas(tenantCanvasRef)} className="text-xs text-gray-400 hover:text-gray-600">
                    Clear
                  </button>
                  <button onClick={handleTenantSign} className="btn-teal text-xs px-4">
                    Confirm Tenant Signature
                  </button>
                </div>
              </>
            ) : (
              <div className="flex gap-2">
                <input
                  type="email"
                  className="input flex-1"
                  value={tenantEmail}
                  onChange={e => setTenantEmail(e.target.value)}
                  placeholder="tenant@email.com"
                />
                <button onClick={handleSendLink} className="btn-secondary text-xs px-4">
                  {linkSent ? '✓ Sent!' : 'Send Link'}
                </button>
              </div>
            )}
          </>
        )}

        {tenantSigned && (
          <div className="bg-green-50 rounded-lg p-3 text-xs text-green-700">
            Signed on {new Date(inspection.tenant_signed_at).toLocaleString()}
            {inspection.tenant_agrees === false && (
              <p className="mt-1 text-amber-600">Tenant disagreement noted: {inspection.tenant_disagreement_reason}</p>
            )}
          </div>
        )}
      </div>

      {/* Landlord / PM Signature */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-navy">Property Manager Signature</h3>
            <p className="text-xs text-gray-400 mt-0.5">{inspection.property_manager_name}</p>
          </div>
          {landlordSigned && (
            <span className="badge-success flex items-center gap-1">
              <CheckCircle size={11} /> Signed
            </span>
          )}
        </div>

        {!landlordSigned && !isLocked && tenantSigned && (
          <>
            <canvas
              ref={node => { if (node) setupCanvas(node); landlordCanvasRef.current = node }}
              width={500}
              height={120}
              className="w-full border border-dashed border-gray-200 rounded-lg bg-gray-50 cursor-crosshair"
            />
            <div className="flex justify-between mt-2">
              <button onClick={() => clearCanvas(landlordCanvasRef)} className="text-xs text-gray-400 hover:text-gray-600">
                Clear
              </button>
              <button onClick={handleLandlordSign} className="btn-teal text-xs px-4">
                Confirm PM Signature
              </button>
            </div>
          </>
        )}

        {!tenantSigned && !landlordSigned && (
          <p className="text-sm text-gray-400 text-center py-4">
            Awaiting tenant signature before PM can sign
          </p>
        )}

        {landlordSigned && (
          <div className="bg-green-50 rounded-lg p-3 text-xs text-green-700">
            Signed on {new Date(inspection.landlord_signed_at).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  )
}
