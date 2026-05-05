import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Inbox } from 'lucide-react'
import { toast } from 'sonner'
import { useDepartments } from '@/features/departments'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { documentsApi } from '@/features/documents/api/documents-api'
import type { DocumentFileType, ReceiptMode } from '@/features/documents/types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Modal } from '@/shared/ui/modal'
import { Select } from '@/shared/ui/select'
import { Textarea } from '@/shared/ui/textarea'

const KNOWN_EXTENSIONS: DocumentFileType[] = ['pdf', 'docx', 'xlsx', 'png', 'jpg']

const receiptSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  description: z.string().optional(),
  fileName: z.string().min(2, 'File name is required'),
  mode: z.enum(['physical', 'email', 'courier', 'internal']),
  senderSource: z.string().min(2, 'Sender / source is required'),
  recipientDept: z.string().optional(),
  pageCount: z.string().optional(),
  attachments: z.string().optional(),
  senderRefNumber: z.string().optional(),
})

type ReceiptForm = z.infer<typeof receiptSchema>

interface RegisterReceiptModalProps {
  open: boolean
  onClose: () => void
}

export function RegisterReceiptModal({ open, onClose }: RegisterReceiptModalProps) {
  const { data: departments = [] } = useDepartments()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<ReceiptForm>({
    resolver: zodResolver(receiptSchema),
    defaultValues: { mode: 'email' },
  })

  const close = () => {
    reset({ mode: 'email' })
    onClose()
  }

  const mutation = useMutation({
    mutationFn: documentsApi.registerReceipt,
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['audit-log'] })
      toast.success(`Registered ${doc.trackingNumber} — ready to classify`)
      close()
    },
    onError: (err) => {
      toast.error('Receipt failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    },
  })

  const onSubmit = (data: ReceiptForm) => {
    if (!user) {
      toast.error('Not signed in')
      return
    }
    const ext = data.fileName.split('.').pop()?.toLowerCase() ?? ''
    const fileType = (KNOWN_EXTENSIONS.includes(ext as DocumentFileType) ? ext : 'pdf') as DocumentFileType
    const fileSizeBytes = Math.floor(80_000 + Math.random() * 1_200_000)
    mutation.mutate({
      title: data.title,
      description: data.description,
      fileName: data.fileName,
      fileType,
      fileSizeBytes,
      receipt: {
        mode: data.mode as ReceiptMode,
        senderSource: data.senderSource,
        recipientDept: data.recipientDept || undefined,
        pageCount: data.pageCount ? Number(data.pageCount) : undefined,
        attachments: data.attachments ? Number(data.attachments) : undefined,
        senderRefNumber: data.senderRefNumber || undefined,
        receivedBy: user.id,
      },
    })
  }

  const mode = watch('mode')

  return (
    <Modal open={open} onClose={close} title="Register Document Receipt" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-violet-50 border border-violet-200">
          <Inbox className="w-4 h-4 text-violet-700 mt-0.5" />
          <div className="text-[12px] text-violet-900">
            A tracking number will be assigned automatically. The document enters the Inbox; classify
            it before starting an approval workflow.
          </div>
        </div>

        <Input label="Title *" {...register('title')} error={errors.title?.message} placeholder="e.g. Vendor MSA — Acme Industrial" />
        <Textarea label="Summary / description" {...register('description')} rows={2} placeholder="Brief subject of the document" />
        <Input label="File name *" {...register('fileName')} error={errors.fileName?.message} placeholder="contract.pdf" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Mode of receipt *"
            {...register('mode')}
            error={errors.mode?.message}
            options={[
              { value: 'physical', label: 'Physical delivery' },
              { value: 'email', label: 'Email' },
              { value: 'courier', label: 'Courier' },
              { value: 'internal', label: 'Internal submission' },
            ]}
          />
          <Input
            label="Sender / source *"
            {...register('senderSource')}
            error={errors.senderSource?.message}
            placeholder={mode === 'internal' ? 'e.g. Operations Department' : 'e.g. Acme Industrial Co.'}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Intended department"
            {...register('recipientDept')}
            placeholder="—"
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
          />
          <Input
            label="Sender reference number"
            {...register('senderRefNumber')}
            placeholder="e.g. ACME-MSA-2026-1138"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Number of pages" type="number" min={0} {...register('pageCount')} />
          <Input label="Attachments" type="number" min={0} {...register('attachments')} />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={close} disabled={mutation.isPending}>Cancel</Button>
          <Button type="submit" fullWidth loading={mutation.isPending}>Register Receipt</Button>
        </div>
      </form>
    </Modal>
  )
}
