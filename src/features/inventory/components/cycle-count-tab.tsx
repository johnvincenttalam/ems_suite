import { ClipboardCheck } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { toast } from 'sonner'

export function CycleCountTab() {
  return (
    <div className="bg-white rounded-xl border border-zinc-200/60">
      <EmptyState
        icon={ClipboardCheck}
        title="No cycle counts in progress"
        description="Cycle counts let you spot-check inventory accuracy without doing a full audit. Start one to assign a subset of items to a counter."
        action={<Button onClick={() => toast.info('Cycle count workflow coming soon')}>Start cycle count</Button>}
      />
    </div>
  )
}
