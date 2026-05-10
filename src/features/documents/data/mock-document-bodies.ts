/**
 * Body text for the seeded mock documents. Kept in a separate file from
 * mock-documents.ts so the document literal stays compact and so we can
 * extend body content without touching the rest of the seed.
 *
 * Each entry is 1–2 paragraphs of plausible content for the document title —
 * enough to drive realistic snippet extraction and ranked search results.
 * In a real deployment this comes from a text-extraction service (PDF /
 * DOCX → plain text) rather than being hand-authored.
 */
export const mockDocumentBodies: Record<string, string> = {
  'DOC-001':
    "This procurement policy governs all purchasing decisions for fiscal year 2026. It establishes spending thresholds, approval chains, and vendor evaluation criteria. Department heads must obtain three competitive quotes for purchases exceeding ₱5,000 and route them through finance for approval. Sole-source procurement requires written justification and director sign-off. Vendor performance is reviewed quarterly with scoring on quality, on-time delivery, and contract compliance.",

  'DOC-002':
    "This master service agreement between the Company and Acme Industrial Co. defines the framework for ongoing engineering services and equipment supply. Scope includes preventive maintenance, parts replacement, and emergency response within agreed SLAs. Pricing follows the schedule in Annex A; volume discounts apply over ₱250,000 annually. Either party may terminate with sixty days written notice. Disputes are subject to binding arbitration under local commercial rules.",

  'DOC-003':
    "Operations summary for March 2026 covering the three active warehouses and field operations. Inventory accuracy held at 98.4% across cycle counts, exceeding the 97% target. Stock-out events declined to four incidents from seven the prior month. Throughput at the main warehouse averaged 1,240 movements daily. Three operational risks were flagged: aging forklift fleet, supplier lead-time variability for hydraulic parts, and a backlog of 38 unclassified inbound documents in the SDMS inbox.",

  'DOC-004':
    "Project charter for the warehouse automation initiative. Goal: reduce manual handling by 40% over twelve months by introducing conveyor sortation, ASRS racking, and barcode scanning at receiving. Total budget approved at ₱1.2M with phased deployment. Engineering will lead vendor selection in Q2; pilot installation targets Q3 in the main warehouse. Success criteria include throughput improvement, error rate reduction, and ROI within thirty months.",

  'DOC-005':
    "Capital expenditure proposal for replacing two end-of-life forklifts in the main warehouse. Existing units have exceeded 20,000 operating hours and incurred rising maintenance costs. Replacement cost of ₱58,000 covers two 2.5-tonne electric forklifts with five-year warranty. Expected annual savings on fuel, maintenance, and downtime estimated at ₱14,500. Payback period of approximately four years. Procurement targets Q3 2026 delivery.",

  'DOC-006':
    "Investigation report for the forklift tine damage incident on April 28, 2026. A pre-shift inspection identified hydraulic leak from the main lift cylinder; the unit was tagged out and routed to maintenance. Root cause traced to seal failure exacerbated by overdue preventive maintenance. No injuries occurred. Corrective actions: revised PM schedule, additional operator training on pre-shift checks, replacement seals stocked at the maintenance bay.",

  'DOC-007':
    "Internal audit report for Q1 2025 covering financial controls, procurement, and inventory management. Twelve sample transactions reviewed across procurement showed full segregation of duties and three-way matching. Inventory cycle count variance at 1.6%, within tolerance. Two findings: lack of documented supplier risk-rating procedure and incomplete audit trail in the legacy ERP for stock adjustments. Both classified as moderate; remediation plans agreed with management.",

  'DOC-008':
    "Standard operating procedure for inventory cycle counting. Counts run weekly on a rolling schedule covering all SKUs quarterly. Counters use mobile devices to scan locations and record physical quantities. Variances are reviewed by the warehouse lead before adjustments are posted. Adjustments above ₱500 require warehouse manager approval. Documents the use of the Cycle Count module in the inventory system, including how to schedule sessions and finalize variances as auto-applied adjustments.",

  'DOC-009':
    "Quarterly site inspection at Project Site Alpha. Items reviewed include perimeter fencing, fire suppression, electrical panels, eyewash stations, and stored chemicals. Findings: one expired fire extinguisher, two missing eyewash signs, and stored fuel containers without secondary containment. All findings rated low severity with corrective actions to close within thirty days. Site supervisor confirmed receipt and committed to weekly inspection cadence going forward.",

  'DOC-010':
    "Annual strategic plan setting direction for 2025. Three pillars: operational excellence, digital transformation, and people development. Operational excellence targets a 15% reduction in cycle time across procurement-to-pay. Digital transformation includes the SDMS rollout, SAP integration sunset, and warehouse automation pilot. People development covers a refreshed competency framework and expanded apprenticeship intake. Capital budget projection of ₱3.4M against expected ₱42M revenue.",

  'DOC-011':
    "Tax clearance certificate issued by the Bureau of Internal Revenue confirming the Company has no outstanding tax liabilities as of Q1 2026. Covers withholding, value-added tax, and corporate income tax. Required for renewal of business permits and for participation in government procurement. Validity until end of fiscal year. Filed copy retained in the compliance archive; a certified copy was distributed to procurement and legal.",

  'DOC-012':
    "Capital budget proposal for Q3 2026 totaling ₱640,000 across three initiatives. The largest single line item is the warehouse automation pilot at ₱420,000 covering conveyor sortation and barcode infrastructure. Secondary items: HVAC upgrade at the main warehouse (₱140,000) and security camera replacement at Site Alpha (₱80,000). Each item carries an ROI estimate, vendor shortlist, and proposed timeline. Submission targets the August finance review.",

  'DOC-013':
    "Stellar Logistics vendor onboarding pack. Documents include due diligence checklist, business permit copy, tax clearance, insurance certificate, and bank account verification. Background check completed with no adverse findings. Procurement assigned tier-2 supplier classification based on annual spend projection under ₱250,000. Initial contract scope: bonded warehousing, freight forwarding, and customs brokerage. Performance reviewed quarterly against the standard supplier scorecard.",

  'DOC-014':
    "Updated remote work policy effective Q2 2026. Hybrid schedule: minimum two days on-site for operations and engineering staff; finance, legal, HR, and IT may work fully remote with manager approval. Equipment provision and home-office stipend remain unchanged. New requirement: VPN with MFA for any access to financial systems. Reaffirms the existing data confidentiality, intellectual property, and acceptable-use policies regardless of work location.",

  'DOC-015':
    "Quarterly attestation that key SOC 2 controls operated effectively for Q1 2026. Areas covered: access provisioning and deprovisioning, change management for production systems, vendor risk reviews, and incident response. Two minor exceptions noted: late deprovisioning of one terminated employee account (closed within fourteen days) and a missed change-window approval signature (signed retroactively). Both were documented and remediated. Overall control effectiveness rated satisfactory.",

  'DOC-016':
    "Memorandum of agreement between Acme Industrial Co. and Northwind Logistics establishing joint operations for cross-docking and last-mile delivery during peak season. Effective January 2026 through December 2026. Cost-sharing follows volume-based formula in Annex B. Both parties commit to quarterly performance reviews and a joint incident response protocol. Proprietary information shared under the existing mutual NDA. Either party may withdraw with 90 days notice.",

  'DOC-017':
    "Service level agreement with Halcyon Logistics covering inbound freight, customs brokerage, and bonded storage for fiscal 2026. Key SLAs: 24-hour customs clearance for standard shipments, 99.5% inventory accuracy in bonded storage, and 4-hour response time for service requests. Penalty schedule and credit mechanism in Annex C. Force majeure clause aligned with industry standard. Halcyon also provides quarterly business reviews and continuous improvement initiatives.",
}

/** Resolve a document's body text. Returns empty string for documents that
 * weren't seeded with body content (defensive — search just contributes the
 * title/tags/category bands instead). */
export function getDocumentBody(documentId: string): string {
  return mockDocumentBodies[documentId] ?? ''
}
