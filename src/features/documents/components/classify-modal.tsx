import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useDepartments } from '@/features/departments'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { documentsApi } from '@/features/documents/api/documents-api'
import {
  CATEGORY_LABEL,
  CONFIDENTIALITY_LABEL,
  PRIORITY_LABEL,
  type AppDocument,
  type DocumentCategory,
  type DocumentConfidentiality,
  type DocumentPriority,
} from '@/features/documents/types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Modal } from '@/shared/ui/modal'
import { Select } from '@/shared/ui/select'
import { Textarea } from '@/shared/ui/textarea'

const classifySchema = z.object({
  category: z.enum(['legal', 'finance', 'hr', 'procurement', 'operations', 'engineering', 'compliance', 'other']),
  priority: z.enum(['low', 'normal', 'urgent']),
  confidentiality: z.enum(['public', 'internal', 'confidential']),
  departmentId: z.string().optional(),
  tags: z.string().optional(),
  summary: z.string().optional(),
})

type ClassifyForm = z.infer<typeof classifySchema>

interface ClassifyModalProps {
  document: AppDocument | null
  onClose: () => void
}

export function ClassifyModal({ document, onClose }: ClassifyModalProps) {
  const { data: departments = [] } = useDepartments()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ClassifyForm>({
    resolver: zodResolver(classifySchema),
    defaultValues: {
      category: 'other',
      priority: 'normal',
      confidentiality: 'internal',
    },
  })

  useEffect(() => {
    if (document) {
      reset({
        category: document.category ?? 'other',
        priority: document.priority ?? 'normal',
        confidentiality: document.confidentiality ?? 'internal',
        departmentId: document.departmentId ?? document.receipt?.recipientDept ?? '',
        tags: document.tags?.join(', ') ?? '',
        summary: document.description ?? '',
      })
    }
  }, [document, reset])

  const mutation = useMutation({
    mutationFn: ({ doc, input }: { doc: AppDocument; input: ClassifyForm }) => {
      if (!user) throw new Error('Not signed in')
      return documentsApi.classify(
        doc.id,
        {
          category: input.category as DocumentCategory,
          priority: input.priority as DocumentPriority,
          confidentiality: input.confidentiality as DocumentConfidentiality,
          departmentId: input.departmentId || undefined,
          tags: input.tags
            ? input.tags.split(',').map((t) => t.trim()).filter(Boolean)
            : undefined,
          summary: input.summary || undefined,
        },
        user.id,
      )
    },
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['audit-log'] })
      toast.success(`Classified ${doc.trackingNumber ?? doc.id}`)
      onClose()
    },
    onError: (err) => {
      toast.error('Classification failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    },
  })

  const onSubmit = (data: ClassifyForm) => {
    if (!document) return
    mutation.mutate({ doc: document, input: data })
  }

  return (
    <Modal open={!!document} onClose={onClose} title={`Classify ${document?.title ?? ''}`} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="Category *"
            {...register('category')}
            error={errors.category?.message}
            options={(Object.keys(CATEGORY_LABEL) as DocumentCategory[]).map((k) => ({ value: k, label: CATEGORY_LABEL[k] }))}
          />
          <Select
            label="Priority *"
            {...register('priority')}
            error={errors.priority?.message}
            options={(Object.keys(PRIORITY_LABEL) as DocumentPriority[]).map((k) => ({ value: k, label: PRIORITY_LABEL[k] }))}
          />
          <Select
            label="Confidentiality *"
            {...register('confidentiality')}
            error={errors.confidentiality?.message}
            options={(Object.keys(CONFIDENTIALITY_LABEL) as DocumentConfidentiality[]).map((k) => ({ value: k, label: CONFIDENTIALITY_LABEL[k] }))}
          />
        </div>

        <Select
          label="Owner department"
          {...register('departmentId')}
          placeholder="—"
          options={departments.map((d) => ({ value: d.id, label: d.name }))}
        />

        <Input label="Tags / keywords" {...register('tags')} placeholder="comma-separated, e.g. policy, vendor, q2" />
        <Textarea label="Summary" {...register('summary')} rows={2} placeholder="Short, indexed description for search" />

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button type="submit" fullWidth loading={mutation.isPending}>Save Classification</Button>
        </div>
      </form>
    </Modal>
  )
}
