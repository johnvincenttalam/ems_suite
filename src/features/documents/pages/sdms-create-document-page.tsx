import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { useUsers } from '@/features/users'
import { useDepartments } from '@/features/departments'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { documentsApi } from '@/features/documents/api/documents-api'
import { useWorkflowTemplates } from '@/features/documents/hooks/use-workflow-templates'
import {
  CATEGORY_LABEL,
  CONFIDENTIALITY_LABEL,
  PRIORITY_LABEL,
  type DocumentCategory,
  type DocumentConfidentiality,
  type DocumentFileType,
  type DocumentPriority,
  type SignatureSlot,
} from '@/features/documents/types'
import { getModulePath } from '@/config/modules'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Textarea } from '@/shared/ui/textarea'
import { Avatar } from '@/shared/ui/avatar'
import { PageHeader } from '@/shared/ui/page-header'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { cn } from '@/shared/utils/cn'

const KNOWN_EXTENSIONS: DocumentFileType[] = ['pdf', 'docx', 'xlsx', 'png', 'jpg']

const schema = z.object({
  title: z.string().min(2, 'Title is required'),
  description: z.string().optional(),
  fileName: z.string().min(2, 'File is required'),
  category: z.enum(['legal', 'finance', 'hr', 'procurement', 'operations', 'engineering', 'compliance', 'other']),
  departmentId: z.string().min(1, 'Department is required'),
  priority: z.enum(['low', 'normal', 'urgent']),
  confidentiality: z.enum(['public', 'internal', 'confidential']),
})

type FormValues = z.infer<typeof schema>

const CATEGORY_OPTIONS = (Object.keys(CATEGORY_LABEL) as DocumentCategory[]).map((k) => ({
  value: k,
  label: CATEGORY_LABEL[k],
}))

const PRIORITY_OPTIONS = (Object.keys(PRIORITY_LABEL) as DocumentPriority[]).map((k) => ({
  value: k,
  label: PRIORITY_LABEL[k],
}))

const CONFIDENTIALITY_OPTIONS = (Object.keys(CONFIDENTIALITY_LABEL) as DocumentConfidentiality[]).map((k) => ({
  value: k,
  label: CONFIDENTIALITY_LABEL[k],
}))

function deriveFileType(fileName: string): DocumentFileType {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  return (KNOWN_EXTENSIONS.includes(ext as DocumentFileType) ? ext : 'pdf') as DocumentFileType
}

export function SdmsCreateDocumentPage() {
  const { user } = useAuthStore()
  const { data: users = [] } = useUsers()
  const { data: departments = [] } = useDepartments()
  const { data: templates = [] } = useWorkflowTemplates()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [approvers, setApprovers] = useState<string[]>([])
  const [signatureSlots, setSignatureSlots] = useState<SignatureSlot[]>([])
  const [assetUrl, setAssetUrl] = useState<string | undefined>(undefined)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false)

  const { register, handleSubmit, formState: { errors }, setValue, watch, getValues } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      fileName: '',
      category: 'other',
      departmentId: '',
      priority: 'normal',
      confidentiality: 'internal',
    },
  })

  const fileName = watch('fileName')

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['documents'] })
    queryClient.invalidateQueries({ queryKey: ['audit-log'] })
  }

  const draftMutation = useMutation({
    mutationFn: documentsApi.createDraft,
    onSuccess: (doc) => {
      invalidate()
      toast.success(`Saved draft ${doc.trackingNumber ?? doc.id}`)
      navigate(getModulePath('sdms', 'documents'))
    },
    onError: (err) => {
      toast.error('Save draft failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    },
  })

  const submitMutation = useMutation({
    mutationFn: documentsApi.upload,
    onSuccess: (doc) => {
      invalidate()
      toast.success(`Submitted ${doc.trackingNumber ?? doc.id} — workflow started`)
      navigate(getModulePath('sdms', 'my-tasks'))
    },
    onError: (err) => {
      toast.error('Submit failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    },
  })

  const pickMockFile = () => {
    const fake = `document-${Date.now()}.pdf`
    setValue('fileName', fake, { shouldValidate: true })
    toast.info(`Mock file selected: ${fake}`)
  }

  const addTag = () => {
    const trimmed = tagInput.trim()
    if (!trimmed) return
    if (tags.includes(trimmed)) {
      setTagInput('')
      return
    }
    setTags([...tags, trimmed])
    setTagInput('')
  }

  const applyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId)
    if (!templateId) {
      setSignatureSlots([])
      setAssetUrl(undefined)
      return
    }
    const t = templates.find((x) => x.id === templateId)
    if (!t) return
    setApprovers(t.approverIds)
    setSignatureSlots(t.signatureSlots ?? [])
    setAssetUrl(t.referenceUrl)
    if (t.category) setValue('category', t.category)
    if (t.referenceUrl && !getValues('fileName')) {
      const inferredName = t.referenceUrl.split('/').pop() || 'document.pdf'
      setValue('fileName', inferredName, { shouldValidate: true })
    }
    const slotSuffix = t.signatureSlots?.length
      ? ` · ${t.signatureSlots.length} signature slot${t.signatureSlots.length === 1 ? '' : 's'} preset`
      : ''
    toast.success(`Applied template: ${t.name}${slotSuffix}`)
  }

  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t))

  const toggleApprover = (id: string) => {
    setApprovers((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
  }

  const onSaveDraft = (values: FormValues) => {
    if (!user) {
      toast.error('Not signed in')
      return
    }
    draftMutation.mutate({
      title: values.title,
      description: values.description,
      fileName: values.fileName,
      fileType: deriveFileType(values.fileName),
      fileSizeBytes: Math.floor(100_000 + Math.random() * 900_000),
      category: values.category,
      priority: values.priority,
      confidentiality: values.confidentiality,
      departmentId: values.departmentId,
      tags: tags.length ? tags : undefined,
      createdBy: user.id,
      signatureSlots: signatureSlots.length ? signatureSlots : undefined,
      assetUrl,
    })
  }

  const onSubmitForApproval = (values: FormValues) => {
    if (!user) {
      toast.error('Not signed in')
      return
    }
    if (approvers.length === 0) {
      toast.error('Add at least one approver before submitting')
      return
    }
    submitMutation.mutate({
      title: values.title,
      description: values.description,
      fileName: values.fileName,
      fileType: deriveFileType(values.fileName),
      fileSizeBytes: Math.floor(100_000 + Math.random() * 900_000),
      approvers,
      tags: tags.length ? tags : undefined,
      category: values.category,
      priority: values.priority,
      confidentiality: values.confidentiality,
      departmentId: values.departmentId,
      createdBy: user.id,
      signatureSlots: signatureSlots.length ? signatureSlots : undefined,
      assetUrl,
    })
  }

  const busy = draftMutation.isPending || submitMutation.isPending
  const activeUsers = users.filter((u) => u.status === 'active' && u.id !== user?.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-[13px] text-zinc-500">
        <button
          type="button"
          onClick={() => navigate(getModulePath('sdms', 'documents'))}
          className="inline-flex items-center gap-1 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Documents
        </button>
        <span>/</span>
        <span className="text-zinc-700">New</span>
      </div>

      <PageHeader
        title="Create Document"
        subtitle="Upload a file, add metadata, choose approvers, and submit for approval."
      />

      <form className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-xl border border-zinc-200/60 bg-white p-5">
            <h2 className="text-[13px] font-semibold text-zinc-900 mb-3">File</h2>
            <button
              type="button"
              onClick={pickMockFile}
              className={cn(
                'w-full border border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-colors',
                fileName
                  ? 'border-emerald-300 bg-emerald-50/50 hover:border-emerald-400'
                  : errors.fileName
                  ? 'border-red-300 bg-red-50/40 hover:border-red-400'
                  : 'border-zinc-300 hover:border-zinc-400',
              )}
            >
              {fileName ? (
                <>
                  <FileText className="w-7 h-7 text-emerald-600 mb-2" />
                  <p className="text-[13px] text-zinc-900 font-medium">{fileName}</p>
                  <p className="text-[11px] text-zinc-500 mt-1">Click to choose a different file</p>
                </>
              ) : (
                <>
                  <Upload className="w-7 h-7 text-zinc-400 mb-2" />
                  <p className="text-[13px] text-zinc-700 font-medium">Drag &amp; drop a file here, or click to browse</p>
                  <p className="text-[11px] text-zinc-400 mt-1">PDF, DOCX, XLSX, PNG, JPG up to 50 MB</p>
                </>
              )}
            </button>
            <input type="hidden" {...register('fileName')} />
            {errors.fileName && <p className="text-xs text-red-600 mt-2">{errors.fileName.message}</p>}
          </section>

          <section className="rounded-xl border border-zinc-200/60 bg-white p-5 space-y-4">
            <h2 className="text-[13px] font-semibold text-zinc-900">Details</h2>

            <Input
              label="Title *"
              placeholder="e.g. Q3 Budget Proposal"
              {...register('title')}
              error={errors.title?.message}
            />

            <Textarea
              label="Description"
              rows={3}
              placeholder="Short summary of the document's purpose"
              {...register('description')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Type *"
                placeholder="Select document type"
                options={CATEGORY_OPTIONS}
                {...register('category')}
                error={errors.category?.message}
              />
              <Select
                label="Department *"
                placeholder="Select department"
                options={departments.map((d) => ({ value: d.id, label: d.name }))}
                {...register('departmentId')}
                error={errors.departmentId?.message}
              />
              <Select
                label="Priority"
                options={PRIORITY_OPTIONS}
                {...register('priority')}
                error={errors.priority?.message}
              />
              <Select
                label="Confidentiality"
                options={CONFIDENTIALITY_OPTIONS}
                {...register('confidentiality')}
                error={errors.confidentiality?.message}
              />
            </div>

            <div>
              <label className="text-[13px] font-medium text-zinc-700 block mb-1.5">Tags</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                  placeholder="Add a tag and press Enter"
                  className="flex-1 h-10 px-3 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-400"
                />
                <Button type="button" variant="secondary" onClick={addTag}>Add</Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-100 text-[12px] text-zinc-700">
                      {t}
                      <button type="button" onClick={() => removeTag(t)} className="text-zinc-400 hover:text-red-600">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-zinc-200/60 bg-white p-5">
            <h2 className="text-[13px] font-semibold text-zinc-900 mb-3">Workflow Template</h2>
            <Select
              value={selectedTemplateId}
              onChange={(e) => applyTemplate(e.target.value)}
              placeholder="— Choose a template (optional) —"
              options={templates.map((t) => ({ value: t.id, label: t.name }))}
            />
            {selectedTemplateId && (
              <p className="text-[11px] text-zinc-500 mt-2">
                {templates.find((t) => t.id === selectedTemplateId)?.description}
              </p>
            )}
            {signatureSlots.length > 0 && (
              <p className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200">
                {signatureSlots.length} signature slot{signatureSlots.length === 1 ? '' : 's'} preset
              </p>
            )}
            <p className="text-[11px] text-zinc-400 mt-2">
              Picking a template fills in the approvers below. You can still edit the list after.
            </p>
          </section>

          <section className="rounded-xl border border-zinc-200/60 bg-white p-5">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-[13px] font-semibold text-zinc-900">Approvers</h2>
              <span className="text-[11px] text-zinc-400">in order</span>
            </div>
            {approvers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3 p-2 rounded-lg bg-zinc-50 border border-zinc-200/60">
                {approvers.map((id, idx) => {
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
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {activeUsers.map((u) => {
                const selected = approvers.includes(u.id)
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleApprover(u.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2.5 py-2 rounded-md border text-left transition-colors',
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
            <p className="text-[11px] text-zinc-400 mt-3">
              Required for &ldquo;Submit for Approval&rdquo;. Drafts can be saved without approvers.
            </p>
          </section>

          <section className="rounded-xl border border-zinc-200/60 bg-white p-5">
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                disabled={busy}
                loading={draftMutation.isPending}
                onClick={handleSubmit(onSaveDraft)}
              >
                Save Draft
              </Button>
              <Button
                type="button"
                fullWidth
                disabled={busy}
                loading={submitMutation.isPending}
                onClick={handleSubmit(onSubmitForApproval)}
              >
                Submit for Approval
              </Button>
              <Button
                type="button"
                variant="ghost"
                fullWidth
                disabled={busy}
                onClick={() => {
                  const t = getValues('title')
                  if (t || fileName) {
                    setDiscardConfirmOpen(true)
                    return
                  }
                  navigate(getModulePath('sdms', 'documents'))
                }}
              >
                Cancel
              </Button>
            </div>
          </section>
        </aside>
      </form>

      <ConfirmDialog
        open={discardConfirmOpen}
        onCancel={() => setDiscardConfirmOpen(false)}
        onConfirm={() => {
          setDiscardConfirmOpen(false)
          navigate(getModulePath('sdms', 'documents'))
        }}
        title="Discard this document?"
        message="Your changes won't be saved. This action can't be undone."
        confirmLabel="Discard"
        tone="danger"
      />
    </div>
  )
}
