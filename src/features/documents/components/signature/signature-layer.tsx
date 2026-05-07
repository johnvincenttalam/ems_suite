import type { AppDocument } from '@/features/documents/types'
import { isSignatureActive } from '@/features/documents/types'
import { SignatureOverlay } from './signature-overlay'

interface SignatureLayerProps {
  doc: AppDocument
  page?: number
  userMap?: Record<string, { name: string } | undefined>
  /** Whether to outline still-empty slots (so reviewers know where signatures will land). */
  showEmptySlots?: boolean
}

export function SignatureLayer({ doc, page = 1, userMap, showEmptySlots = true }: SignatureLayerProps) {
  const slots = (doc.signatureSlots ?? []).filter((s) => s.page === page)
  if (slots.length === 0) return null

  const activeByKey = new Map<string, ReturnType<typeof findSig>>()
  for (const slot of slots) {
    activeByKey.set(slot.key, findSig(doc, slot.key))
  }

  return (
    <>
      {slots.map((slot, i) => {
        const sig = activeByKey.get(slot.key)
        const expectedSignerId = doc.approvers[i]
        const expectedName = expectedSignerId ? userMap?.[expectedSignerId]?.name : undefined
        if (sig) {
          const signerName = userMap?.[sig.signerId]?.name
          return (
            <SignatureOverlay
              key={slot.key}
              slot={slot}
              signatureImage={sig.signatureImage}
              signerName={signerName}
            />
          )
        }
        if (!showEmptySlots) return null
        return <SignatureOverlay key={slot.key} slot={slot} signerName={expectedName} empty />
      })}
    </>
  )
}

function findSig(doc: AppDocument, slotKey: string) {
  return doc.signatures.find((s) => s.slotKey === slotKey && isSignatureActive(s))
}
