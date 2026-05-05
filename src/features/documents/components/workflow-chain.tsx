import { Check, X, Circle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { AppDocument } from '@/features/documents/types'
import type { User } from '@/features/users/types'
import { Avatar } from '@/shared/ui/avatar'
import { cn } from '@/shared/utils/cn'

interface WorkflowChainProps {
  document: AppDocument
  userMap: Record<string, User>
  compact?: boolean
}

export function WorkflowChain({ document, userMap, compact = false }: WorkflowChainProps) {
  const signatureMap = Object.fromEntries(
    document.signatures.filter((s) => !s.revokedAt).map((s) => [s.signerId, s]),
  )

  return (
    <div className={cn('flex items-start gap-2', compact ? 'flex-wrap' : 'flex-col sm:flex-row')}>
      {document.approvers.map((approverId, idx) => {
        const user = userMap[approverId]
        const sig = signatureMap[approverId]
        const isSigned = !!sig
        const isCurrent = document.currentApproverIndex === idx && document.status === 'in_review'
        const isRejected = document.status === 'rejected' && document.rejectedBy === approverId

        return (
          <div key={approverId} className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative">
                {user && <Avatar name={user.name} size={compact ? 'sm' : 'md'} />}
                <div className={cn(
                  'absolute -bottom-1 -right-1 rounded-full border-2 border-white flex items-center justify-center',
                  compact ? 'w-4 h-4' : 'w-5 h-5',
                  isRejected ? 'bg-red-500' : isSigned ? 'bg-emerald-500' : isCurrent ? 'bg-blue-500' : 'bg-zinc-300',
                )}>
                  {isRejected ? <X className={compact ? 'w-2.5 h-2.5 text-white' : 'w-3 h-3 text-white'} /> :
                   isSigned ? <Check className={compact ? 'w-2.5 h-2.5 text-white' : 'w-3 h-3 text-white'} /> :
                   <Circle className={compact ? 'w-2 h-2 text-white' : 'w-2.5 h-2.5 text-white'} />}
                </div>
              </div>
              {!compact && (
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-zinc-900 truncate">{user?.name ?? approverId}</p>
                  <p className="text-[11px] text-zinc-400">
                    {isRejected ? 'Disapproved' : isSigned ? `Signed ${format(parseISO(sig.signedAt), 'MMM dd, HH:mm')}` : isCurrent ? 'Pending' : 'Waiting'}
                  </p>
                </div>
              )}
            </div>
            {idx < document.approvers.length - 1 && (
              <span className="text-zinc-300 mx-1">→</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
