import { Link } from 'react-router-dom'
import { Wrench, ArrowRight } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-header'
import { WorkOrdersTab } from '@/features/maintenance'

/**
 * Assets-side mount of the WorkOrders surface. The component itself is owned
 * by the Maintenance module — this page just provides the page chrome and an
 * outbound link to the full Maintenance workspace for technicians who need
 * the broader context (schedule, technicians, reports).
 */
export function AssetsMaintenancePage() {
  return (
    <div>
      <PageHeader
        title="Maintenance"
        subtitle="Work orders for every asset in your registry — schedule, start, complete, or cancel from here."
        actions={
          <Link
            to="/module/maintenance"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 bg-white text-[13px] text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 transition-colors"
          >
            <Wrench className="w-4 h-4" />
            Open Maintenance Module
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        }
      />

      <WorkOrdersTab />
    </div>
  )
}
