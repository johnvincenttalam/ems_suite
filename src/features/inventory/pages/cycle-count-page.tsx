import { CycleCountTab } from '@/features/inventory/components/cycle-count-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function CycleCountPage() {
  return (
    <div>
      <PageHeader
        title="Cycle Count"
        subtitle="Spot-check inventory accuracy without a full audit"
      />
      <CycleCountTab />
    </div>
  )
}
