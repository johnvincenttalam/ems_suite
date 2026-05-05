import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Textarea } from '@/shared/ui/textarea'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/utils/cn'
import { motion, AnimatePresence } from 'framer-motion'

const schema = z.object({
  accountType: z.enum(['personal', 'business', 'nonprofit']),
  fullName: z.string().optional(),
  companyName: z.string().optional(),
  taxId: z.string().optional(),
  orgName: z.string().optional(),
  missionStatement: z.string().optional(),
  contactEmail: z.email('Enter a valid email'),
  needsInvoicing: z.boolean().optional(),
  billingEmail: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.accountType === 'personal' && !data.fullName) {
    ctx.addIssue({ code: 'custom', path: ['fullName'], message: 'Full name is required' })
  }
  if (data.accountType === 'business') {
    if (!data.companyName) ctx.addIssue({ code: 'custom', path: ['companyName'], message: 'Company name is required' })
    if (!data.taxId) ctx.addIssue({ code: 'custom', path: ['taxId'], message: 'Tax ID is required' })
  }
  if (data.accountType === 'nonprofit') {
    if (!data.orgName) ctx.addIssue({ code: 'custom', path: ['orgName'], message: 'Organization name is required' })
  }
  if (data.needsInvoicing && !data.billingEmail) {
    ctx.addIssue({ code: 'custom', path: ['billingEmail'], message: 'Billing email is required' })
  }
})

type FormValues = z.infer<typeof schema>

export function ConditionalForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      accountType: 'personal',
      needsInvoicing: false,
    },
  })

  const accountType = form.watch('accountType')
  const needsInvoicing = form.watch('needsInvoicing')

  const onSubmit = (data: FormValues) => {
    toast.success('Account created', { description: `Type: ${data.accountType}` })
    form.reset()
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-xl space-y-4">
      {/* Account type segmented */}
      <div>
        <label className="block text-[13px] font-medium text-zinc-700 mb-1.5">Account type</label>
        <div className="grid grid-cols-3 gap-2">
          {(['personal', 'business', 'nonprofit'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => form.setValue('accountType', type, { shouldValidate: true })}
              className={cn(
                'px-3 py-2 rounded-lg border text-[13px] font-medium capitalize transition-colors cursor-pointer',
                accountType === type ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Conditional fields */}
      <AnimatePresence mode="wait">
        <motion.div
          key={accountType}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="space-y-4"
        >
          {accountType === 'personal' && (
            <Input label="Full Name" {...form.register('fullName')} error={form.formState.errors.fullName?.message} />
          )}
          {accountType === 'business' && (
            <>
              <Input label="Company Name" {...form.register('companyName')} error={form.formState.errors.companyName?.message} />
              <Input label="Tax ID / VAT Number" {...form.register('taxId')} error={form.formState.errors.taxId?.message} />
            </>
          )}
          {accountType === 'nonprofit' && (
            <>
              <Input label="Organization Name" {...form.register('orgName')} error={form.formState.errors.orgName?.message} />
              <Textarea label="Mission Statement (optional)" rows={2} {...form.register('missionStatement')} />
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <Input label="Contact Email" type="email" {...form.register('contactEmail')} error={form.formState.errors.contactEmail?.message} />

      {/* Toggle reveals another field */}
      <label className="flex items-start gap-3 p-3 rounded-lg border border-zinc-200 cursor-pointer hover:border-zinc-300">
        <input type="checkbox" {...form.register('needsInvoicing')} className="mt-0.5" />
        <div>
          <p className="text-[13px] font-medium text-zinc-900">Send invoices</p>
          <p className="text-[12px] text-zinc-500 mt-0.5">Email monthly invoices to a separate billing address</p>
        </div>
      </label>

      <AnimatePresence>
        {needsInvoicing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-1">
              <Select
                label="Billing Email"
                placeholder="Select an email"
                {...form.register('billingEmail')}
                error={form.formState.errors.billingEmail?.message}
                options={[
                  { label: 'billing@company.com', value: 'billing@company.com' },
                  { label: 'finance@company.com', value: 'finance@company.com' },
                  { label: 'accounts@company.com', value: 'accounts@company.com' },
                ]}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pt-2">
        <Button type="submit">Create Account</Button>
      </div>
    </form>
  )
}
