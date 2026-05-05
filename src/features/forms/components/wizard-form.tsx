import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ArrowLeft, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'
import { Select } from '@/shared/ui/select'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/utils/cn'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.email('Enter a valid email'),
  company: z.string().optional(),
  plan: z.string().min(1, 'Select a plan'),
  seats: z.string().min(1, 'Enter number of seats'),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const steps = [
  { id: 'contact', title: 'Contact', description: 'Who are you?', fields: ['name', 'email', 'company'] as const },
  { id: 'plan', title: 'Plan', description: 'Choose a plan', fields: ['plan', 'seats'] as const },
  { id: 'review', title: 'Review', description: 'Confirm & submit', fields: [] as const },
]

export function WizardForm() {
  const [step, setStep] = useState(0)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { name: '', email: '', company: '', plan: '', seats: '', notes: '' },
  })

  const next = async () => {
    const fields = steps[step].fields
    if (fields.length > 0) {
      const ok = await form.trigger(fields as any)
      if (!ok) return
    }
    setStep((s) => Math.min(s + 1, steps.length - 1))
  }

  const prev = () => setStep((s) => Math.max(s - 1, 0))

  const onSubmit = (values: FormValues) => {
    toast.success('Form submitted', { description: `Welcome, ${values.name}!` })
    form.reset()
    setStep(0)
  }

  const values = form.watch()

  return (
    <div className="max-w-2xl">
      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 flex-1">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 transition-colors',
              i < step && 'bg-emerald-500 text-white',
              i === step && 'bg-zinc-900 text-white',
              i > step && 'bg-zinc-100 text-zinc-500'
            )}>
              {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-[12px] font-medium truncate',
                i === step ? 'text-zinc-900' : 'text-zinc-500'
              )}>{s.title}</p>
            </div>
            {i < steps.length - 1 && (
              <div className={cn('h-px flex-1', i < step ? 'bg-emerald-500' : 'bg-zinc-200')} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {step === 0 && (
              <>
                <Input label="Full Name" {...form.register('name')} error={form.formState.errors.name?.message} />
                <Input label="Email" type="email" {...form.register('email')} error={form.formState.errors.email?.message} />
                <Input label="Company (optional)" {...form.register('company')} />
              </>
            )}

            {step === 1 && (
              <>
                <Select
                  label="Plan"
                  placeholder="Choose a plan"
                  {...form.register('plan')}
                  error={form.formState.errors.plan?.message}
                  options={[
                    { label: 'Starter — $9/mo', value: 'starter' },
                    { label: 'Pro — $29/mo', value: 'pro' },
                    { label: 'Enterprise — Contact us', value: 'enterprise' },
                  ]}
                />
                <Input
                  label="Seats"
                  type="number"
                  min={1}
                  {...form.register('seats')}
                  error={form.formState.errors.seats?.message}
                />
                <Textarea label="Notes (optional)" rows={3} {...form.register('notes')} />
              </>
            )}

            {step === 2 && (
              <div className="space-y-3 p-4 rounded-lg bg-zinc-50 border border-zinc-100">
                <h4 className="text-sm font-semibold text-zinc-900">Review your details</h4>
                <dl className="text-[13px] space-y-1.5">
                  <div className="flex justify-between"><dt className="text-zinc-500">Name</dt><dd className="text-zinc-900 font-medium">{values.name}</dd></div>
                  <div className="flex justify-between"><dt className="text-zinc-500">Email</dt><dd className="text-zinc-900 font-medium">{values.email}</dd></div>
                  {values.company && <div className="flex justify-between"><dt className="text-zinc-500">Company</dt><dd className="text-zinc-900 font-medium">{values.company}</dd></div>}
                  <div className="flex justify-between"><dt className="text-zinc-500">Plan</dt><dd className="text-zinc-900 font-medium capitalize">{values.plan}</dd></div>
                  <div className="flex justify-between"><dt className="text-zinc-500">Seats</dt><dd className="text-zinc-900 font-medium">{values.seats}</dd></div>
                </dl>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-zinc-100">
          <Button type="button" variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={prev} disabled={step === 0}>
            Back
          </Button>
          {step < steps.length - 1 ? (
            <Button type="button" rightIcon={<ArrowRight className="w-4 h-4" />} onClick={next}>
              Next
            </Button>
          ) : (
            <Button type="submit" leftIcon={<Check className="w-4 h-4" />}>Submit</Button>
          )}
        </div>
      </form>
    </div>
  )
}
