import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Inspection, InspectionSection, DepositStatement, InspectionPhoto } from '@/types'

const NAVY = [26, 39, 68] as [number, number, number]
const ACCENT = [200, 169, 110] as [number, number, number]
const LIGHT_GRAY = [245, 244, 240] as [number, number, number]
const MID_GRAY = [156, 163, 175] as [number, number, number]
const WHITE = [255, 255, 255] as [number, number, number]

const CODE_LABELS: Record<string, string> = {
  satisfactory: '✓',
  cleaning: 'C',
  damaged: 'D',
  painting: 'P',
  missing: 'M',
  wear_tear: 'W',
  stained: 'S',
}

function addHeader(doc: jsPDF, pageWidth: number) {
  // Navy header bar
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, pageWidth, 22, 'F')

  // Logo text
  doc.setTextColor(...ACCENT)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('WARRINGTON', 14, 10)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(200, 200, 200)
  doc.text('RESIDENTIAL', 14, 15)

  // Report title
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('CONDITION INSPECTION REPORT', pageWidth / 2, 13, { align: 'center' })

  // Reset text color
  doc.setTextColor(40, 40, 40)
}

function addFooter(doc: jsPDF, pageNum: number, totalPages: number, pageWidth: number, pageHeight: number) {
  doc.setFillColor(...LIGHT_GRAY)
  doc.rect(0, pageHeight - 12, pageWidth, 12, 'F')
  doc.setTextColor(...MID_GRAY)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text(`Page ${pageNum} of ${totalPages}`, 14, pageHeight - 4)
  doc.text('Warrington Residential — Condition Inspection Report', pageWidth / 2, pageHeight - 4, { align: 'center' })
  doc.text(new Date().toLocaleDateString('en-CA'), pageWidth - 14, pageHeight - 4, { align: 'right' })
}

function addSectionLabel(doc: jsPDF, label: string, y: number, pageWidth: number): number {
  doc.setFillColor(...NAVY)
  doc.setTextColor(...ACCENT)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.rect(14, y, pageWidth - 28, 6, 'F')
  doc.text(label.toUpperCase(), 17, y + 4.2)
  doc.setTextColor(40, 40, 40)
  return y + 6
}

export async function generateInspectionPDF(
  inspection: Inspection & { unit?: any },
  sections: (InspectionSection & { items?: any[] })[],
  photos: InspectionPhoto[],
  deposit: DepositStatement | null
): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14
  const contentWidth = pageWidth - margin * 2
  const isMoveOut = inspection.type === 'move_out'

  // ── PAGE 1: Important Notice ──────────────────────────────────────────────
  addHeader(doc, pageWidth)
  let y = 30

  doc.setFillColor(255, 245, 225)
  doc.setDrawColor(200, 169, 110)
  doc.roundedRect(margin, y, contentWidth, 72, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...NAVY)
  doc.text('IMPORTANT:', margin + 4, y + 8)

  const importantText = [
    'Failure by the landlord to offer and participate in a condition inspection and give a copy of the inspection report to the tenant will result in the landlord losing right to claim against the tenant\'s Security Deposit and/or Pet Damage Deposit.',
    '',
    'Failure by the tenant to participate in a condition inspection will result in the tenant forfeiting the Security Deposit and/or Pet Damage Deposit to the landlord.',
  ]

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(60, 60, 60)
  let noteY = y + 14
  importantText.forEach(line => {
    if (!line) { noteY += 3; return }
    const wrapped = doc.splitTextToSize(line, contentWidth - 8)
    doc.text(wrapped, margin + 4, noteY)
    noteY += wrapped.length * 4 + 1
  })

  const notices = [
    '1. This report must be completed and signed by the landlord and the tenant at the beginning and end of the tenancy.',
    '2. Both the landlord and the tenant must sign the report on move-in and again on move-out.',
    '3. A copy of the move-in report must be given to the tenant within 7 days following the inspection.',
    '4. A copy of the move-out report must be given to the tenant within 15 days after the later of: (a) the date the inspection was complete, and (b) the date the landlord received the tenant\'s forwarding address in writing.',
  ]

  y += 80
  notices.forEach(notice => {
    const wrapped = doc.splitTextToSize(notice, contentWidth)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(60, 60, 60)
    doc.text(wrapped, margin, y)
    y += wrapped.length * 4 + 2
  })

  // ── PAGE 1: Part I — Tenancy Info ─────────────────────────────────────────
  y += 4
  y = addSectionLabel(doc, 'Part I — Tenancy Information', y, pageWidth)
  y += 4

  const property = inspection.unit?.property
  const infoRows = [
    ['Tenant(s) Full Name(s)', inspection.tenant_name ?? ''],
    ['Landlord\'s Name', property?.landlord_name ?? 'Warrington Residential'],
    ['Landlord\'s Address for Service', property?.landlord_address ?? ''],
    ['Address of Rental Unit Inspected', `Unit ${inspection.unit?.unit_number}, ${property?.address}, ${property?.city}, ${property?.province}`],
    ['Possession Date', inspection.possession_date ?? ''],
    ['Move-In Inspection Date', inspection.inspection_date ?? ''],
    ['End of Tenancy Date', inspection.end_of_tenancy_date ?? ''],
    ['Move-Out Inspection Date', isMoveOut ? (inspection.inspection_date ?? '') : ''],
    ['Res. Mgr / Inspecting', inspection.resident_manager_name ?? ''],
    ['Property Manager', inspection.property_manager_name ?? ''],
  ]

  infoRows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...NAVY)
    doc.text(label + ':', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(40, 40, 40)
    doc.text(String(value), margin + 60, y)
    doc.setDrawColor(220, 220, 220)
    doc.line(margin, y + 1.5, pageWidth - margin, y + 1.5)
    y += 7
  })

  // ── PAGE 2+: Part II — Living Areas ──────────────────────────────────────
  doc.addPage()
  addHeader(doc, pageWidth)
  y = 30

  y = addSectionLabel(doc, 'Part II — Living Areas Condition', y, pageWidth)
  y += 3

  // Condition code legend
  doc.setFillColor(240, 240, 235)
  doc.rect(margin, y, contentWidth, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...NAVY)
  doc.text('✓ = Satisfactory  |  C = Needs Cleaning  |  D = Damaged  |  P = Needs Painting  |  M = Missing  |  W = Normal Wear & Tear  |  S = Stained', margin + 2, y + 4.5)
  y += 10

  const responsesMap = Object.fromEntries(
    sections.flatMap(s => s.items ?? []).map(item => [item.id, item.response])
  )

  for (const section of sections) {
    const items = section.items ?? []
    if (!items.length) continue

    // Check if we need a new page
    if (y > pageHeight - 50) {
      doc.addPage()
      addHeader(doc, pageWidth)
      y = 30
    }

    // Section header
    doc.setFillColor(...LIGHT_GRAY)
    doc.setDrawColor(200, 200, 200)
    doc.rect(margin, y, contentWidth, 6, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...NAVY)
    doc.text(section.name, margin + 2, y + 4.2)
    y += 6

    // Column headers
    const col1W = isMoveOut ? 55 : 70
    const commentW = isMoveOut ? contentWidth - 55 - 28 - 28 : contentWidth - 70 - 30
    const codeW = isMoveOut ? 28 : 30

    doc.setFillColor(250, 250, 248)
    doc.rect(margin, y, contentWidth, 5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(...MID_GRAY)
    doc.text('Item', margin + 2, y + 3.5)
    doc.text('Comment', margin + col1W + 2, y + 3.5)
    if (isMoveOut) {
      doc.text('Move-In', margin + col1W + commentW + 2, y + 3.5)
      doc.text('Move-Out', margin + col1W + commentW + codeW + 2, y + 3.5)
    } else {
      doc.text('Code', margin + col1W + commentW + 2, y + 3.5)
    }
    y += 5

    for (const item of items) {
      if (y > pageHeight - 30) {
        doc.addPage()
        addHeader(doc, pageWidth)
        y = 30
      }

      const resp = item.response
      const moveInCode = resp?.move_in_code ? CODE_LABELS[resp.move_in_code] ?? '' : ''
      const moveOutCode = resp?.move_out_code ? CODE_LABELS[resp.move_out_code] ?? '' : ''
      const comment = resp?.move_out_comment ?? resp?.move_in_comment ?? ''

      const rowH = 6
      const even = items.indexOf(item) % 2 === 0

      if (even) {
        doc.setFillColor(252, 252, 250)
        doc.rect(margin, y, contentWidth, rowH, 'F')
      }

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(60, 60, 60)
      doc.text(item.name, margin + 2, y + 4)

      if (comment) {
        const clipped = comment.length > 60 ? comment.slice(0, 57) + '…' : comment
        doc.setTextColor(100, 100, 100)
        doc.text(clipped, margin + col1W + 2, y + 4)
      }

      // Code badges
      if (moveInCode) {
        const codeX = margin + col1W + commentW + 4
        doc.setFillColor(isMoveOut ? 230, 240, 255 : 220, 245, 230)
        doc.roundedRect(codeX, y + 1, 10, 4, 1, 1, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(isMoveOut ? 24, 95, 165 : 15, 110, 86)
        doc.text(moveInCode, codeX + 5, y + 4, { align: 'center' })
      }

      if (isMoveOut && moveOutCode) {
        const codeX = margin + col1W + commentW + codeW + 4
        const isDamaged = resp?.move_out_code === 'damaged'
        doc.setFillColor(isDamaged ? 255 : 255, isDamaged ? 220 : 245, isDamaged ? 220 : 220)
        doc.roundedRect(codeX, y + 1, 10, 4, 1, 1, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(isDamaged ? 180 : 180, isDamaged ? 30 : 120, isDamaged ? 30 : 20)
        doc.text(moveOutCode, codeX + 5, y + 4, { align: 'center' })
      }

      doc.setDrawColor(235, 235, 235)
      doc.line(margin, y + rowH, margin + contentWidth, y + rowH)
      doc.setTextColor(40, 40, 40)
      y += rowH
    }

    // Initials row
    doc.setFillColor(245, 244, 240)
    doc.rect(margin, y, contentWidth, 7, 'F')
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7)
    doc.setTextColor(...MID_GRAY)
    doc.text('Move-In Initials — Landlord: _____________  Tenant: _____________', margin + 2, y + 4.5)
    if (isMoveOut) {
      doc.text('Move-Out Initials — Landlord: _____________  Tenant: _____________', margin + contentWidth / 2 + 2, y + 4.5)
    }
    y += 12
  }

  // ── Keys & Controls ───────────────────────────────────────────────────────
  if (y > pageHeight - 60) {
    doc.addPage()
    addHeader(doc, pageWidth)
    y = 30
  }

  y = addSectionLabel(doc, 'Keys & Controls', y, pageWidth)
  y += 4

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Item', '# Given (Move-In)', '# Returned (Move-Out)', 'Code / Notes']],
    body: [
      ['Suite Keys', String(inspection.suite_keys_given), String(inspection.suite_keys_returned), ''],
      ['Building Keys', String(inspection.building_keys_given), String(inspection.building_keys_returned), ''],
      ['Mailbox Keys', String(inspection.mailbox_keys_given), String(inspection.mailbox_keys_returned), ''],
      ['FOB #1', '', '', inspection.fob1_code ?? ''],
      ['FOB #2', '', '', inspection.fob2_code ?? ''],
      ['Parking Stall #', inspection.parking_stall ?? '', '', ''],
      ['Parking Decal #', inspection.parking_decal ?? '', '', ''],
      ['Locker #', inspection.locker_number ?? '', '', ''],
      ['Keys Missing at Move-Out?', '', '', inspection.keys_missing_at_moveout ? 'YES' : 'No'],
    ],
    headStyles: { fillColor: NAVY, textColor: 255, fontSize: 7.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5 },
    alternateRowStyles: { fillColor: [252, 252, 250] },
    theme: 'grid',
  })

  y = (doc as any).lastAutoTable.finalY + 6

  // ── Smoke Alarms ──────────────────────────────────────────────────────────
  doc.setFillColor(255, 245, 225)
  doc.setDrawColor(200, 169, 110)
  doc.roundedRect(margin, y, contentWidth, 12, 1, 1, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...NAVY)
  doc.text('Smoke Alarm(s) Tested:', margin + 3, y + 5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  doc.text(`Move-In: ${inspection.smoke_alarm_move_in ?? 'Functioning'}`, margin + 45, y + 5)
  if (isMoveOut) {
    doc.text(`Move-Out: ${inspection.smoke_alarm_move_out ?? 'Functioning'}`, margin + 90, y + 5)
  }
  y += 18

  // ── PAGE: Part III / IV — Signatures ─────────────────────────────────────
  doc.addPage()
  addHeader(doc, pageWidth)
  y = 30

  if (isMoveOut && deposit) {
    // ── Security Deposit Statement ─────────────────────────────────────────
    y = addSectionLabel(doc, 'Security Deposit Statement', y, pageWidth)
    y += 4

    const fmt = (n: number) => `$${Number(n ?? 0).toFixed(2)}`
    const totalCharges = ['unpaid_rent','liquidated_damages','carpet_cleaning','window_cover_cleaning','suite_cleaning','painting','repair_replacement','key_fob_replacement','pet_damage','other_charges']
      .reduce((s, k) => s + Number((deposit as any)[k] ?? 0), 0)
    const totalDeposits = ['security_deposit','key_deposit','accrued_interest','other_deposit']
      .reduce((s, k) => s + Number((deposit as any)[k] ?? 0), 0)
    const balance = totalDeposits - totalCharges

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Charges to Tenant', 'Amount', 'Deposits Received', 'Amount']],
      body: [
        ['Unpaid Rent / Late Fees', fmt(deposit.unpaid_rent), 'Security Deposit', fmt(deposit.security_deposit)],
        ['Liquidated Damages', fmt(deposit.liquidated_damages), 'Key Deposit', fmt(deposit.key_deposit)],
        ['Carpet Cleaning', fmt(deposit.carpet_cleaning), 'Accrued Interest', fmt(deposit.accrued_interest)],
        ['Window Cover Cleaning', fmt(deposit.window_cover_cleaning), 'Other', fmt(deposit.other_deposit)],
        ['Suite Cleaning', fmt(deposit.suite_cleaning), '', ''],
        ['Painting', fmt(deposit.painting), '', ''],
        ['Repair / Replacement', fmt(deposit.repair_replacement), '', ''],
        ['Key/FOB/Remote Replacement', fmt(deposit.key_fob_replacement), '', ''],
        ['Pet Damage', fmt(deposit.pet_damage), '', ''],
        ['Other Charges', fmt(deposit.other_charges), '', ''],
        [{ content: 'A. Balance Due to Landlord', styles: { fontStyle: 'bold', fillColor: LIGHT_GRAY } }, { content: fmt(totalCharges), styles: { fontStyle: 'bold', fillColor: LIGHT_GRAY } }, { content: 'B. Total Deposits', styles: { fontStyle: 'bold', fillColor: LIGHT_GRAY } }, { content: fmt(totalDeposits), styles: { fontStyle: 'bold', fillColor: LIGHT_GRAY } }],
      ],
      headStyles: { fillColor: NAVY, textColor: 255, fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5 },
      columnStyles: { 1: { halign: 'right' }, 3: { halign: 'right' } },
      theme: 'grid',
    })

    y = (doc as any).lastAutoTable.finalY + 4

    // Balance box
    const balColor: [number, number, number] = balance >= 0 ? [14, 124, 107] : [163, 45, 45]
    doc.setFillColor(...NAVY)
    doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...ACCENT)
    doc.text(balance >= 0 ? 'Refund Due to Tenant:' : 'Amount Owing to Landlord:', margin + 4, y + 9)
    doc.setTextColor(...(balance >= 0 ? [159, 225, 203] as [number,number,number] : [240, 149, 149] as [number,number,number]))
    doc.text(`$${Math.abs(balance).toFixed(2)}`, pageWidth - margin - 4, y + 9, { align: 'right' })
    y += 20
  }

  // ── Part III: Move-In Inspection ─────────────────────────────────────────
  y = addSectionLabel(doc, `Part ${isMoveOut ? 'IV' : 'III'} — ${isMoveOut ? 'End' : 'Start'} of Tenancy, Move-${isMoveOut ? 'Out' : 'In'} Inspection`, y, pageWidth)
  y += 4

  const agreement = inspection.tenant_agrees !== false
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(60, 60, 60)

  const agreeText = agreement
    ? `[✓] ${inspection.tenant_name ?? '_______'}, agree that this report fairly represents the condition of the rental unit.`
    : `[✓] ${inspection.tenant_name ?? '_______'}, do NOT agree that this report fairly represents the condition of the rental unit.`
  const wrapped = doc.splitTextToSize(agreeText, contentWidth)
  doc.text(wrapped, margin, y)
  y += wrapped.length * 5 + 3

  if (!agreement && inspection.tenant_disagreement_reason) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7.5)
    doc.setTextColor(120, 60, 60)
    const disagreementWrapped = doc.splitTextToSize(`Reason: ${inspection.tenant_disagreement_reason}`, contentWidth)
    doc.text(disagreementWrapped, margin, y)
    y += disagreementWrapped.length * 4.5 + 3
  }

  if (isMoveOut && inspection.forwarding_address) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(60, 60, 60)
    doc.text(`Forwarding Address: ${inspection.forwarding_address}`, margin, y)
    y += 8
  }

  // Signature blocks
  const sigBlockW = (contentWidth - 10) / 2
  const sigBoxH = 28

  const drawSigBlock = (label: string, name: string, signedAt: string | undefined, sigData: string | undefined, x: number, blockY: number) => {
    doc.setFillColor(250, 250, 248)
    doc.setDrawColor(200, 200, 200)
    doc.roundedRect(x, blockY, sigBlockW, sigBoxH, 2, 2, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...NAVY)
    doc.text(label, x + 3, blockY + 6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(100, 100, 100)
    doc.text(name, x + 3, blockY + 12)

    if (signedAt) {
      doc.setTextColor(14, 124, 107)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.text(`✓ Signed ${new Date(signedAt).toLocaleDateString('en-CA')}`, x + 3, blockY + 20)
    } else {
      doc.setTextColor(180, 180, 180)
      doc.setFontSize(7)
      doc.text('X ______________________________', x + 3, blockY + 22)
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(160, 160, 160)
    doc.text('Date: _________________', x + 3, blockY + sigBoxH - 3)
  }

  y += 4
  drawSigBlock('Tenant Signature', inspection.tenant_name ?? '', inspection.tenant_signed_at, inspection.tenant_signature_data, margin, y)
  drawSigBlock(`Landlord / PM Signature`, inspection.property_manager_name ?? '', inspection.landlord_signed_at, inspection.landlord_signature_data, margin + sigBlockW + 10, y)
  y += sigBoxH + 8

  // Add actual signature images if available
  if (inspection.tenant_signature_data && inspection.tenant_signed_at) {
    try {
      doc.addImage(inspection.tenant_signature_data, 'PNG', margin + 2, y - sigBoxH - 4, 50, 14)
    } catch {}
  }

  // ── Photo pages ───────────────────────────────────────────────────────────
  if (photos.length > 0) {
    const photosPerPage = 4
    const pages = Math.ceil(photos.length / photosPerPage)

    for (let p = 0; p < pages; p++) {
      doc.addPage()
      addHeader(doc, pageWidth)
      let py = 30

      py = addSectionLabel(doc, `Photo Documentation — Page ${p + 1} of ${pages}`, py, pageWidth)
      py += 4

      const pagePhotos = photos.slice(p * photosPerPage, (p + 1) * photosPerPage)
      const photoW = (contentWidth - 5) / 2
      const photoH = 65

      pagePhotos.forEach((photo, i) => {
        const col = i % 2
        const row = Math.floor(i / 2)
        const px = margin + col * (photoW + 5)
        const photoY = py + row * (photoH + 14)

        // Photo placeholder (actual image embedding would need fetch)
        doc.setFillColor(...LIGHT_GRAY)
        doc.setDrawColor(200, 200, 200)
        doc.roundedRect(px, photoY, photoW, photoH, 2, 2, 'FD')

        // Try to embed image
        if (photo.url) {
          try {
            // Note: in production, images need to be fetched and converted to base64
            doc.addImage(photo.url, 'JPEG', px + 1, photoY + 1, photoW - 2, photoH - 8)
          } catch {
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(7)
            doc.setTextColor(...MID_GRAY)
            doc.text('[Photo]', px + photoW / 2, photoY + photoH / 2, { align: 'center' })
          }
        }

        // Label
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.5)
        doc.setTextColor(...NAVY)
        doc.text(photo.label ?? photo.item_name ?? 'Photo', px + 1, photoY + photoH + 4)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6.5)
        doc.setTextColor(...MID_GRAY)
        doc.text(photo.section_name ?? '', px + 1, photoY + photoH + 8)
        doc.text(new Date(photo.created_at).toLocaleString('en-CA'), px + photoW - 1, photoY + photoH + 8, { align: 'right' })
      })
    }
  }

  // ── Add page numbers ──────────────────────────────────────────────────────
  const totalPages = doc.internal.pages.length - 1
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    addFooter(doc, i, totalPages, pageWidth, pageHeight)
  }

  return doc.output('blob')
}
