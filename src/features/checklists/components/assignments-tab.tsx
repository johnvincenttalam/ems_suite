import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { ClipboardList, Plus, Play, CheckCircle2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { useTemplates, useAssignments } from '@/features/checklists'
import { useUsers } from '@/features/users'
import type { ChecklistAssignment } from '@/features/checklists/types'
import { Avatar } from '@/shared/ui/avatar'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Modal } from '@/shared/ui/modal'
import { Textarea } from '@/shared/ui/textarea'
import { EmptyState } from '@/shared/ui/empty-state'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { cn } from '@/shared/utils/cn'

const assignSchema = z.object({
  templateId: z.string().min(1, 'Template is required'),
  assignedTo: z.string().min(1, 'Assignee is required'),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
})

type AssignForm = z.infer<typeof assignSchema>

export function AssignmentsTab() {
  const { data: templates = [] } = useTemplates()
  const { data: assignments = [], isLoading } = useAssignments()
  const { data: users = [] } = useUsers()

  const templateMap = useMemo(() => Object.fromEntries(templates.map((t) => [t.id, t])), [templates])
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])

  const active = useMemo(() => assignments.filter((a) => a.status !== 'completed'), [assignments])

  const [showAssign, setShowAssign] = useState(false)

  const { register, handleSubmit, formState: { errors }, reset } = useForm<AssignForm>({ resolver: zodResolver(assignSchema) })

  const onSubmit = (_data: AssignForm) => {
    setShowAssign(false)
    reset()
    toast.success('Checklist assigned')
  }

  const start = (a: ChecklistAssignment) => toast.success(`Started ${a.id}`)
  const complete = (a: ChecklistAssignment) => toast.success(`Completed ${a.id}`)

  if (isLoading) return <TableSkeleton columns={3} rows={4} />

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[13px] text-zinc-500">{active.length} pending and in-progress assignments.</p>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowAssign(true)}>Assign Checklist</Button>
      </div>

      {active.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200/60">
          <EmptyState icon={ClipboardList} title="No active assignments" description="Assign a template to a user to start tracking results." />
        </div>
      ) : (
        <div className="space-y-3">
          {active.map((a) => {
            const tpl = templateMap[a.templateId]
            const user = userMap[a.assignedTo]
            const completed = a.results.filter((r) => r.completed).length
            const total = tpl?.items.length ?? 0
            const percent = total === 0 ? 0 : Math.round((completed / total) * 100)
            const isInProgress = a.status === 'in_progress'

            return (
              <div key={a.id} className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
                <div className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {user && <Avatar name={user.name} size="md" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] text-zinc-400">{a.id}</span>
                        <span className="text-zinc-300">·</span>
                        <span className="text-[13px] font-medium text-zinc-900">{tpl?.name ?? '—'}</span>
                      </div>
                      <p className="text-[12px] text-zinc-500 mt-0.5">
                        Assigned to {user?.name ?? '—'} on {format(parseISO(a.assignedDate), 'MMM dd, yyyy')}
                        {a.dueDate && <> · due {format(parseISO(a.dueDate), 'MMM dd, yyyy')}</>}
                      </p>
                      {a.notes && <p className="text-[12px] text-zinc-600 mt-1">{a.notes}</p>}

                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1 max-w-md">
                          <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                            <div className={cn('h-full transition-all', isInProgress ? 'bg-blue-500' : 'bg-zinc-300')} style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                        <span className="text-[11px] tabular-nums text-zinc-500 whitespace-nowrap">{completed} / {total} items · {percent}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {a.status === 'pending' && (
                      <Button size="sm" leftIcon={<Play className="w-4 h-4" />} onClick={() => start(a)}>Start</Button>
                    )}
                    {a.status === 'in_progress' && (
                      <Button size="sm" variant="success" leftIcon={<CheckCircle2 className="w-4 h-4" />} onClick={() => complete(a)}>Complete</Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={showAssign} onClose={() => { setShowAssign(false); reset() }} title="Assign Checklist" size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select label="Template *" {...register('templateId')} error={errors.templateId?.message} placeholder="Select template" options={templates.map((t) => ({ value: t.id, label: `${t.name} (${t.items.length} items)` }))} />
          <Select label="Assign To *" {...register('assignedTo')} error={errors.assignedTo?.message} placeholder="Select user" options={users.filter((u) => u.status === 'active').map((u) => ({ value: u.id, label: u.name }))} />
          <Input label="Due Date" type="date" {...register('dueDate')} error={errors.dueDate?.message} />
          <Textarea label="Notes" {...register('notes')} rows={2} placeholder="Any context for the assignee..." />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth onClick={() => { setShowAssign(false); reset() }}>Cancel</Button>
            <Button type="submit" fullWidth>Assign</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
