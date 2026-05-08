import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BookmarkPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '@/shared/ui/modal'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'
import { storageApi } from '@/features/documents/api/storage-api'
import { useAuthStore } from '@/features/auth'
import type { AppDocument } from '@/features/documents/types'

const formSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  description: z.string().optional(),
  tags: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface AddToStorageModalProps {
  document: AppDocument | null
  onClose: () => void
}

/**
 * Add to Storage modal. Pre-fills Title from the document; collects an
 * optional description and a comma-separated tag string. The document's
 * existing tags appear as one-click suggestions so the user can adopt them
 * without retyping.
 */
export function AddToStorageModal({ document, onClose }: AddToStorageModalProps) {
  const currentUser = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [tagText, setTagText] = useState('')

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: '', description: '', tags: '' },
  })

  // Pre-fill the form whenever a document is opened. Reset is split so the
  // controlled tag-text state stays in sync with RHF's `tags` value.
  useEffect(() => {
    if (!document) return
    reset({
      title: document.title,
      description: '',
      tags: '',
    })
    setTagText('')
  }, [document, reset])

  const addMutation = useMutation({
    mutationFn: (data: FormValues) => {
      if (!currentUser) throw new Error('Not signed in')
      if (!document) throw new Error('No document selected')
      const tags = (data.tags ?? '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
      return storageApi.add({
        documentId: document.id,
        ownerName: currentUser.name,
        title: data.title,
        description: data.description,
        tags,
      })
    },
    onSuccess: ({ alreadyExisted }) => {
      if (alreadyExisted) {
        toast.message('Already in Storage', {
          description: 'This document is already saved in your vault — opening the existing record.',
        })
      } else {
        toast.success('Added to Storage')
      }
      queryClient.invalidateQueries({ queryKey: ['storage'] })
      queryClient.invalidateQueries({ queryKey: ['audit-log'] })
      onClose()
    },
    onError: (err) => toast.error('Save failed', {
      description: err instanceof Error ? err.message : 'Unknown error',
    }),
  })

  const tagSuggestions = (document?.tags ?? []).slice(0, 8)

  /** Append a suggested tag to the comma-separated string (without dupes). */
  const appendTag = (tag: string) => {
    const current = tagText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    if (current.includes(tag)) return
    const next = [...current, tag].join(', ')
    setTagText(next)
    setValue('tags', next, { shouldDirty: true })
  }

  return (
    <Modal
      open={!!document}
      onClose={onClose}
      title={document ? `Add to Storage` : 'Add to Storage'}
      size="md"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={addMutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-to-storage-form"
            leftIcon={<BookmarkPlus className="w-4 h-4" />}
            loading={addMutation.isPending}
          >
            Add to Storage
          </Button>
        </>
      }
    >
      <form
        id="add-to-storage-form"
        onSubmit={handleSubmit((d) => addMutation.mutate(d))}
        className="space-y-4"
      >
        <p className="text-[12px] text-zinc-500">
          Storage saves a reference to the document — no file is duplicated. You can edit the title
          and description independently of the source document.
        </p>

        <Input
          label="Title *"
          {...register('title')}
          error={errors.title?.message}
        />

        <Textarea
          label="Description"
          rows={2}
          placeholder="Optional note for yourself"
          {...register('description')}
        />

        <div>
          <Input
            label="Tags"
            placeholder="comma-separated, e.g. policy, q1, vendor"
            value={tagText}
            onChange={(e) => {
              setTagText(e.target.value)
              setValue('tags', e.target.value, { shouldDirty: true })
            }}
          />
          {tagSuggestions.length > 0 && (
            <div className="mt-2">
              <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium mb-1.5">
                From this document
              </p>
              <div className="flex flex-wrap gap-1.5">
                {tagSuggestions.map((tag) => {
                  const used = tagText
                    .split(',')
                    .map((t) => t.trim())
                    .includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      disabled={used}
                      onClick={() => appendTag(tag)}
                      className={
                        used
                          ? 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md border bg-zinc-50 text-zinc-400 border-zinc-200 text-[11px] cursor-default'
                          : 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md border bg-white text-zinc-600 border-zinc-200 text-[11px] hover:border-zinc-400 hover:text-zinc-900 transition-colors'
                      }
                    >
                      <X className={used ? 'w-2.5 h-2.5 -ml-0.5' : 'w-2.5 h-2.5 -ml-0.5 rotate-45'} />
                      {tag}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </form>
    </Modal>
  )
}
