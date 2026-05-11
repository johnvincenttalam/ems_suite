import { useMemo } from 'react'
import { useRequests } from '@/features/procurement'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { ApprovalsTab } from '@/features/procurement/components/approvals-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function ApprovalsPage() {
  const { data: requests = [] } = useRequests()
  const { user } = useAuthStore()

  const waitingOnMe = useMemo(() => {
    if (!user) return 0
    return requests.filter((r) => {
      if (r.status !== 'pending') return false
      const isChain = !!r.approvers && r.approvers.length > 0
      if (!isChain) return true
      const idx = r.currentApproverIndex ?? 0
      return r.approvers![idx] === user.id
    }).length
  }, [requests, user])

  return (
    <div>
      <PageHeader
        title="Approvals"
        subtitle={
          waitingOnMe === 0
            ? "You're all caught up — no requests waiting on you."
            : `${waitingOnMe} request${waitingOnMe === 1 ? '' : 's'} waiting on you.`
        }
      />
      <ApprovalsTab />
    </div>
  )
}
