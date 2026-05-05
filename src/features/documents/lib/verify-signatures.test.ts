import { describe, it, expect } from 'vitest'
import { verifySignatures } from './verify-signatures'
import type { AppDocument } from '@/features/documents/types'

function doc(p: Partial<AppDocument>): AppDocument {
  return {
    id: 'DOC-X',
    title: 'X',
    fileName: 'x.pdf',
    fileType: 'pdf',
    fileSizeBytes: 1000,
    status: 'approved',
    version: 1,
    approvers: [],
    signatures: [],
    createdBy: 'U001',
    createdAt: '2026-04-01T00:00:00Z',
    ...p,
  }
}

describe('verifySignatures', () => {
  it('passes a clean approved chain', () => {
    const result = verifySignatures(doc({
      approvers: ['U002', 'U001'],
      status: 'approved',
      signatures: [
        { signerId: 'U002', signedAt: '2026-04-02T00:00:00Z' },
        { signerId: 'U001', signedAt: '2026-04-03T00:00:00Z' },
      ],
    }))
    expect(result.ok).toBe(true)
    expect(result.chainComplete).toBe(true)
    expect(result.signatures.every((s) => s.ok)).toBe(true)
  })

  it('flags signer_not_in_approvers when a non-approver signed', () => {
    const result = verifySignatures(doc({
      approvers: ['U001'],
      signatures: [{ signerId: 'U999', signedAt: '2026-04-02T00:00:00Z' }],
    }))
    expect(result.signatures[0].issues).toContain('signer_not_in_approvers')
    expect(result.ok).toBe(false)
  })

  it('flags signed_before_creation', () => {
    const result = verifySignatures(doc({
      approvers: ['U001'],
      signatures: [{ signerId: 'U001', signedAt: '2026-03-01T00:00:00Z' }],
    }))
    expect(result.signatures[0].issues).toContain('signed_before_creation')
  })

  it('flags signed_after_finalization', () => {
    const result = verifySignatures(doc({
      approvers: ['U001'],
      finalizedAt: '2026-04-05T00:00:00Z',
      signatures: [{ signerId: 'U001', signedAt: '2026-04-10T00:00:00Z' }],
    }))
    expect(result.signatures[0].issues).toContain('signed_after_finalization')
  })

  it('flags revoked signatures but does not count them as a chain failure', () => {
    const result = verifySignatures(doc({
      approvers: ['U002', 'U001'],
      status: 'in_review',
      signatures: [
        { signerId: 'U002', signedAt: '2026-04-02T00:00:00Z', revokedAt: '2026-04-04T00:00:00Z', revokedBy: 'U002', revocationReason: 'error' },
      ],
    }))
    const u002 = result.signatures.find((s) => s.signature.signerId === 'U002')!
    expect(u002.issues).toContain('revoked')
    expect(u002.ok).toBe(false)
    // chainComplete is false here because the only active sigs don't cover all approvers,
    // but ok itself isn't gated by chainComplete unless status === 'approved'
    expect(result.chainComplete).toBe(false)
    expect(result.ok).toBe(true)
  })

  it('flags chain incomplete when approved but missing an active signer', () => {
    const result = verifySignatures(doc({
      approvers: ['U002', 'U001'],
      status: 'approved',
      signatures: [
        { signerId: 'U002', signedAt: '2026-04-02T00:00:00Z' },
      ],
    }))
    expect(result.chainComplete).toBe(false)
    expect(result.ok).toBe(false)
  })

  it('passes when approved chain has revoked + replacement signature', () => {
    const result = verifySignatures(doc({
      approvers: ['U002'],
      status: 'approved',
      signatures: [
        { signerId: 'U002', signedAt: '2026-04-02T00:00:00Z', revokedAt: '2026-04-03T00:00:00Z', revokedBy: 'U002' },
        { signerId: 'U002', signedAt: '2026-04-04T00:00:00Z' },
      ],
    }))
    expect(result.chainComplete).toBe(true)
    expect(result.ok).toBe(true)
  })
})
