import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Route as RouteIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useUsers } from '@/features/users'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { documentsApi } from '@/features/documents/api/documents-api'
import {
  ROUTING_PURPOSE_LABEL,
  type AppDocument,
  type RoutingPurpose,
} from '@/features/documents/types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Modal } from '@/shared/ui/modal'
import { Select } from '@/shared/ui/select'
import { Textarea } from '@/shared/ui/textarea'

const schema = z.object({
  recipientId: z.string().min(1, 'Recipient is required'),
  purpose: z.enum(['review', 'approval', 'action', 'info']),
  deadline: z.string().optional(),
  notes: z.string().optional(),
})

type Form = z.infer<typeof schema>

interface RouteModalProps {
  document: AppDocument | null
  onClose: () => void
}

export function RouteModal({ document, onClose }: RouteModalProps) {
  const { data: users = [] } = useUsers()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const { register, handleSubmit, formState: { errors }, reset } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { purpose: 'review' },
  })

  useEffect(() => {
    if (document) reset({ purpose: 'review', deadline: document.deadline ?? '' })
  }, [document, reset])

  const mutation = useMutation({
    mutationFn: ({ doc, input }: { doc: AppDocument; input: Form }) => {
      if (!user) throw new Error('Not signed in')
      return documentsApi.route(doc.id, {
        senderId: user.id,
        recipientId: input.recipientId,
        purpose: input.purpose as RoutingPurpose,
        deadline: input.deadline || undefined,
        notes: input.notes || undefined,
      })
    },
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['audit-log'] })
      toast.success(`Routed ${doc.trackingNumber ?? doc.id}`)
      onClose()
    },
    onError: (err) => {
      toast.error('Routing failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    },
  })

  const onSubmit = (data: Form) => {
    if (!document) return
    mutation.mutate({ doc: document, input: data })
  }

  const recipientOptions = users
    .filter((u) => u.status === 'active' && u.id !== user?.id)
    .map((u) => ({ value: u.id, label: `${u.name} — ${u.email}` }))

  return (
    <Modal
      open={!!document}
      onClose={onClose}
      title={`Route ${document?.title ?? ''}`}
      size="md"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button type="submit" form="route-document-form" loading={mutation.isPending}>Send Routing</Button>
        </>
      }
    >
      <form id="route-document-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <RouteIcon className="w-4 h-4 text-blue-700 mt-0.5" />
          <div className="text-[12px] text-blue-900">
            Forwards a copy to the recipient with a tracked routing entry. Doesn't change the
            approval workflow.
          </div>
        </div>

        <Select
          label="Recipient *"
          {...register('recipientId')}
          error={errors.recipientId?.message}
          placeholder="Select a recipient"
          options={recipientOptions}
        />

        <Select
          label="Purpose *"
          {...register('purpose')}
          error={errors.purpose?.message}
          options={(Object.keys(ROUTING_PURPOSE_LABEL) as RoutingPurpose[]).map((k) => ({
            value: k,
            label: ROUTING_PURPOSE_LABEL[k],
          }))}
        />

        <Input label="Deadline" type="date" {...register('deadline')} />
        <Textarea label="Notes" {...register('notes')} rows={3} placeholder="Why you're routing this — context for the recipient" />
      </form>
    </Modal>
  )
}
