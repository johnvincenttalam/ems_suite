import { CalendarTab } from '@/features/documents/components/calendar-tab'
import { PageHeader } from '@/shared/ui/page-header'

export function CalendarPage() {
  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle="Deadlines, validity expirations, and receipt timeline"
      />
      <CalendarTab />
    </div>
  )
}
