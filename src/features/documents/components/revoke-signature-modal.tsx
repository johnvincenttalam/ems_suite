import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldOff } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { documentsApi } from '@/features/documents/api/documents-api'
import type { AppDocument } from '@/features/documents/types'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { Textarea } from '@/shared/ui/textarea'

const schema = z.object({
  reason: z.string().min(2, 'Reason is required'),
})

type Form = z.infer<typeof schema>

interface RevokeSignatureModalProps {
  document: AppDocument | null
  onClose: () => void
}

export function RevokeSignatureModal({ document, onClose }: RevokeSignatureModalProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const { register, handleSubmit, formState: { errors }, reset } = useForm<Form>({ resolver: zodResolver(schema) })

  const close = () => {
    reset()
    onClose()
  }

  const mutation = useMutation({
    mutationFn: ({ doc, reason }: { doc: AppDocument; reason: string }) => {
      if (!user) throw new Error('Not signed in')
      return documentsApi.revokeSignature(doc.id, user.id, reason)
    },
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['audit-log'] })
      toast.success(`Signature revoked on ${doc.trackingNumber ?? doc.id}`)
      close()
    },
    onError: (err) => toast.error('Revoke failed', { description: err instanceof Error ? err.message : 'Unknown error' }),
  })

  const onSubmit = (data: Form) => {
    if (!document) return
    mutation.mutate({ doc: document, reason: data.reason })
  }

  return (
    <Modal open={!!document} onClose={close} title="Revoke Signature" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
          <ShieldOff className="w-4 h-4 text-red-700 mt-0.5" />
          <div className="text-[12px] text-red-900">
            Reverts the workflow to your approval step. The document returns to <strong>In Review</strong>.
            The revoked signature stays on the audit trail with your stated reason. This is forbidden once the document is finalized.
          </div>
        </div>

        <Textarea
          label="Reason *"
          {...register('reason')}
          rows={3}
          error={errors.reason?.message}
          placeholder="e.g. Spotted a numerical error in section 3 — re-signing after correction"
        />

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={close} disabled={mutation.isPending}>Cancel</Button>
          <Button type="submit" variant="danger" fullWidth loading={mutation.isPending}>Revoke Signature</Button>
        </div>
      </form>
    </Modal>
  )
}
