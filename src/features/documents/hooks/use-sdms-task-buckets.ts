import { useMemo } from 'react'
import { parseISO } from 'date-fns'
import { useDocuments } from './use-documents'
import { useAuthStore } from '@/features/auth/store/auth-store'
import type { AppDocument, DocumentRouting } from '../types'

function getCurrentApproverId(doc: AppDocument): string | undefined {
  if (doc.status !== 'in_review' || !doc.approvers?.length) return undefined
  const idx = doc.currentApproverIndex ?? 0
  return doc.approvers[idx]
}

function pendingReviewRouting(doc: AppDocument, userId: string): DocumentRouting | undefined {
  return doc.routings?.find(
    (r) => r.recipientId === userId && r.purpose === 'review' && r.status !== 'completed',
  )
}

function userHasActiveSignature(doc: AppDocument, userId: string): boolean {
  return doc.signatures.some((s) => s.signerId === userId && !s.revokedAt)
}

export interface SdmsTaskBuckets {
  pending: AppDocument[]
  review: AppDocument[]
  returned: AppDocument[]
  completed: AppDocument[]
  /** Sum of pending + review + returned — i.e. items needing user action. */
  totalActionable: number
}

/** Single source of truth for "which documents need this user's attention".
 * Both the My Tasks page and the sidebar badge consume this so the two can't
 * drift out of sync. */
export function useSdmsTaskBuckets(): SdmsTaskBuckets {
  const { user } = useAuthStore()
  const { data: documents = [] } = useDocuments()

  return useMemo(() => {
    if (!user) {
      return { pending: [], review: [], returned: [], completed: [], totalActionable: 0 }
    }
    const pending: AppDocument[] = []
    const review: AppDocument[] = []
    const returned: AppDocument[] = []
    const completed: AppDocument[] = []

    for (const d of documents) {
      if (getCurrentApproverId(d) === user.id) pending.push(d)
      if (pendingReviewRouting(d, user.id)) review.push(d)
      if (d.status === 'rejected' && d.createdBy === user.id) returned.push(d)
      if (d.status === 'approved' && userHasActiveSignature(d, user.id)) completed.push(d)
    }

    pending.sort((a, b) => {
      const ad = a.deadline ? parseISO(a.deadline).getTime() : Infinity
      const bd = b.deadline ? parseISO(b.deadline).getTime() : Infinity
      return ad - bd
    })
    review.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    returned.sort((a, b) => (b.rejectedAt ?? '').localeCompare(a.rejectedAt ?? ''))
    completed.sort((a, b) => {
      const aLast = a.signatures[a.signatures.length - 1]?.signedAt ?? ''
      const bLast = b.signatures[b.signatures.length - 1]?.signedAt ?? ''
      return bLast.localeCompare(aLast)
    })

    return {
      pending,
      review,
      returned,
      completed,
      totalActionable: pending.length + review.length + returned.length,
    }
  }, [documents, user])
}
