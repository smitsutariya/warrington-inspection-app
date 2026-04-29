'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const CASCADES: [number,number,number] = [18, 60, 63]
const PACIFIC:  [number,number,number] = [27, 91, 95]
const CALYPSO:  [number,number,number] = [0, 162, 175]
const CHALK:    [number,number,number] = [225, 229, 238]
const SILVER:   [number,number,number] = [244, 245, 247]
const WHITE:    [number,number,number] = [255, 255, 255]
const MGRAY:    [number,number,number] = [77, 112, 115]

const CODE: Record<string, string> = {
  satisfactory: 'OK', cleaning: 'C', damaged: 'D',
  painting: 'P', missing: 'M', wear_tear: 'W', stained: 'S',
}

// Load logo from public folder at runtime — avoids black-background embed issue
async function loadLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch('/brand/logo-sidebar.jpg')
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const b64 = (reader.result as string).split(',')[1]
        resolve(b64)
      }
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export function usePDFGeneration() {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const generateAndStore = async (inspectionId: string) => {
    setGenerating(true)
    setError(null)

    try {
      const insp_res = await supabase
        .from('inspections')
        .select('*, unit:units(unit_number, property:properties(*))')
        .eq('id', inspectionId)
        .single()
      const inspection = insp_res.data
      if (!inspection) throw new Error('Inspection not found')

      const isMoveOut = inspection.type === 'move_out'

      // For move-out: fetch linked move-in responses
      let moveInMap: Record<string, any> = {}
      if (isMoveOut && inspection.move_in_inspection_id) {
        const { data: miResps } = await supabase
          .from('inspection_responses')
          .select('*')
          .eq('inspection_id', inspection.move_in_inspection_id)
        moveInMap = Object.fromEntries((miResps ?? []).map((r: any) => [r.item_id, r]))
      }

      const [
        { data: sections },
        { data: items },
        { data: responses },
        { data: photos },
        { data: deposit },
      ] = await Promise.all([
        supabase.from('inspection_sections').select('*').order('display_order'),
        supabase.from('inspection_items').select('*').order('display_order'),
        supabase.from('inspection_responses').select('*').eq('inspection_id', inspectionId),
        supabase.from('inspection_photos').select('*').eq('inspection_id', inspectionId),
        supabase.from('deposit_statements').select('*').eq('inspection_id', inspectionId).maybeSingle(),
      ])

      const respMap = Object.fromEntries((responses ?? []).map((r: any) => [r.item_id, r]))
      const bySection: Record<string, any[]> = {}
      for (const item of items ?? []) {
        if (!bySection[item.section_id]) bySection[item.section_id] = []
        bySection[item.section_id].push({
          ...item,
          response: respMap[item.id] ?? null,
          moveInResponse: moveInMap[item.id] ?? null,
        })
      }
      const sectionsWithItems = (sections ?? []).map((s: any) => ({
        ...s,
        items: (bySection[s.id] ?? []).sort((a: any, b: any) => a.display_order - b.display_order),
      }))

      // Load logo from public folder
      const logoB64 = await loadLogoBase64()

      const jsPDFMod = await import('jspdf')
      const jsPDF = jsPDFMod.default
      const atMod = await import('jspdf-autotable')
      const autoTable = atMod.default

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
      const pw = doc.internal.pageSize.getWidth()
      const ph = doc.internal.pageSize.getHeight()
      const m = 14
      const cw = pw - m * 2
      const property = inspection.unit?.property

      // ── Header ─────────────────────────────────────────────────────────
      const addHeader = () => {
        // Dark teal background
        doc.setFillColor(...CASCADES)
        doc.rect(0, 0, pw, 26, 'F')
        // Calypso accent strip at bottom of header
        doc.setFillColor(...CALYPSO)
        doc.rect(0, 23, pw, 3, 'F')

        // Logo from public folder — loaded as JPEG, white/teal content on dark bg
        if (logoB64) {
          try {
            // Logo is 563x217px (ratio 2.59:1). At 50mm wide: height = 50/2.59 = 19.3mm
            doc.addImage(logoB64, 'JPEG', 8, 3, 50, 19)
          } catch {
            // Fallback text
            doc.setTextColor(...WHITE)
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(10)
            doc.text('WARRINGTON RESIDENTIAL', 14, 15)
          }
        } else {
          doc.setTextColor(...WHITE)
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(10)
          doc.text('WARRINGTON RESIDENTIAL', 14, 15)
        }

        // Report title (right side)
        doc.setTextColor(...WHITE)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.text('CONDITION INSPECTION REPORT', pw - m, 13, { align: 'right' })
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(...CHALK)
        doc.text(isMoveOut ? 'Move-Out Inspection' : 'Move-In Inspection', pw - m, 20, { align: 'right' })
        doc.setTextColor(40, 40, 40)
      }

      // ── Footer ──────────────────────────────────────────────────────────
      const addFooter = (page: number, total: number) => {
        doc.setFillColor(...SILVER)
        doc.rect(0, ph - 11, pw, 11, 'F')
        doc.setFillColor(...CALYPSO)
        doc.rect(0, ph - 11, pw, 1, 'F')
        doc.setTextColor(...MGRAY)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.text(`Page ${page} of ${total}`, m, ph - 3.5)
        doc.text('Warrington Residential - Condition Inspection Report', pw / 2, ph - 3.5, { align: 'center' })
        doc.text(new Date().toLocaleDateString('en-CA'), pw - m, ph - 3.5, { align: 'right' })
      }

      // ── Section label ───────────────────────────────────────────────────
      const secLabel = (label: string, y: number) => {
        doc.setFillColor(...PACIFIC)
        doc.rect(m, y, cw, 6.5, 'F')
        doc.setFillColor(...CALYPSO)
        doc.rect(m, y, 3, 6.5, 'F')
        doc.setTextColor(...WHITE)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.text(label.toUpperCase(), m + 6, y + 4.5)
        doc.setTextColor(40, 40, 40)
        return y + 6.5
      }

      // ── Code badge ──────────────────────────────────────────────────────
      const drawBadge = (code: string, x: number, y: number, rowH: number) => {
        if (!code) return
        const isDmg = code === 'D'
        const isOK  = code === 'OK'
        if (isDmg)      doc.setFillColor(254, 226, 226)
        else if (isOK)  doc.setFillColor(220, 252, 231)
        else            doc.setFillColor(...CHALK)
        doc.roundedRect(x, y + 1.5, 14, rowH - 3, 1, 1, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        if (isDmg)      doc.setTextColor(153, 27, 27)
        else if (isOK)  doc.setTextColor(22, 101, 52)
        else            doc.setTextColor(...PACIFIC)
        doc.text(code, x + 7, y + rowH - 1.5, { align: 'center' })
      }

      // ── Deposit table helper ─────────────────────────────────────────────
      const drawDepositTable = (startY: number): number => {
        const fmt = (n: number) => `$${Number(n ?? 0).toFixed(2)}`
        const chargeKeys = ['unpaid_rent','liquidated_damages','carpet_cleaning','window_cover_cleaning','suite_cleaning','painting','repair_replacement','key_fob_replacement','pet_damage','other_charges']
        const depKeys    = ['security_deposit','key_deposit','accrued_interest','other_deposit']
        const chargeLabels = ['Unpaid Rent / Late Fees','Liquidated Damages','Carpet Cleaning','Window Cover Cleaning','Suite Cleaning','Painting','Repair / Replacement','Key/FOB Replacement','Pet Damage','Other Charges']
        const depLabels    = ['Security Deposit','Key Deposit','Accrued Interest','Other Deposit']
        const dep = deposit ?? {}
        const totalCharges = chargeKeys.reduce((s, k) => s + Number((dep as any)[k] ?? 0), 0)
        const totalDeps    = depKeys.reduce((s, k) => s + Number((dep as any)[k] ?? 0), 0)
        const balance      = totalDeps - totalCharges

        const rows = chargeKeys.map((k, i) => [
          chargeLabels[i],
          fmt(Number((dep as any)[k] ?? 0)),
          depLabels[i] ?? '',
          i < depKeys.length ? fmt(Number((dep as any)[depKeys[i]] ?? 0)) : '',
        ])
        rows.push([
          { content: 'A. Balance Due to Landlord', styles: { fontStyle: 'bold', fillColor: CHALK } },
          { content: fmt(totalCharges), styles: { fontStyle: 'bold', fillColor: CHALK, halign: 'right' } },
          { content: 'B. Total Deposits', styles: { fontStyle: 'bold', fillColor: CHALK } },
          { content: fmt(totalDeps), styles: { fontStyle: 'bold', fillColor: CHALK, halign: 'right' } },
        ] as any)

        autoTable(doc, {
          startY, margin: { left: m, right: m },
          head: [['Charges to Tenant', 'Amount', 'Deposits Received', 'Amount']],
          body: rows,
          headStyles: { fillColor: PACIFIC, textColor: 255, fontSize: 7.5, fontStyle: 'bold' },
          bodyStyles: { fontSize: 7.5 },
          columnStyles: { 1: { halign: 'right' }, 3: { halign: 'right' } },
          alternateRowStyles: { fillColor: SILVER },
          theme: 'grid',
        })

        let y2 = (doc as any).lastAutoTable.finalY + 4
        if (y2 > ph - 24) { doc.addPage(); addHeader(); y2 = 32 }

        doc.setFillColor(...CASCADES)
        doc.roundedRect(m, y2, cw, 14, 2, 2, 'F')
        doc.setFillColor(...CALYPSO)
        doc.rect(m, y2 + 11, cw, 3, 'F')
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
        doc.setTextColor(...CHALK)
        doc.text(balance >= 0 ? 'Refund Due to Tenant:' : 'Amount Owing to Landlord:', m + 4, y2 + 8.5)
        doc.setTextColor(balance >= 0 ? 159 : 240, balance >= 0 ? 225 : 149, balance >= 0 ? 203 : 149)
        doc.text(`$${Math.abs(balance).toFixed(2)}`, pw - m - 4, y2 + 8.5, { align: 'right' })
        return y2 + 18
      }

      // ════════════════════════════════════════════════════════════════════
      // PAGE 1: Important Notice + Tenancy Info
      // ════════════════════════════════════════════════════════════════════
      addHeader()
      let y = 32

      // Important notice box
      doc.setFillColor(225, 245, 246)
      doc.setDrawColor(...CALYPSO)
      doc.roundedRect(m, y, cw, 34, 2, 2, 'FD')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...PACIFIC)
      doc.text('IMPORTANT NOTICE', m + 4, y + 7)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(40, 40, 40)
      const noticeText = 'Failure by the landlord to offer and participate in a condition inspection will result in the landlord losing the right to claim against the Security Deposit. Failure by the tenant to participate will result in the tenant forfeiting the deposit to the landlord.'
      const noticeLines = doc.splitTextToSize(noticeText, cw - 8)
      doc.text(noticeLines, m + 4, y + 14)
      y += 40

      const notices = [
        '1. This report must be completed and signed by the landlord and tenant at the beginning and end of tenancy.',
        '2. Both parties must sign on move-in and again on move-out.',
        '3. A copy of the move-in report must be given to the tenant within 7 days of the inspection.',
        '4. A copy of the move-out report must be given within 15 days after the inspection or forwarding address receipt.',
      ]
      notices.forEach(n => {
        const ls = doc.splitTextToSize(n, cw)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(60, 60, 60)
        doc.text(ls, m, y); y += ls.length * 4.5 + 2
      })

      y += 4
      y = secLabel('Part I - Tenancy Information', y) + 5

      const infoRows: [string, string][] = [
        ['Tenant(s) Full Name(s)', inspection.tenant_name ?? ''],
        ['Landlord Name',          property?.landlord_name ?? 'Warrington Residential'],
        ['Landlord Address',       property?.landlord_address ?? ''],
        ['Address of Rental Unit', `Unit ${inspection.unit?.unit_number}, ${property?.address}, ${property?.city}, ${property?.province}`],
        ['Possession Date',        inspection.possession_date ?? ''],
        ['Move-In Inspection Date',isMoveOut ? '' : (inspection.inspection_date ?? '')],
        ['End of Tenancy Date',    inspection.end_of_tenancy_date ?? ''],
        ['Move-Out Inspection Date',isMoveOut ? (inspection.inspection_date ?? '') : ''],
        ['Resident Manager',       inspection.resident_manager_name ?? ''],
        ['Property Manager',       inspection.property_manager_name ?? ''],
      ]
      infoRows.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...PACIFIC)
        doc.text(label + ':', m, y)
        doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40)
        doc.text(String(value), m + 58, y)
        doc.setDrawColor(...CHALK); doc.line(m, y + 1.8, pw - m, y + 1.8)
        y += 7.2
      })

      // ════════════════════════════════════════════════════════════════════
      // PAGE 2+: Living Areas Condition Table
      // ════════════════════════════════════════════════════════════════════
      doc.addPage(); addHeader(); y = 32
      y = secLabel('Part II - Living Areas Condition', y) + 3

      // Legend
      doc.setFillColor(...CHALK)
      doc.rect(m, y, cw, 7, 'F')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...PACIFIC)
      doc.text('OK=Satisfactory  C=Cleaning  D=Damaged  P=Painting  M=Missing  W=Wear & Tear  S=Stained', m + 2, y + 4.5)
      y += 10

      // Column layout — different for move-in vs move-out
      // Move-In:  | Item (55) | MI Comment (80) | MI Code (18) | [blank move-out comment (52)] | [blank code (18)] |
      // Move-Out: | Item (45) | MI Comment (55) | MI Code (18) | MO Comment (55) | MO Code (18) |
      const rowH = 7.5
      const itemW     = isMoveOut ? 45  : 55
      const miComW    = isMoveOut ? 55  : 80
      const codeW     = 18
      const moComW    = isMoveOut ? 55  : 52   // blank placeholder for move-in
      // positions
      const xItem     = m
      const xMICom    = xItem + itemW
      const xMICode   = xMICom + miComW
      const xMOCom    = xMICode + codeW
      const xMOCode   = xMOCom + moComW

      for (const section of sectionsWithItems) {
        const sItems = section.items ?? []
        if (!sItems.length) continue
        if (y > ph - 50) { doc.addPage(); addHeader(); y = 32 }

        // Section row
        doc.setFillColor(...CHALK); doc.setDrawColor(...CALYPSO)
        doc.rect(m, y, cw, 7, 'F')
        doc.setFillColor(...CALYPSO); doc.rect(m, y, 3, 7, 'F')
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...CASCADES)
        doc.text(section.name, m + 6, y + 5)
        y += 7

        // Column header row
        doc.setFillColor(248, 250, 250); doc.rect(m, y, cw, 5.5, 'F')
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(...MGRAY)
        doc.text('Item', xItem + 1, y + 3.8)
        doc.text('Move-In Comment', xMICom + 1, y + 3.8)
        doc.text('MI Code', xMICode + 1, y + 3.8)
        doc.text(isMoveOut ? 'Move-Out Comment' : '(Move-Out — blank)', xMOCom + 1, y + 3.8)
        doc.text('MO Code', xMOCode + 1, y + 3.8)
        y += 5.5

        sItems.forEach((item: any, idx: number) => {
          if (y > ph - 30) { doc.addPage(); addHeader(); y = 32 }

          // Data sources
          const miResp = isMoveOut ? item.moveInResponse : item.response
          const moResp = isMoveOut ? item.response       : null

          const miCode    = miResp?.move_in_code    ? CODE[miResp.move_in_code]    ?? '' : ''
          const miComment = miResp?.move_in_comment  ?? ''
          const moCode    = moResp?.move_out_code   ? CODE[moResp.move_out_code]   ?? '' : ''
          const moComment = moResp?.move_out_comment ?? ''

          // Alternating row bg
          if (idx % 2 === 0) {
            doc.setFillColor(252, 254, 254); doc.rect(m, y, cw, rowH, 'F')
          }

          // Item name (wrap if needed)
          doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(30, 30, 30)
          const itemLines = doc.splitTextToSize(item.name, itemW - 2)
          doc.text(itemLines[0], xItem + 1, y + 5)

          // Move-In comment
          if (miComment) {
            const clip = miComment.length > 32 ? miComment.slice(0, 29) + '...' : miComment
            doc.setFontSize(6.5); doc.setTextColor(70, 70, 70)
            doc.text(clip, xMICom + 1, y + 5)
          }

          // Move-In code badge
          if (miCode) drawBadge(miCode, xMICode + 2, y, rowH)

          if (isMoveOut) {
            // Move-Out comment
            if (moComment) {
              const clip2 = moComment.length > 32 ? moComment.slice(0, 29) + '...' : moComment
              doc.setFontSize(6.5); doc.setTextColor(70, 70, 70)
              doc.text(clip2, xMOCom + 1, y + 5)
            }
            // Move-Out code badge
            if (moCode) drawBadge(moCode, xMOCode + 2, y, rowH)
          } else {
            // Move-in report: show clearly labelled blank move-out columns
            doc.setFillColor(248, 250, 250)
            doc.rect(xMOCom, y + 1, moComW - 1, rowH - 2, 'F')
            doc.rect(xMOCode, y + 1, codeW - 1, rowH - 2, 'F')
            doc.setFontSize(5.5); doc.setTextColor(180, 180, 180)
            doc.text('to be completed', xMOCom + 1, y + 5)
            doc.text('at move-out', xMOCode + 1, y + 5)
          }

          // Row divider
          doc.setDrawColor(...CHALK); doc.line(m, y + rowH, m + cw, y + rowH)
          doc.setTextColor(40, 40, 40)
          y += rowH
        })

        // Initials line per section
        doc.setFillColor(...SILVER); doc.rect(m, y, cw, 7, 'F')
        doc.setFont('helvetica', 'italic'); doc.setFontSize(6.5); doc.setTextColor(...MGRAY)
        doc.text('Move-In Initials - Landlord: ___________  Tenant: ___________', m + 2, y + 4.5)
        if (isMoveOut) {
          doc.text('Move-Out Initials - Landlord: ___________  Tenant: ___________', m + cw / 2, y + 4.5)
        }
        y += 12
      }

      // ════════════════════════════════════════════════════════════════════
      // Keys & Smoke Alarms
      // ════════════════════════════════════════════════════════════════════
      doc.addPage(); addHeader(); y = 32
      y = secLabel('Keys & Controls', y) + 3

      autoTable(doc, {
        startY: y, margin: { left: m, right: m },
        head: [['Item', 'Given (Move-In)', 'Returned (Move-Out)', 'Notes']],
        body: [
          ['Suite Keys', String(inspection.suite_keys_given ?? 0), String(inspection.suite_keys_returned ?? 0), ''],
          ['Building Keys', String(inspection.building_keys_given ?? 0), String(inspection.building_keys_returned ?? 0), ''],
          ['Mailbox Keys', String(inspection.mailbox_keys_given ?? 0), String(inspection.mailbox_keys_returned ?? 0), ''],
          ['FOB #1', '', '', inspection.fob1_code ?? ''],
          ['FOB #2', '', '', inspection.fob2_code ?? ''],
          ['Parking Stall #', inspection.parking_stall ?? '', '', ''],
          ['Locker #', inspection.locker_number ?? '', '', ''],
          ['Keys Missing at Move-Out?', '', '', inspection.keys_missing_at_moveout ? 'YES' : 'No'],
        ],
        headStyles: { fillColor: PACIFIC, textColor: 255, fontSize: 7.5, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7.5 },
        alternateRowStyles: { fillColor: SILVER },
        theme: 'grid',
      })

      y = (doc as any).lastAutoTable.finalY + 6

      // Smoke alarm
      doc.setFillColor(225, 245, 246); doc.setDrawColor(...CALYPSO)
      doc.roundedRect(m, y, cw, 12, 1, 1, 'FD')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...PACIFIC)
      doc.text('Smoke Alarm(s) Tested:', m + 3, y + 5)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40)
      doc.text(`Move-In: ${inspection.smoke_alarm_move_in ?? 'Functioning'}`, m + 52, y + 5)
      if (isMoveOut) doc.text(`Move-Out: ${inspection.smoke_alarm_move_out ?? 'Functioning'}`, m + 104, y + 5)
      y += 18

      // ════════════════════════════════════════════════════════════════════
      // Security Deposit Statement — shown on BOTH move-in and move-out
      // ════════════════════════════════════════════════════════════════════
      if (y > ph - 80) { doc.addPage(); addHeader(); y = 32 }
      y = secLabel('Security Deposit Statement', y) + 3

      if (deposit) {
        y = drawDepositTable(y)
      } else {
        // Show blank deposit table for move-in (to be completed)
        autoTable(doc, {
          startY: y, margin: { left: m, right: m },
          head: [['Charges to Tenant', 'Amount', 'Deposits Received', 'Amount']],
          body: [
            ['Unpaid Rent / Late Fees', '$0.00', 'Security Deposit', '$0.00'],
            ['Carpet Cleaning', '$0.00', 'Key Deposit', '$0.00'],
            ['Suite Cleaning', '$0.00', 'Accrued Interest', '$0.00'],
            ['Painting', '$0.00', 'Other', '$0.00'],
            ['Repair / Replacement', '$0.00', '', ''],
            ['Other Charges', '$0.00', '', ''],
            [
              { content: 'A. Balance Due to Landlord', styles: { fontStyle: 'bold', fillColor: CHALK } },
              { content: '$0.00', styles: { fontStyle: 'bold', fillColor: CHALK, halign: 'right' } },
              { content: 'B. Total Deposits', styles: { fontStyle: 'bold', fillColor: CHALK } },
              { content: '$0.00', styles: { fontStyle: 'bold', fillColor: CHALK, halign: 'right' } },
            ] as any,
          ],
          headStyles: { fillColor: PACIFIC, textColor: 255, fontSize: 7.5, fontStyle: 'bold' },
          bodyStyles: { fontSize: 7.5, textColor: [160, 160, 160] },
          columnStyles: { 1: { halign: 'right' }, 3: { halign: 'right' } },
          alternateRowStyles: { fillColor: SILVER },
          theme: 'grid',
        })
        y = (doc as any).lastAutoTable.finalY + 4
        doc.setFont('helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(...MGRAY)
        doc.text('* Deposit statement to be completed at end of tenancy (move-out).', m + 2, y + 3)
        y += 10
      }

      // ════════════════════════════════════════════════════════════════════
      // Signatures
      // ════════════════════════════════════════════════════════════════════
      if (y > ph - 80) { doc.addPage(); addHeader(); y = 32 }
      y = secLabel(`Part ${isMoveOut ? 'IV' : 'III'} - Signatures`, y) + 4

      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(60, 60, 60)
      const agreeText = inspection.tenant_agrees !== false
        ? `[YES] ${inspection.tenant_name ?? '___'} agrees this report fairly represents the condition of the rental unit.`
        : `[NO] ${inspection.tenant_name ?? '___'} does NOT agree. Reason: ${inspection.tenant_disagreement_reason ?? ''}`
      const agreeLines = doc.splitTextToSize(agreeText, cw)
      doc.text(agreeLines, m, y); y += agreeLines.length * 5 + 4

      if (isMoveOut && inspection.forwarding_address) {
        doc.text(`Forwarding Address: ${inspection.forwarding_address}`, m, y); y += 8
      }

      const sigW = (cw - 10) / 2
      const sigH = 30
      const drawSig = (label: string, name: string, signedAt: string | null, x: number) => {
        doc.setFillColor(248, 250, 250); doc.setDrawColor(...CHALK)
        doc.roundedRect(x, y, sigW, sigH, 2, 2, 'FD')
        doc.setFillColor(...CALYPSO); doc.rect(x, y, sigW, 1.5, 'F')
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...PACIFIC)
        doc.text(label, x + 3, y + 8)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 100, 100)
        doc.text(name, x + 3, y + 13)
        if (signedAt) {
          doc.setTextColor(...CALYPSO); doc.setFont('helvetica', 'bold'); doc.setFontSize(7)
          doc.text(`Signed: ${new Date(signedAt).toLocaleDateString('en-CA')}`, x + 3, y + 22)
        } else {
          doc.setTextColor(180, 180, 180); doc.setFontSize(7)
          doc.text('X ___________________________', x + 3, y + 22)
        }
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(160, 160, 160)
        doc.text('Date: _______________', x + 3, y + sigH - 3)
      }

      drawSig('Tenant Signature', inspection.tenant_name ?? '', inspection.tenant_signed_at, m)
      drawSig('Property Manager Signature', inspection.property_manager_name ?? '', inspection.landlord_signed_at, m + sigW + 10)
      y += sigH + 10

      doc.setFillColor(225, 245, 246); doc.setDrawColor(...CALYPSO)
      doc.roundedRect(m, y, cw, 11, 1, 1, 'FD')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...PACIFIC)
      doc.text(`Report locked and finalized on ${new Date().toLocaleDateString('en-CA')}`, m + 3, y + 7)

      // ════════════════════════════════════════════════════════════════════
      // Page numbers
      // ════════════════════════════════════════════════════════════════════
      const totalPages = (doc.internal as any).pages.length - 1
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i); addFooter(i, totalPages)
      }

      // ════════════════════════════════════════════════════════════════════
      // Upload to Supabase Storage & save URL
      // ════════════════════════════════════════════════════════════════════
      const blob = doc.output('blob')
      const fileName = `${inspectionId}/report-${Date.now()}.pdf`
      const { data: { user } } = await supabase.auth.getUser()
      let pdfUrl: string | null = null

      try {
        const { error: uploadError } = await supabase.storage
          .from('inspection-pdfs')
          .upload(fileName, blob, { contentType: 'application/pdf', upsert: true })
        if (!uploadError) {
          const { data: signed } = await supabase.storage
            .from('inspection-pdfs')
            .createSignedUrl(fileName, 60 * 60 * 24 * 7)
          pdfUrl = signed?.signedUrl ?? null
        }
      } catch (storageErr) {
        console.warn('Storage upload failed:', storageErr)
      }

      await supabase.from('inspections').update({
        locked: true,
        status: 'complete',
        pdf_generated_at: new Date().toISOString(),
        ...(pdfUrl ? { pdf_url: pdfUrl } : {}),
      }).eq('id', inspectionId)

      await supabase.from('audit_logs').insert({
        inspection_id: inspectionId,
        user_id: user?.id,
        action: 'report_locked',
        details: { pdf_generated: true },
      })

      // Trigger browser download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const unitNum  = inspection.unit?.unit_number ?? ''
      const propName = inspection.unit?.property?.name ?? 'Property'
      const typeLabel = isMoveOut ? 'Move Out' : 'Move In'
      a.download = `Unit ${unitNum} - ${propName} - Condition Inspection Report (${typeLabel}).pdf`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)

      return true
    } catch (err: any) {
      console.error('PDF generation error:', err)
      setError(err.message ?? 'PDF generation failed')
      return null
    } finally {
      setGenerating(false)
    }
  }

  return { generateAndStore, generating, error }
}
