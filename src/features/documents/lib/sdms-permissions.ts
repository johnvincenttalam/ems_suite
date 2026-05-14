import type { AppDocument } from '@/features/documents/types'
import type { User } from '@/features/users'
import { moduleRoleOf } from '@/features/auth'

/**
 * Per-role permission policy for SDMS document and storage actions.
 *
 * Layered on top of the existing lifecycle (drafts editable, in-review
 * signable) and authorship (own-only resubmit) rules. The matrix:
 *
 *   Action                          Admin   Manager  Member
 *   ──────────────────────────────  ─────  ─────────  ──────
 *   Upload (own vault / new doc)     ✓        ✓        ✓
 *   Download                         ✓        ✓        ✓
 *   Edit own draft                   ✓        ✓        ✓
 *   Edit others' draft               ✓        ✓        ✗
 *   Delete own draft                 ✓        ✓        ✓
 *   Delete others' draft             ✓        ✓        ✗
 *   Delete approved / archived       ✓        ✗        ✗
 *   Revoke signature / move slot     ✓        ✓        ✗
 *
 * `User` here is the authenticated caller. The helpers return false for any
 * caller without SDMS access — the same gate that ProtectedRoute enforces, so
 * tests can assert permission denials without first checking module access.
 */
export type SdmsRoleScope = 'admin' | 'manager' | 'member' | null

export function sdmsScope(user: User | null | undefined): SdmsRoleScope {
  return (moduleRoleOf(user, 'sdms') as SdmsRoleScope) ?? null
}

function isOwner(user: User | null | undefined, doc: Pick<AppDocument, 'createdBy'>): boolean {
  return !!user && user.id === doc.createdBy
}

function isManagerOrAbove(scope: SdmsRoleScope): boolean {
  return scope === 'admin' || scope === 'manager'
}

/** Anyone with SDMS access can upload to their own storage / create new docs. */
export function canUpload(user: User | null | undefined): boolean {
  return sdmsScope(user) !== null
}

/** Anyone with SDMS access can download. Already audit-logged via recordAccess. */
export function canDownload(user: User | null | undefined): boolean {
  return sdmsScope(user) !== null
}

/**
 * Edit a document. Members can only edit their own editable docs; manager+
 * can edit anyone's. "Editable" = `draft` OR `rejected` with
 * `rejectionType === 'revision_request'` — the author needs to attach the
 * corrected file before resubmitting, so we don't lock that state.
 */
export function canEditDocument(user: User | null | undefined, doc: AppDocument): boolean {
  const scope = sdmsScope(user)
  if (!scope) return false
  const isEditableStatus =
    doc.status === 'draft' ||
    (doc.status === 'rejected' && doc.rejectionType === 'revision_request')
  if (!isEditableStatus) return false
  if (isManagerOrAbove(scope)) return true
  return isOwner(user, doc)
}

/**
 * Delete a document. Owners and manager+ can delete drafts. Only admin can
 * delete approved/archived/rejected docs — destructive ops on finalised work
 * stay at the top of the chain.
 */
export function canDeleteDocument(user: User | null | undefined, doc: AppDocument): boolean {
  const scope = sdmsScope(user)
  if (!scope) return false
  if (doc.status === 'in_review') return false
  if (doc.status === 'draft') {
    if (isManagerOrAbove(scope)) return true
    return isOwner(user, doc)
  }
  // approved / rejected / archived — admin only.
  return scope === 'admin'
}

/** Revoke a signature you placed earlier (pre-finalisation). Manager+ only. */
export function canRevokeSignature(user: User | null | undefined): boolean {
  return isManagerOrAbove(sdmsScope(user))
}

/** Reposition a signature slot pre-finalisation. Manager+ only. */
export function canMoveSignatureSlot(user: User | null | undefined): boolean {
  return isManagerOrAbove(sdmsScope(user))
}

/**
 * Create / edit / delete workflow templates. These are shared infrastructure
 * — every member picks from them when starting a workflow, but only manager+
 * shapes the catalogue. Members can still *use* a template; they just can't
 * change it.
 */
export function canManageWorkflowTemplates(user: User | null | undefined): boolean {
  return isManagerOrAbove(sdmsScope(user))
}
