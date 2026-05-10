import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { GitBranch, X } from 'lucide-react'
import { toast } from 'sonner'
import { useUsers } from '@/features/users'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { documentsApi } from '@/features/documents/api/documents-api'
import type { AppDocument } from '@/features/documents/types'
import { Avatar } from '@/shared/ui/avatar'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Modal } from '@/shared/ui/modal'
import { cn } from '@/shared/utils/cn'

const schema = z.object({
  approvers: z.array(z.string()).min(1, 'Add at least one approver'),
  deadline: z.string().optional(),
})

type Form = z.infer<typeof schema>

interface StartWorkflowModalProps {
  document: AppDocument | null
  onClose: () => void
}

export function StartWorkflowModal({ document, onClose }: StartWorkflowModalProps) {
  const { data: users = [] } = useUsers()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [chosen, setChosen] = useState<string[]>([])

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { approvers: [] },
  })

  useEffect(() => {
    if (document) {
      reset({ approvers: [], deadline: document.deadline ?? '' })
      setChosen([])
    }
  }, [document, reset])

  const toggle = (id: string) => {
    setChosen((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
      setValue('approvers', next, { shouldValidate: true })
      return next
    })
  }

  const mutation = useMutation({
    mutationFn: ({ doc, input }: { doc: AppDocument; input: Form }) => {
      if (!user) throw new Error('Not signed in')
      return documentsApi.startWorkflow(doc.id, input.approvers, user.id, input.deadline || undefined)
    },
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['audit-log'] })
      toast.success(`Workflow started for ${doc.trackingNumber ?? doc.id}`)
      onClose()
    },
    onError: (err) => {
      toast.error('Start workflow failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    },
  })

  const onSubmit = (data: Form) => {
    if (!document) return
    mutation.mutate({ doc: document, input: data })
  }

  const activeUsers = users.filter((u) => u.status === 'active')

  return (
    <Modal
      open={!!document}
      onClose={onClose}
      title={`Start workflow — ${document?.title ?? ''}`}
      size="lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button type="submit" form="start-workflow-form" loading={mutation.isPending}>Start Workflow</Button>
        </>
      }
    >
      <form id="start-workflow-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <GitBranch className="w-4 h-4 text-blue-700 mt-0.5" />
          <div className="text-[12px] text-blue-900">
            Approvers sign sequentially. Once you start, the document leaves the Inbox and the first
            approver receives the routing.
          </div>
        </div>

        <div>
          <label className="text-[13px] font-medium text-zinc-700 block mb-2">Approvers — in order *</label>
          {chosen.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap p-2 rounded-lg bg-zinc-50 border border-zinc-200/60 mb-2">
              {chosen.map((id, idx) => {
                const u = users.find((x) => x.id === id)
                return (
                  <span key={id} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white border border-zinc-200 text-[12px]">
                    <span className="text-[10px] font-mono text-zinc-400">{idx + 1}.</span>
                    {u?.name ?? id}
                    <button type="button" onClick={() => toggle(id)} className="text-zinc-400 hover:text-red-600">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )
              })}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activeUsers.map((u) => {
              const selected = chosen.includes(u.id)
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggle(u.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md border text-left transition-colors',
                    selected ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300',
                  )}
                >
                  <Avatar name={u.name} size="sm" />
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-zinc-900 truncate">{u.name}</p>
                    <p className="text-[11px] text-zinc-400 truncate">{u.email}</p>
                  </div>
                </button>
              )
            })}
          </div>
          {errors.approvers && <p className="text-xs text-red-600 mt-1">{errors.approvers.message}</p>}
        </div>

        <Input label="Deadline" type="date" {...register('deadline')} />
      </form>
    </Modal>
  )
}
