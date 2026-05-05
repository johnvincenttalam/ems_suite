import { useState } from 'react'
import { PageHeader } from '@/shared/ui/page-header'
import { Tabs } from '@/shared/ui/tabs'
import { OverviewTab } from '@/features/reports/components/overview-tab'
import { TrendsTab } from '@/features/reports/components/trends-tab'
import { DrillDownTab } from '@/features/reports/components/drill-down-tab'

type TabKey = 'overview' | 'trends' | 'drill-down'

export function ReportsPage() {
  const [tab, setTab] = useState<TabKey>('overview')

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Aggregated metrics across every module"
      />

      <Tabs
        className="mb-6"
        value={tab}
        onChange={(v) => setTab(v as TabKey)}
        items={[
          { value: 'overview', label: 'Overview' },
          { value: 'trends', label: 'Trends' },
          { value: 'drill-down', label: 'Drill-Down' },
        ]}
      />

      {tab === 'overview' && <OverviewTab />}
      {tab === 'trends' && <TrendsTab />}
      {tab === 'drill-down' && <DrillDownTab />}
    </div>
  )
}
