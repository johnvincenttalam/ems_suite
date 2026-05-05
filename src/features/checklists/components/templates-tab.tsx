import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { ListChecks, Plus, Trash2, FileText } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { useTemplates, useAssignments } from '@/features/checklists'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Modal } from '@/shared/ui/modal'
import { Textarea } from '@/shared/ui/textarea'
import { Toggle } from '@/shared/ui/toggle'
import { Controller } from 'react-hook-form'
import { EmptyState } from '@/shared/ui/empty-state'
import { TableSkeleton } from '@/shared/ui/table-skeleton'

const templateSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  description: z.string().optional(),
  items: z.array(z.object({
    label: z.string().min(2, 'Item text is required'),
    required: z.boolean(),
  })).min(1, 'Add at least one item'),
})

type TemplateForm = z.infer<typeof templateSchema>

export function TemplatesTab() {
  const { data: templates = [], isLoading } = useTemplates()
  const { data: assignments = [] } = useAssignments()
  const [showNew, setShowNew] = useState(false)

  const usageCount = (templateId: string) => assignments.filter((a) => a.templateId === templateId).length

  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<TemplateForm>({
    resolver: zodResolver(templateSchema),
    defaultValues: { items: [{ label: '', required: true }] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const close = () => {
    reset({ items: [{ label: '', required: true }] })
    setShowNew(false)
  }

  const onSubmit = (_data: TemplateForm) => {
    close()
    toast.success('Checklist template created')
  }

  if (isLoading) return <TableSkeleton columns={3} rows={4} />

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[13px] text-zinc-500">Reusable checklist definitions. Use these when assigning to a user or attaching to a work order.</p>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowNew(true)}>New Template</Button>
      </div>

      {templates.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200/60">
          <EmptyState icon={ListChecks} title="No templates yet" description="Create your first checklist template to start assigning checks." />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((tpl) => {
            const requiredCount = tpl.items.filter((i) => i.required).length
            return (
              <div key={tpl.id} className="bg-white rounded-xl border border-zinc-200/60 p-5 flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0"><FileText className="w-4 h-4 text-zinc-500" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11px] text-zinc-400">{tpl.id}</p>
                    <p className="text-[14px] font-semibold text-zinc-900 truncate">{tpl.name}</p>
                    {tpl.description && <p className="text-[12px] text-zinc-500 mt-0.5 line-clamp-2">{tpl.description}</p>}
                  </div>
                </div>

                <ul className="space-y-1 mb-3 flex-1">
                  {tpl.items.slice(0, 4).map((item) => (
                    <li key={item.id} className="flex items-start gap-2 text-[12px]">
                      <span className={item.required ? 'text-zinc-400' : 'text-zinc-300'}>{item.required ? '●' : '○'}</span>
                      <span className="text-zinc-600 truncate">{item.label}</span>
                    </li>
                  ))}
                  {tpl.items.length > 4 && <li className="text-[11px] text-zinc-400">+ {tpl.items.length - 4} more</li>}
                </ul>

                <div className="flex items-center justify-between border-t border-zinc-100 pt-3 text-[11px] text-zinc-400">
                  <span>{tpl.items.length} items · {requiredCount} required</span>
                  <span>{usageCount(tpl.id)} runs · {format(parseISO(tpl.createdAt), 'MMM yyyy')}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={showNew} onClose={close} title="New Checklist Template" size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Name *" {...register('name')} error={errors.name?.message} placeholder="e.g. Daily forklift safety check" />
          <Textarea label="Description" {...register('description')} rows={2} />

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[13px] font-medium text-zinc-700">Items *</label>
              <button type="button" onClick={() => append({ label: '', required: true })} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-zinc-700 hover:text-zinc-900">
                <Plus className="w-3.5 h-3.5" />
                Add item
              </button>
            </div>
            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div key={field.id} className="grid grid-cols-[1fr_auto_36px] gap-2 items-center">
                  <Input {...register(`items.${idx}.label`)} placeholder="Item description" error={errors.items?.[idx]?.label?.message} />
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-zinc-200 bg-zinc-50/40">
                    <Controller
                      control={control}
                      name={`items.${idx}.required`}
                      render={({ field: f }) => <Toggle checked={f.value} onChange={f.onChange} />}
                    />
                    <span className="text-[12px] text-zinc-600">Required</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => fields.length > 1 && remove(idx)}
                    disabled={fields.length === 1}
                    className="h-10 w-9 inline-flex items-center justify-center rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:text-zinc-400 disabled:hover:bg-transparent transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            {errors.items?.message && <p className="text-xs text-red-600 mt-1">{errors.items.message}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth onClick={close}>Cancel</Button>
            <Button type="submit" fullWidth>Create Template</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
