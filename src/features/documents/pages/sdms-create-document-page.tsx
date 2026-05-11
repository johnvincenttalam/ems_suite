import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDocuments } from '@/features/documents/hooks/use-documents'
import { ArrowLeft, FileText, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { useUsers } from '@/features/users'
import { useDepartments } from '@/features/departments'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { documentsApi } from '@/features/documents/api/documents-api'
import { ApproverChainEditor } from '@/features/documents/components/approver-chain-editor'
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
import { formatFileSize } from '@/features/documents/components/file-icon'
import { cn } from '@/shared/utils/cn'

const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'xlsx', 'png', 'jpg', 'jpeg', 'svg'] as const
const MAX_FILE_BYTES = 50 * 1024 * 1024
const FILE_INPUT_ACCEPT = '.pdf,.docx,.xlsx,.png,.jpg,.jpeg,.svg,application/pdf,image/png,image/jpeg,image/svg+xml'

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
  if (ext === 'pdf') return 'pdf'
  if (ext === 'docx') return 'docx'
  if (ext === 'xlsx') return 'xlsx'
  if (ext === 'jpg' || ext === 'jpeg') return 'jpg'
  // png and svg both render through the image path in PreviewArea
  return 'png'
}

function isAllowedExtension(ext: string): boolean {
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext)
}

export function SdmsCreateDocumentPage() {
  const { user } = useAuthStore()
  const { data: users = [] } = useUsers()
  const { data: departments = [] } = useDepartments()
  const { data: templates = [] } = useWorkflowTemplates()
  const { data: allDocuments = [] } = useDocuments()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()

  const editId = searchParams.get('edit')
  const editingDoc = editId ? allDocuments.find((d) => d.id === editId) : undefined
  const isEditMode = !!editId
  const editLoading = isEditMode && allDocuments.length === 0
  const editNotFound = isEditMode && allDocuments.length > 0 && !editingDoc
  const editLocked = isEditMode && !!editingDoc && editingDoc.status !== 'draft'

  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [approvers, setApprovers] = useState<string[]>([])
  const [signatureSlots, setSignatureSlots] = useState<SignatureSlot[]>([])
  const [pickedFile, setPickedFile] = useState<File | null>(null)
  const [pickedFileUrl, setPickedFileUrl] = useState<string | null>(null)
  const [extractedBodyText, setExtractedBodyText] = useState<string | null>(null)
  /** 'idle' before any file is picked; 'extracting' while pdfjs runs;
   * 'extracted' once we have body text; 'unsupported' for non-PDF / failed
   * extraction (search just falls back to title/tags). */
  const [extractStatus, setExtractStatus] = useState<'idle' | 'extracting' | 'extracted' | 'unsupported'>('idle')
  const [existingAssetUrl, setExistingAssetUrl] = useState<string | undefined>(undefined)
  const [dragOver, setDragOver] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editPrefilledRef = useRef(false)

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)
  const effectiveAssetUrl = pickedFileUrl ?? existingAssetUrl ?? selectedTemplate?.referenceUrl

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

  // Reset prefill flag whenever the target draft changes — prevents the form
  // from sticking to a previous draft's values when navigating ?edit=A → ?edit=B.
  useEffect(() => {
    editPrefilledRef.current = false
  }, [editId])

  // Prefill the form once from the editing doc when it arrives.
  useEffect(() => {
    if (!isEditMode || !editingDoc || editPrefilledRef.current) return
    editPrefilledRef.current = true
    setValue('title', editingDoc.title)
    setValue('description', editingDoc.description ?? '')
    setValue('fileName', editingDoc.fileName)
    if (editingDoc.category) setValue('category', editingDoc.category)
    if (editingDoc.priority) setValue('priority', editingDoc.priority)
    if (editingDoc.confidentiality) setValue('confidentiality', editingDoc.confidentiality)
    if (editingDoc.departmentId) setValue('departmentId', editingDoc.departmentId)
    setTags(editingDoc.tags ?? [])
    setSignatureSlots(editingDoc.signatureSlots ?? [])
    // Blob URLs from a prior session don't survive page reload — treat them
    // as missing and force the user to re-pick the file.
    const url = editingDoc.assetUrl
    setExistingAssetUrl(url && !url.startsWith('blob:') ? url : undefined)
    if (url?.startsWith('blob:')) {
      toast.info('Original file is no longer available — pick the file again to preview it.')
    }
  }, [isEditMode, editingDoc, setValue])

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

  const updateDraftMutation = useMutation({
    mutationFn: ({ docId, patch }: { docId: string; patch: Parameters<typeof documentsApi.updateDraft>[1] }) => {
      if (!user) throw new Error('Not signed in')
      return documentsApi.updateDraft(docId, patch, user.id)
    },
    onSuccess: (doc) => {
      invalidate()
      toast.success(`Updated draft ${doc.trackingNumber ?? doc.id}`)
      navigate(getModulePath('sdms', 'documents'))
    },
    onError: (err) => {
      toast.error('Update failed', { description: err instanceof Error ? err.message : 'Unknown error' })
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

  const updateAndStartMutation = useMutation({
    mutationFn: async ({ docId, patch, approverIds }: { docId: string; patch: Parameters<typeof documentsApi.updateDraft>[1]; approverIds: string[] }) => {
      if (!user) throw new Error('Not signed in')
      await documentsApi.updateDraft(docId, patch, user.id)
      return documentsApi.startWorkflow(docId, approverIds, user.id)
    },
    onSuccess: (doc) => {
      invalidate()
      toast.success(`Submitted ${doc.trackingNumber ?? doc.id} — workflow started`)
      navigate(getModulePath('sdms', 'my-tasks'))
    },
    onError: (err) => {
      toast.error('Submit failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    },
  })

  const captureFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!isAllowedExtension(ext)) {
      toast.error(`Unsupported file type: .${ext || '?'}`, {
        description: 'Allowed: PDF, DOCX, XLSX, PNG, JPG, SVG',
      })
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error('File too large', { description: `Maximum size is ${formatFileSize(MAX_FILE_BYTES)}` })
      return
    }
    // Replacing a previously-picked file: revoke the old blob URL since it's
    // about to be orphaned. We DON'T revoke on unmount — submitted documents
    // need the URL to stay alive for the rest of the session so other users
    // (via the user-switcher) can open the doc and render it.
    if (pickedFileUrl) URL.revokeObjectURL(pickedFileUrl)
    const url = URL.createObjectURL(file)
    setPickedFile(file)
    setPickedFileUrl(url)
    setValue('fileName', file.name, { shouldValidate: true })

    // Reset previous extraction before kicking off a new one.
    setExtractedBodyText(null)
    const isPdfLike =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf') ||
      file.type === 'text/plain'
    if (isPdfLike) {
      setExtractStatus('extracting')
      // Lazy-load the extractor so pdfjs (which needs DOMMatrix) only enters
      // the bundle/runtime when a user actually picks a file. Without this
      // every test that pulls in this page via the documents barrel would
      // try to evaluate pdfjs in jsdom.
      import('@/features/documents/lib/extract-text')
        .then(({ extractTextFromFile }) => extractTextFromFile(file))
        .then((text) => {
          if (text && text.length > 0) {
            setExtractedBodyText(text)
            setExtractStatus('extracted')
          } else {
            setExtractStatus('unsupported')
          }
        })
        .catch(() => setExtractStatus('unsupported'))
    } else {
      // DOCX / images / other — no in-browser extraction available in the mock.
      setExtractStatus('unsupported')
    }

    toast.success(`File ready: ${file.name}`)
  }

  const removeFile = () => {
    if (pickedFileUrl) URL.revokeObjectURL(pickedFileUrl)
    setPickedFile(null)
    setPickedFileUrl(null)
    setExtractedBodyText(null)
    setExtractStatus('idle')
    if (selectedTemplate?.referenceUrl) {
      const inferredName = selectedTemplate.referenceUrl.split('/').pop() || ''
      setValue('fileName', inferredName, { shouldValidate: true })
    } else {
      setValue('fileName', '', { shouldValidate: true })
    }
  }

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) captureFile(file)
    e.target.value = ''
  }

  const onDropzoneDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!dragOver) setDragOver(true)
  }
  const onDropzoneDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }
  const onDropzoneDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) captureFile(file)
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
      return
    }
    const t = templates.find((x) => x.id === templateId)
    if (!t) return
    setApprovers(t.approverIds)
    setSignatureSlots(t.signatureSlots ?? [])
    if (t.category) setValue('category', t.category)
    // Only seed the filename from the template if the user hasn't picked a file.
    if (!pickedFile && t.referenceUrl && !getValues('fileName')) {
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
    // Preserve existing body text when editing without re-uploading the file;
    // otherwise carry through whatever the in-browser extractor produced.
    const bodyText =
      extractedBodyText ?? (isEditMode ? editingDoc?.bodyText : undefined)
    const sharedFields = {
      title: values.title,
      description: values.description,
      fileName: values.fileName,
      fileType: deriveFileType(values.fileName),
      fileSizeBytes: pickedFile?.size ?? editingDoc?.fileSizeBytes ?? Math.floor(100_000 + Math.random() * 900_000),
      category: values.category,
      priority: values.priority,
      confidentiality: values.confidentiality,
      departmentId: values.departmentId,
      tags: tags.length ? tags : undefined,
      signatureSlots: signatureSlots.length ? signatureSlots : undefined,
      assetUrl: effectiveAssetUrl,
      bodyText,
    }
    if (isEditMode && editingDoc) {
      updateDraftMutation.mutate({ docId: editingDoc.id, patch: sharedFields })
    } else {
      draftMutation.mutate({ ...sharedFields, createdBy: user.id })
    }
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
    const bodyText =
      extractedBodyText ?? (isEditMode ? editingDoc?.bodyText : undefined)
    const sharedFields = {
      title: values.title,
      description: values.description,
      fileName: values.fileName,
      fileType: deriveFileType(values.fileName),
      fileSizeBytes: pickedFile?.size ?? editingDoc?.fileSizeBytes ?? Math.floor(100_000 + Math.random() * 900_000),
      tags: tags.length ? tags : undefined,
      category: values.category,
      priority: values.priority,
      confidentiality: values.confidentiality,
      departmentId: values.departmentId,
      signatureSlots: signatureSlots.length ? signatureSlots : undefined,
      assetUrl: effectiveAssetUrl,
      bodyText,
    }
    if (isEditMode && editingDoc) {
      updateAndStartMutation.mutate({ docId: editingDoc.id, patch: sharedFields, approverIds: approvers })
    } else {
      submitMutation.mutate({ ...sharedFields, approvers, createdBy: user.id })
    }
  }

  const busy = draftMutation.isPending || submitMutation.isPending || updateDraftMutation.isPending || updateAndStartMutation.isPending
  const activeUsers = users.filter((u) => u.status === 'active' && u.id !== user?.id)
  const departmentNameById = new Map(departments.map((d) => [d.id, d.name]))

  if (editLoading) {
    return <div className="py-16 text-center text-[13px] text-zinc-500">Loading draft…</div>
  }
  if (editNotFound) {
    return (
      <div className="py-16 text-center">
        <p className="text-[14px] font-medium text-zinc-900">Draft not found</p>
        <p className="text-[12px] text-zinc-500 mt-1">It may have been deleted. Return to the documents list.</p>
        <button
          type="button"
          onClick={() => navigate(getModulePath('sdms', 'documents'))}
          className="mt-4 inline-flex items-center gap-1 text-[13px] text-accent hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Documents
        </button>
      </div>
    )
  }
  if (editLocked && editingDoc) {
    return (
      <div className="py-16 text-center">
        <p className="text-[14px] font-medium text-zinc-900">This document is no longer a draft</p>
        <p className="text-[12px] text-zinc-500 mt-1">
          Status is <span className="font-mono">{editingDoc.status}</span>. Only drafts can be edited.
        </p>
        <button
          type="button"
          onClick={() => navigate(getModulePath('sdms', `documents/${editingDoc.id}`))}
          className="mt-4 inline-flex items-center gap-1 text-[13px] text-accent hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Open document
        </button>
      </div>
    )
  }

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
        <span className="text-zinc-700">{isEditMode ? `Edit ${editingDoc?.trackingNumber ?? editingDoc?.id ?? ''}` : 'New'}</span>
      </div>

      <PageHeader
        title={isEditMode ? 'Edit Document' : 'Create Document'}
        subtitle={isEditMode
          ? 'Update draft details, file, approvers, and slot positions, then save or submit for approval.'
          : 'Upload a file, add metadata, choose approvers, and submit for approval.'}
      />

      <form className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-xl border border-zinc-200/60 bg-white p-5">
            <h2 className="text-[13px] font-semibold text-zinc-900 mb-3">File</h2>
            <input
              ref={fileInputRef}
              type="file"
              accept={FILE_INPUT_ACCEPT}
              onChange={onFileInputChange}
              className="hidden"
            />
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  fileInputRef.current?.click()
                }
              }}
              onDragOver={onDropzoneDragOver}
              onDragLeave={onDropzoneDragLeave}
              onDrop={onDropzoneDrop}
              className={cn(
                'w-full border border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-zinc-900/10',
                dragOver
                  ? 'border-emerald-400 bg-emerald-50/60'
                  : pickedFile
                  ? 'border-emerald-300 bg-emerald-50/50 hover:border-emerald-400'
                  : fileName
                  ? 'border-zinc-300 bg-zinc-50/40 hover:border-zinc-400'
                  : errors.fileName
                  ? 'border-red-300 bg-red-50/40 hover:border-red-400'
                  : 'border-zinc-300 hover:border-zinc-400',
              )}
            >
              {pickedFile ? (
                <>
                  <FileText className="w-7 h-7 text-emerald-600 mb-2" />
                  <p className="text-[13px] text-zinc-900 font-medium">{pickedFile.name}</p>
                  <p className="text-[11px] text-zinc-500 mt-1">{formatFileSize(pickedFile.size)} · click to replace</p>
                  {extractStatus !== 'idle' && (
                    <p className={cn(
                      'mt-2 text-[10.5px] inline-flex items-center gap-1',
                      extractStatus === 'extracting' && 'text-zinc-500',
                      extractStatus === 'extracted' && 'text-emerald-700',
                      extractStatus === 'unsupported' && 'text-amber-700',
                    )}>
                      {extractStatus === 'extracting' && (
                        <>
                          <span className="inline-block w-2.5 h-2.5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
                          Extracting text for search…
                        </>
                      )}
                      {extractStatus === 'extracted' && extractedBodyText && (
                        <>✓ Indexed for search · {extractedBodyText.length.toLocaleString()} chars</>
                      )}
                      {extractStatus === 'unsupported' && (
                        <>⚠ Searchable by title / tags only (text extraction needs a real backend for this format)</>
                      )}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeFile() }}
                    className="mt-3 inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                    Remove file
                  </button>
                </>
              ) : fileName ? (
                <>
                  <FileText className="w-7 h-7 text-zinc-400 mb-2" />
                  <p className="text-[13px] text-zinc-700 font-medium">{fileName}</p>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    {editingDoc
                      ? `${formatFileSize(editingDoc.fileSizeBytes)} · click to replace`
                      : 'From template — click to upload your own file'}
                  </p>
                </>
              ) : (
                <>
                  <Upload className="w-7 h-7 text-zinc-400 mb-2" />
                  <p className="text-[13px] text-zinc-700 font-medium">Drag &amp; drop a file here, or click to browse</p>
                  <p className="text-[11px] text-zinc-400 mt-1">PDF, DOCX, XLSX, PNG, JPG, SVG — up to 50 MB</p>
                </>
              )}
            </div>
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
              <ApproverChainEditor
                approverIds={approvers}
                users={users}
                onChange={setApprovers}
                className="mb-3"
              />
            )}
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {activeUsers.map((u) => {
                const selected = approvers.includes(u.id)
                const deptName = u.departmentId ? departmentNameById.get(u.departmentId) : undefined
                const positionLine = u.position ?? u.email
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
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium text-zinc-900 truncate">{u.name}</p>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {positionLine}
                        {deptName && <span className="text-zinc-300"> · {deptName}</span>}
                      </p>
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
                loading={draftMutation.isPending || updateDraftMutation.isPending}
                onClick={handleSubmit(onSaveDraft)}
              >
                {isEditMode ? 'Save Changes' : 'Save Draft'}
              </Button>
              <Button
                type="button"
                fullWidth
                disabled={busy}
                loading={submitMutation.isPending || updateAndStartMutation.isPending}
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
