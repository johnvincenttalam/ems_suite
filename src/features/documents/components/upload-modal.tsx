import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { useUsers } from '@/features/users'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { documentsApi } from '@/features/documents/api/documents-api'
import type { DocumentFileType } from '@/features/documents/types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Modal } from '@/shared/ui/modal'
import { Textarea } from '@/shared/ui/textarea'
import { Avatar } from '@/shared/ui/avatar'
import { cn } from '@/shared/utils/cn'

const uploadSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  description: z.string().optional(),
  fileName: z.string().min(2, 'File is required'),
  approvers: z.array(z.string()).min(1, 'Add at least one approver'),
})

type UploadForm = z.infer<typeof uploadSchema>

interface UploadModalProps {
  open: boolean
  onClose: () => void
}

const KNOWN_EXTENSIONS: DocumentFileType[] = ['pdf', 'docx', 'xlsx', 'png', 'jpg']

export function UploadModal({ open, onClose }: UploadModalProps) {
  const { data: users = [] } = useUsers()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [chosenApprovers, setChosenApprovers] = useState<string[]>([])

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<UploadForm>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { approvers: [] },
  })

  const close = () => {
    reset({ approvers: [] })
    setChosenApprovers([])
    onClose()
  }

  const toggleApprover = (id: string) => {
    setChosenApprovers((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
      setValue('approvers', next, { shouldValidate: true })
      return next
    })
  }

  const uploadMutation = useMutation({
    mutationFn: documentsApi.upload,
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['audit-log'] })
      toast.success(`Uploaded ${doc.id} — workflow started`)
      close()
    },
    onError: (err) => {
      toast.error('Upload failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    },
  })

  const onSubmit = (data: UploadForm) => {
    if (!user) {
      toast.error('Not signed in')
      return
    }
    const ext = data.fileName.split('.').pop()?.toLowerCase() ?? ''
    const fileType = (KNOWN_EXTENSIONS.includes(ext as DocumentFileType) ? ext : 'pdf') as DocumentFileType
    const fileSizeBytes = Math.floor(100_000 + Math.random() * 900_000)
    uploadMutation.mutate({
      title: data.title,
      description: data.description,
      fileName: data.fileName,
      fileType,
      fileSizeBytes,
      approvers: data.approvers,
      createdBy: user.id,
    })
  }

  const activeUsers = users.filter((u) => u.status === 'active')

  return (
    <Modal
      open={open}
      onClose={close}
      title="Upload Document"
      size="lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={close} disabled={uploadMutation.isPending}>Cancel</Button>
          <Button type="submit" form="upload-document-form" loading={uploadMutation.isPending}>Upload & Start Workflow</Button>
        </>
      }
    >
      <form id="upload-document-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Title *" {...register('title')} error={errors.title?.message} placeholder="e.g. Q2 Procurement Policy" />
        <Textarea label="Description" {...register('description')} rows={2} />

        <div>
          <label className="text-[13px] font-medium text-zinc-700 block mb-2">File *</label>
          <div className="border border-dashed border-zinc-300 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:border-zinc-400 transition-colors cursor-pointer" onClick={() => {
            const fakeName = 'document-' + Date.now() + '.pdf'
            setValue('fileName', fakeName, { shouldValidate: true })
            toast.info('Mock file selected: ' + fakeName)
          }}>
            <Upload className="w-6 h-6 text-zinc-400 mb-2" />
            <p className="text-[13px] text-zinc-700 font-medium">Click to select a file</p>
            <p className="text-[11px] text-zinc-400 mt-1">PDF, DOCX, XLSX up to 10 MB</p>
          </div>
          <input type="hidden" {...register('fileName')} />
          {errors.fileName && <p className="text-xs text-red-600 mt-1">{errors.fileName.message}</p>}
        </div>

        <div>
          <label className="text-[13px] font-medium text-zinc-700 block mb-2">Approvers — in order *</label>
          <div className="space-y-2">
            {chosenApprovers.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap p-2 rounded-lg bg-zinc-50 border border-zinc-200/60">
                {chosenApprovers.map((id, idx) => {
                  const u = users.find((x) => x.id === id)
                  return (
                    <span key={id} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white border border-zinc-200 text-[12px]">
                      <span className="text-[10px] font-mono text-zinc-400">{idx + 1}.</span>
                      {u?.name ?? id}
                      <button type="button" onClick={() => toggleApprover(id)} className="text-zinc-400 hover:text-red-600">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activeUsers.map((u) => {
                const selected = chosenApprovers.includes(u.id)
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleApprover(u.id)}
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
          </div>
          {errors.approvers && <p className="text-xs text-red-600 mt-1">{errors.approvers.message}</p>}
        </div>
      </form>
    </Modal>
  )
}
