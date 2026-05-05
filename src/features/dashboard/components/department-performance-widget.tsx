import { Building2 } from 'lucide-react'
import { useDepartments } from '@/features/departments'
import { useDocuments } from '@/features/documents'
import { useRequests } from '@/features/procurement'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card'
import { buildDepartmentPerformance } from '@/features/dashboard/lib/department-performance'
import { cn } from '@/shared/utils/cn'

const ROW_LIMIT = 6

export function DepartmentPerformanceWidget() {
  const { data: departments = [] } = useDepartments()
  const { data: requests = [] } = useRequests()
  const { data: documents = [] } = useDocuments()

  const rows = buildDepartmentPerformance(departments, requests, documents).slice(0, ROW_LIMIT)
  const max = Math.max(1, ...rows.map((r) => r.total))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Department Performance</CardTitle>
        <p className="text-[12px] text-zinc-500 mt-0.5">Open workload by department — pending procurement + docs in workflow</p>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        {rows.length === 0 ? (
          <div className="py-6 text-center">
            <Building2 className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
            <p className="text-[13px] text-zinc-500">No departments configured</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.departmentId}>
                <div className="flex items-center justify-between text-[12px] mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[10px] text-zinc-400 flex-shrink-0">{r.code}</span>
                    <span className="text-zinc-900 font-medium truncate">{r.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-zinc-500 tabular-nums flex-shrink-0">
                    <span title="Pending procurement requests">{r.pendingProcurement} req</span>
                    <span className="text-zinc-300">·</span>
                    <span title="Documents in workflow">{r.docsInWorkflow} doc</span>
                    <span className="text-zinc-300">·</span>
                    <span className="text-zinc-900 font-semibold">{r.total}</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden flex">
                  {r.pendingProcurement > 0 && (
                    <div
                      className={cn('h-full bg-amber-500')}
                      style={{ width: `${(r.pendingProcurement / max) * 100}%` }}
                    />
                  )}
                  {r.docsInWorkflow > 0 && (
                    <div
                      className={cn('h-full bg-violet-500')}
                      style={{ width: `${(r.docsInWorkflow / max) * 100}%` }}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {rows.length > 0 && (
          <div className="flex items-center gap-3 mt-4 text-[11px] text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Procurement
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-500" /> Documents
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
