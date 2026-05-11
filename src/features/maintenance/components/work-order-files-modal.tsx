import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { maintenanceApi } from '@/features/maintenance'
import type { WorkOrder } from '@/features/maintenance/types'
import { useAuthStore } from '@/features/auth'
import { Modal } from '@/shared/ui/modal'
import { AttachmentsPanel } from '@/shared/attachments'
import type { Attachment } from '@/shared/attachments'

interface WorkOrderFilesModalProps {
  open: boolean
  wo: WorkOrder | null
  onClose: () => void
}

export function WorkOrderFilesModal({ open, wo, onClose }: WorkOrderFilesModalProps) {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['maintenance'] })
    queryClient.invalidateQueries({ queryKey: ['audit-log'] })
  }

  const addMutation = useMutation({
    mutationFn: ({ id, attachments }: { id: string; attachments: Attachment[] }) => {
      if (!currentUser) throw new Error('Not signed in')
      return maintenanceApi.addAttachments(id, attachments, currentUser.id)
    },
    onSuccess: () => invalidate(),
    onError: (err) => toast.error('Attach failed', { description: err instanceof Error ? err.message : 'Unknown error' }),
  })

  const removeMutation = useMutation({
    mutationFn: ({ id, attachmentId }: { id: string; attachmentId: string }) => {
      if (!currentUser) throw new Error('Not signed in')
      return maintenanceApi.removeAttachment(id, attachmentId, currentUser.id)
    },
    onSuccess: () => invalidate(),
    onError: (err) => toast.error('Remove failed', { description: err instanceof Error ? err.message : 'Unknown error' }),
  })

  const readOnly = !wo || wo.status === 'cancelled'

  return (
    <Modal open={open} onClose={onClose} title={`Files · ${wo?.id ?? ''}`} size="md">
      {wo && (
        <div className="space-y-3">
          <p className="text-[12.5px] text-zinc-500">
            Attach photos, manuals, or service receipts. Files live in browser memory in this demo —
            production deployments swap the storage adapter for real persistence.
          </p>
          <AttachmentsPanel
            attachments={wo.attachments ?? []}
            uploadedBy={currentUser?.name ?? 'Unknown'}
            readOnly={readOnly}
            onAdd={(added) => addMutation.mutate({ id: wo.id, attachments: added })}
            onRemove={(att) => removeMutation.mutate({ id: wo.id, attachmentId: att.id })}
            emptyHint={readOnly ? 'No files attached.' : 'No files yet — use "Add files" to attach.'}
          />
        </div>
      )}
    </Modal>
  )
}
