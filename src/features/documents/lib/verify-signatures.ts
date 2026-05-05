import type { AppDocument, DocumentSignature } from '@/features/documents/types'

export type VerifyIssue =
  | 'signer_not_in_approvers'
  | 'signed_before_creation'
  | 'signed_after_finalization'
  | 'revoked'

export interface SignatureVerification {
  index: number
  signature: DocumentSignature
  ok: boolean
  issues: VerifyIssue[]
}

export interface VerificationResult {
  ok: boolean
  signatures: SignatureVerification[]
  /** True only when every active signature passes AND every approver has at
   * least one active signature (relevant once finalized). */
  chainComplete: boolean
}

/**
 * Mock signature verification. In a real PKI system, this would validate
 * cryptographic signatures against certificates; here we run the structural
 * checks the workflow guarantees: signer authorization, temporal ordering,
 * revocation status. Pure — same input ⇒ same output.
 */
export function verifySignatures(doc: AppDocument): VerificationResult {
  const approvers = new Set(doc.approvers)

  const signatures = doc.signatures.map((sig, index): SignatureVerification => {
    const issues: VerifyIssue[] = []
    if (!approvers.has(sig.signerId)) issues.push('signer_not_in_approvers')
    if (sig.signedAt < doc.createdAt) issues.push('signed_before_creation')
    if (doc.finalizedAt && sig.signedAt > doc.finalizedAt) issues.push('signed_after_finalization')
    if (sig.revokedAt) issues.push('revoked')
    return { index, signature: sig, ok: issues.length === 0, issues }
  })

  const activeSigners = new Set(
    signatures.filter((s) => s.ok).map((s) => s.signature.signerId),
  )
  const chainComplete = doc.approvers.every((id) => activeSigners.has(id))

  const allActiveOk = signatures.every((s) => s.ok || s.issues.includes('revoked'))

  return {
    ok: allActiveOk && (doc.status !== 'approved' || chainComplete),
    signatures,
    chainComplete,
  }
}

export const ISSUE_LABEL: Record<VerifyIssue, string> = {
  signer_not_in_approvers: 'Signer is not on the approver list',
  signed_before_creation: 'Signed before document was created',
  signed_after_finalization: 'Signed after document was finalized',
  revoked: 'Signature has been revoked',
}
