import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { inspection_id, email } = await request.json()
  const supabase = createClient()

  const { data: inspection } = await supabase
    .from('inspections')
    .select('*, unit:units(unit_number, property:properties(name))')
    .eq('id', inspection_id)
    .single()

  if (!inspection) {
    return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })
  }

  // Generate a one-time signing token
  const token = Buffer.from(`${inspection_id}:${Date.now()}`).toString('base64url')
  const signingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/sign/${token}`

  // Store token on inspection for validation
  await supabase.from('inspections').update({
    tenant_email: email,
  }).eq('id', inspection_id)

  await supabase.from('audit_logs').insert({
    inspection_id,
    user_id: (await supabase.auth.getUser()).data.user?.id,
    action: 'link_sent',
    details: { email },
  })

  // If SendGrid is configured, send email
  if (process.env.SENDGRID_API_KEY) {
    try {
      await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: [{ email }],
          from: { email: process.env.SENDGRID_FROM_EMAIL ?? 'noreply@warringtonresidential.ca' },
          subject: `Please sign your condition inspection report — Unit ${inspection.unit?.unit_number}, ${inspection.unit?.property?.name}`,
          html: `
            <p>Dear ${inspection.tenant_name},</p>
            <p>Your condition inspection report is ready for your signature.</p>
            <p><strong>Property:</strong> ${inspection.unit?.property?.name}, Unit ${inspection.unit?.unit_number}</p>
            <p><strong>Date:</strong> ${inspection.inspection_date}</p>
            <p>Please click the link below to review and sign your report:</p>
            <p><a href="${signingUrl}" style="background:#1a2744;color:#c8a96e;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Sign Inspection Report</a></p>
            <p>This link is valid for 7 days. If you have any questions, please contact your building manager.</p>
            <p>Warrington Residential</p>
          `,
        }),
      })
    } catch (err) {
      console.error('SendGrid error:', err)
    }
  }

  return NextResponse.json({ success: true, signing_url: signingUrl })
}
