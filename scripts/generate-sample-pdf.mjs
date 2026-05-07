import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { jsPDF } from 'jspdf'

const here = dirname(fileURLToPath(import.meta.url))
const out = resolve(here, '..', 'public', 'sample-document.pdf')

const doc = new jsPDF({ unit: 'pt', format: 'letter' })

doc.setFillColor(15, 23, 42)
doc.rect(0, 0, 612, 6, 'F')

doc.setTextColor(100, 116, 139)
doc.setFontSize(9)
doc.text('SDMS-2026-0009 - SERVICE LEVEL AGREEMENT', 50, 60)

doc.setTextColor(15, 23, 42)
doc.setFontSize(22)
doc.setFont('helvetica', 'bold')
doc.text('Service Level Agreement', 50, 100)

doc.setFontSize(11)
doc.setFont('helvetica', 'normal')
doc.setTextColor(71, 85, 105)
doc.text('Between Northwind Operations Pte. Ltd. and Halcyon Logistics Inc.', 50, 122)

doc.setDrawColor(226, 232, 240)
doc.line(50, 145, 562, 145)

doc.setTextColor(15, 23, 42)
doc.setFontSize(10)
doc.setFont('helvetica', 'bold')
doc.text('1. SERVICE COMMITMENTS', 50, 175)
doc.setFont('helvetica', 'normal')
doc.setTextColor(71, 85, 105)
doc.text('Halcyon shall maintain a 99.5% on-time-delivery rate measured monthly. Failure to', 50, 195)
doc.text('meet this commitment for two consecutive months triggers credit per Section 4.', 50, 211)

doc.setTextColor(15, 23, 42)
doc.setFont('helvetica', 'bold')
doc.text('2. RESPONSE TIMES', 50, 245)
doc.setFont('helvetica', 'normal')
doc.setTextColor(71, 85, 105)
doc.text('Critical incidents shall receive an initial response within 30 minutes during', 50, 265)
doc.text('business hours and within 2 hours outside business hours.', 50, 281)

doc.setTextColor(15, 23, 42)
doc.setFont('helvetica', 'bold')
doc.text('3. TERM', 50, 315)
doc.setFont('helvetica', 'normal')
doc.setTextColor(71, 85, 105)
doc.text('This SLA is effective 1 May 2026 and runs concurrently with the Master', 50, 335)
doc.text('Services Agreement until 30 April 2027.', 50, 351)

doc.setTextColor(15, 23, 42)
doc.setFont('helvetica', 'bold')
doc.text('4. EXECUTED BY THE PARTIES BELOW', 50, 395)

// Signature lines on page 1
doc.setDrawColor(148, 163, 184)
doc.line(80, 560, 280, 560)
doc.setFont('helvetica', 'bold')
doc.setFontSize(9)
doc.setTextColor(15, 23, 42)
doc.text('For Northwind Operations Pte. Ltd.', 80, 575)
doc.setFont('helvetica', 'normal')
doc.setTextColor(148, 163, 184)
doc.setFontSize(8)
doc.text('Authorized Signatory  Date', 80, 587)

doc.setDrawColor(148, 163, 184)
doc.line(330, 560, 530, 560)
doc.setFont('helvetica', 'bold')
doc.setFontSize(9)
doc.setTextColor(15, 23, 42)
doc.text('For Halcyon Logistics Inc.', 330, 575)
doc.setFont('helvetica', 'normal')
doc.setTextColor(148, 163, 184)
doc.setFontSize(8)
doc.text('Authorized Signatory  Date', 330, 587)

doc.setFontSize(8)
doc.setTextColor(148, 163, 184)
doc.text('Page 1 of 2  Generated for SDMS demo', 50, 760)

// Page 2 — witness signature
doc.addPage()

doc.setFillColor(15, 23, 42)
doc.rect(0, 0, 612, 6, 'F')

doc.setTextColor(100, 116, 139)
doc.setFontSize(9)
doc.text('SDMS-2026-0009 - SERVICE LEVEL AGREEMENT (CONTINUED)', 50, 60)

doc.setTextColor(15, 23, 42)
doc.setFontSize(14)
doc.setFont('helvetica', 'bold')
doc.text('Schedule A — Witness Attestation', 50, 100)

doc.setFont('helvetica', 'normal')
doc.setFontSize(10)
doc.setTextColor(71, 85, 105)
doc.text('The undersigned witness confirms that the above agreement was executed in', 50, 135)
doc.text('the presence of both authorized signatories on the date indicated.', 50, 151)

doc.setDrawColor(148, 163, 184)
doc.line(80, 320, 360, 320)
doc.setFont('helvetica', 'bold')
doc.setFontSize(9)
doc.setTextColor(15, 23, 42)
doc.text('Witnessed by Legal Counsel', 80, 335)
doc.setFont('helvetica', 'normal')
doc.setTextColor(148, 163, 184)
doc.setFontSize(8)
doc.text('Authorized Signatory  Date', 80, 347)

doc.setFontSize(8)
doc.setTextColor(148, 163, 184)
doc.text('Page 2 of 2  Generated for SDMS demo', 50, 760)

writeFileSync(out, Buffer.from(doc.output('arraybuffer')))
console.log('Wrote', out)
