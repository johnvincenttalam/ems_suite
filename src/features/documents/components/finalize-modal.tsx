import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { documentsApi } from '@/features/documents/api/documents-api'
import type { AppDocument } from '@/features/documents/types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Modal } from '@/shared/ui/modal'

const schema = z.object({
  validityUntil: z.string().optional(),
})

type Form = z.infer<typeof schema>

interface FinalizeModalProps {
  document: AppDocument | null
  onClose: () => void
}

export function FinalizeModal({ document, onClose }: FinalizeModalProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const { register, handleSubmit, reset } = useForm<Form>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (document) reset({ validityUntil: document.validityUntil ?? '' })
  }, [document, reset])

  const mutation = useMutation({
    mutationFn: ({ doc, validityUntil }: { doc: AppDocument; validityUntil?: string }) => {
      if (!user) throw new Error('Not signed in')
      return documentsApi.finalize(doc.id, user.id, validityUntil)
    },
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['audit-log'] })
      toast.success(`Finalized ${doc.trackingNumber ?? doc.id} — signatures locked`)
      onClose()
    },
    onError: (err) => toast.error('Finalize failed', { description: err instanceof Error ? err.message : 'Unknown error' }),
  })

  const onSubmit = (data: Form) => {
    if (!document) return
    mutation.mutate({ doc: document, validityUntil: data.validityUntil || undefined })
  }

  return (
    <Modal
      open={!!document}
      onClose={onClose}
      title={`Finalize ${document?.title ?? ''}`}
      size="md"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button type="submit" form="finalize-document-form" loading={mutation.isPending}>Finalize & Lock</Button>
        </>
      }
    >
      <form id="finalize-document-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <Lock className="w-4 h-4 text-amber-700 mt-0.5" />
          <div className="text-[12px] text-amber-900">
            Locks the signature chain. After this, signatures can no longer be revoked, and the
            document can be archived. This action is recorded in the audit trail.
          </div>
        </div>

        <Input
          label="Validity period (optional)"
          type="date"
          {...register('validityUntil')}
        />
        <p className="text-[11px] text-zinc-400 -mt-2">
          Use this for time-bound documents like policies or certifications. Leave blank for permanent records.
        </p>
      </form>
    </Modal>
  )
}
