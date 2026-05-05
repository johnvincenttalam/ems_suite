import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Check, X } from 'lucide-react'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/utils/cn'

const schema = z.object({
  username: z.string()
    .min(3, 'At least 3 characters')
    .max(20, 'At most 20 characters')
    .regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, and underscores'),
  email: z.email('Enter a valid email'),
  age: z.string()
    .regex(/^\d+$/, 'Enter a valid age')
    .refine((v) => Number(v) >= 18, 'You must be at least 18')
    .refine((v) => Number(v) <= 120, 'Enter a realistic age'),
  website: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
  password: z.string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must include an uppercase letter')
    .regex(/[0-9]/, 'Must include a number')
    .regex(/[^A-Za-z0-9]/, 'Must include a symbol'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match',
})

type FormValues = z.infer<typeof schema>

const passwordRules = [
  { test: (v: string) => v.length >= 8, label: 'At least 8 characters' },
  { test: (v: string) => /[A-Z]/.test(v), label: 'Uppercase letter' },
  { test: (v: string) => /[0-9]/.test(v), label: 'Number' },
  { test: (v: string) => /[^A-Za-z0-9]/.test(v), label: 'Symbol' },
]

export function ValidationForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
  })

  const password = form.watch('password') ?? ''

  const onSubmit = (data: FormValues) => {
    toast.success('Account created', { description: `Hello, ${data.username}!` })
    form.reset()
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-xl space-y-4">
      <Input
        label="Username"
        placeholder="jane_doe"
        {...form.register('username')}
        error={form.formState.errors.username?.message}
        helperText="Lowercase letters, numbers, underscores · 3-20 chars"
      />

      <Input
        label="Email"
        type="email"
        placeholder="jane@example.com"
        {...form.register('email')}
        error={form.formState.errors.email?.message}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Age"
          type="number"
          {...form.register('age')}
          error={form.formState.errors.age?.message}
        />
        <Input
          label="Website (optional)"
          placeholder="https://..."
          {...form.register('website')}
          error={form.formState.errors.website?.message}
        />
      </div>

      <div>
        <Input
          label="Password"
          type="password"
          {...form.register('password')}
          error={form.formState.errors.password?.message}
        />
        <ul className="mt-2 grid grid-cols-2 gap-1.5">
          {passwordRules.map((rule) => {
            const ok = rule.test(password)
            return (
              <li key={rule.label} className={cn(
                'flex items-center gap-1.5 text-[12px]',
                ok ? 'text-emerald-600' : 'text-zinc-400'
              )}>
                {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                {rule.label}
              </li>
            )
          })}
        </ul>
      </div>

      <Input
        label="Confirm Password"
        type="password"
        {...form.register('confirmPassword')}
        error={form.formState.errors.confirmPassword?.message}
      />

      <div className="pt-2 flex gap-3">
        <Button type="submit" loading={form.formState.isSubmitting}>Create Account</Button>
        <Button type="button" variant="ghost" onClick={() => form.reset()}>Reset</Button>
      </div>

      {form.formState.isSubmitSuccessful && (
        <p className="text-[13px] text-emerald-600">Account created successfully</p>
      )}
    </form>
  )
}
