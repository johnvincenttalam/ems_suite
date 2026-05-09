import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MapPin, Pencil, Plus, Trash2, Workflow } from 'lucide-react'
import { toast } from 'sonner'
import { useUsers, UserInfoPopover } from '@/features/users'
import { useWorkflowTemplates } from '@/features/documents/hooks/use-workflow-templates'
import { useDocuments } from '@/features/documents/hooks/use-documents'
import { workflowTemplatesApi } from '@/features/documents/api/workflow-templates-api'
import {
  CATEGORY_LABEL,
  type DocumentCategory,
  type SignatureSlot,
  type WorkflowTemplate,
} from '@/features/documents/types'
import { SignatureSlotEditor } from '@/features/documents/components/signature'
import { ApproverChainEditor } from '@/features/documents/components/approver-chain-editor'
import { PageHeader } from '@/shared/ui/page-header'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Modal } from '@/shared/ui/modal'
import { Textarea } from '@/shared/ui/textarea'
import { Avatar } from '@/shared/ui/avatar'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { CategoryBadge } from '@/features/documents/components/document-meta'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { EmptyState } from '@/shared/ui/empty-state'
import { cn } from '@/shared/utils/cn'

const formSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  description: z.string().optional(),
  category: z.enum(['legal', 'finance', 'hr', 'procurement', 'operations', 'engineering', 'compliance', 'other']).optional(),
})

type FormValues = z.infer<typeof formSchema>

const CATEGORY_OPTIONS = [
  { value: '', label: '— No category —' },
  ...(Object.keys(CATEGORY_LABEL) as DocumentCategory[]).map((k) => ({ value: k, label: CATEGORY_LABEL[k] })),
]

export function SdmsWorkflowTemplatesPage() {
  const { data: templates = [], isLoading } = useWorkflowTemplates()
  const { data: users = [] } = useUsers()
  const { data: documents = [] } = useDocuments()
  const queryClient = useQueryClient()

  const [editTarget, setEditTarget] = useState<WorkflowTemplate | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<WorkflowTemplate | null>(null)

  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])

  const usageMap = useMemo(() => {
    // Templates aren't currently linked to docs at create-time (we only copy
    // the approverIds), so we infer usage by matching identical approver chains.
    const counts = new Map<string, number>()
    for (const t of templates) {
      const sig = t.approverIds.join('>')
      let n = 0
      for (const d of documents) {
        if (d.approvers.join('>') === sig) n++
      }
      counts.set(t.id, n)
    }
    return counts
  }, [templates, documents])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['workflow-templates'] })
  }

  const deleteMutation = useMutation({
    mutationFn: workflowTemplatesApi.delete,
    onSuccess: () => {
      toast.success(`Template deleted`)
      invalidate()
      setDeleteTarget(null)
    },
    onError: (err) => {
      toast.error('Delete failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader
          title="Workflow Templates"
          subtitle="Reusable approver chains. Pick one when creating a document to skip approver setup."
        />
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
          New Template
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
        {isLoading ? (
          <TableSkeleton columns={5} rows={4} />
        ) : templates.length === 0 ? (
          <EmptyState
            icon={Workflow}
            title="No templates yet"
            description="Create your first workflow template to standardize approver chains across teams."
            action={
              <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
                New Template
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-50/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Approver Chain</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Slots</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">Used By</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id} className="border-b border-zinc-100/60 hover:bg-zinc-50/50">
                    <td className="px-4 py-3 align-top">
                      <p className="text-[13px] font-medium text-zinc-900">{t.name}</p>
                      {t.description && (
                        <p className="text-[12px] text-zinc-500 mt-0.5 max-w-md">{t.description}</p>
                      )}
                      <p className="text-[11px] font-mono text-zinc-400 mt-0.5">{t.id}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {t.category ? <CategoryBadge value={t.category} size="sm" /> : <span className="text-zinc-300 text-[12px]">—</span>}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-1 flex-wrap">
                        {t.approverIds.map((id, i) => {
                          const u = userMap[id]
                          const pill = (
                            <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-zinc-50 border border-zinc-200/60 text-[11.5px] hover:border-zinc-300 transition-colors">
                              <Avatar name={u?.name ?? id} size="sm" className="w-4 h-4 text-[8px]" />
                              <span className="text-zinc-700">{u?.name ?? id}</span>
                            </span>
                          )
                          return (
                            <span key={`${id}-${i}`} className="inline-flex items-center gap-1.5">
                              {i > 0 && <span className="text-zinc-300">→</span>}
                              {u ? <UserInfoPopover user={u}>{pill}</UserInfoPopover> : pill}
                            </span>
                          )
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {t.signatureSlots && t.signatureSlots.length > 0 ? (
                        <span
                          title="Documents created from this template inherit these slot positions."
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200"
                        >
                          <MapPin className="w-3 h-3" />
                          {t.signatureSlots.length} preset
                        </span>
                      ) : (
                        <span className="text-zinc-300 text-[12px]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <span className="text-[13px] tabular-nums text-zinc-700">{usageMap.get(t.id) ?? 0}</span>
                      <p className="text-[10.5px] text-zinc-400">document{usageMap.get(t.id) === 1 ? '' : 's'}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          type="button"
                          onClick={() => setEditTarget(t)}
                          className="p-1.5 rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(t)}
                          className="p-1.5 rounded-md text-zinc-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TemplateFormModal
        open={createOpen}
        mode="create"
        onClose={() => setCreateOpen(false)}
        onSaved={() => {
          invalidate()
          setCreateOpen(false)
        }}
      />
      <TemplateFormModal
        open={!!editTarget}
        mode="edit"
        template={editTarget ?? undefined}
        onClose={() => setEditTarget(null)}
        onSaved={() => {
          invalidate()
          setEditTarget(null)
        }}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title={`Delete "${deleteTarget?.name ?? ''}"?`}
        message={
          <>
            Documents already using this chain are not affected — they keep their copied approver list.
            New documents will no longer be able to pick this template.
          </>
        }
        confirmLabel="Delete template"
        tone="danger"
        busy={deleteMutation.isPending}
      />
    </div>
  )
}

interface TemplateFormModalProps {
  open: boolean
  mode: 'create' | 'edit'
  template?: WorkflowTemplate
  onClose: () => void
  onSaved: () => void
}

function TemplateFormModal({ open, mode, template, onClose, onSaved }: TemplateFormModalProps) {
  const { data: users = [] } = useUsers()
  const [approvers, setApprovers] = useState<string[]>([])
  const [approversTouched, setApproversTouched] = useState(false)
  const [referenceUrl, setReferenceUrl] = useState<string>('')
  const [slots, setSlots] = useState<SignatureSlot[]>([])

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', description: '', category: undefined },
  })

  // Reset form when the dialog opens or the target changes.
  useMemo(() => {
    if (!open) return
    if (mode === 'edit' && template) {
      reset({
        name: template.name,
        description: template.description ?? '',
        category: template.category,
      })
      setApprovers([...template.approverIds])
      setReferenceUrl(template.referenceUrl ?? '')
      setSlots(template.signatureSlots ? [...template.signatureSlots] : [])
    } else {
      reset({ name: '', description: '', category: undefined })
      setApprovers([])
      setReferenceUrl('')
      setSlots([])
    }
    setApproversTouched(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, template?.id])

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        name: values.name,
        description: values.description,
        category: values.category as DocumentCategory | undefined,
        approverIds: approvers,
        signatureSlots: slots,
        referenceUrl: referenceUrl,
      }
      return mode === 'create'
        ? workflowTemplatesApi.create(payload)
        : workflowTemplatesApi.update(template!.id, payload)
    },
    onSuccess: () => {
      toast.success(mode === 'create' ? 'Template created' : 'Template updated')
      onSaved()
    },
    onError: (err) => {
      toast.error('Save failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    },
  })

  const toggleApprover = (id: string) => {
    setApproversTouched(true)
    setApprovers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const onSubmit = (values: FormValues) => {
    if (approvers.length === 0) {
      setApproversTouched(true)
      toast.error('Add at least one approver')
      return
    }
    saveMutation.mutate(values)
  }

  const activeUsers = users.filter((u) => u.status === 'active')

  return (
    <Modal
      open={open}
      onClose={saveMutation.isPending ? () => {} : onClose}
      title={mode === 'create' ? 'New Workflow Template' : `Edit ${template?.name ?? ''}`}
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saveMutation.isPending}>Cancel</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={saveMutation.isPending}>
            {mode === 'create' ? 'Create Template' : 'Save Changes'}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Input
          label="Name *"
          placeholder="e.g. Finance — Standard Approval"
          {...register('name')}
          error={errors.name?.message}
        />
        <Textarea
          label="Description"
          rows={2}
          placeholder="Short summary of when to use this template"
          {...register('description')}
        />
        <Select
          label="Default category"
          options={CATEGORY_OPTIONS}
          {...register('category')}
        />

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <label className="text-[13px] font-medium text-zinc-700">Approver Chain *</label>
            <span className="text-[11px] text-zinc-400">in order — first signs first</span>
          </div>
          {approvers.length > 0 && (
            <ApproverChainEditor
              approverIds={approvers}
              users={users}
              onChange={setApprovers}
              onTouch={() => setApproversTouched(true)}
              className="mb-3"
            />
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
            {activeUsers.map((u) => {
              const selected = approvers.includes(u.id)
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleApprover(u.id)}
                  className={cn(
                    'flex items-center gap-2 px-2.5 py-2 rounded-md border text-left transition-colors',
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
          {approversTouched && approvers.length === 0 && (
            <p className="text-xs text-red-600 mt-2">Add at least one approver.</p>
          )}
        </div>

        <div className="border-t border-zinc-200/60 pt-4">
          <div className="flex items-baseline justify-between mb-2">
            <label className="text-[13px] font-medium text-zinc-700">Signature Slot Positions</label>
            <span className="text-[11px] text-zinc-400">optional · slot N pairs with approver N</span>
          </div>
          <Input
            label="Reference document URL"
            placeholder="e.g. /sample-document.pdf or https://example.com/doc.png"
            value={referenceUrl}
            onChange={(e) => setReferenceUrl(e.target.value)}
            helperText="Image (.png/.jpg/.svg) or PDF. Used as the visual canvas for placing slots — documents created from this template inherit it."
          />
          {referenceUrl ? (
            <div className="mt-3 p-3 rounded-lg border border-zinc-200/60 bg-zinc-50/40">
              <SignatureSlotEditor
                referenceUrl={referenceUrl}
                slots={slots}
                onChange={setSlots}
                approverNames={approvers.map((id) => users.find((u) => u.id === id)?.name ?? id)}
              />
            </div>
          ) : (
            <p className="text-[12px] text-zinc-500 mt-3 px-3 py-2 rounded-md bg-zinc-50 border border-zinc-100">
              Add a reference URL above to enable the visual editor. Without slots, signatures are still recorded but won&rsquo;t be placed on the document.
            </p>
          )}
        </div>
      </form>
    </Modal>
  )
}
