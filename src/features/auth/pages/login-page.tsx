import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { appConfig } from '@/config/app'
import { getModuleDefaultPath, type EmsModule } from '@/config/modules'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/utils/cn'
import { toast } from 'sonner'

const loginSchema = z.object({
  email: z.email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

interface LoginPageProps {
  module: EmsModule
}

export function LoginPage({ module }: LoginPageProps) {
  const navigate = useNavigate()
  const { login, setSelectedModule } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    setSelectedModule(module.key)
  }, [module, setSelectedModule])

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    setError('')
    try {
      const success = await login(data.email, data.password)
      if (success) {
        toast.success(`Welcome to ${module.shortName}`)
        navigate(getModuleDefaultPath(module.key))
      } else {
        setError('Invalid email or password. Try the demo account below.')
        toast.error('Invalid credentials')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-in failed'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (email: string) => {
    setValue('email', email)
    setValue('password', appConfig.demo.password)
    setError('')
  }

  const ModuleIcon = module.icon
  const showSubtitle = module.shortName !== module.name

  return (
    <div className="min-h-screen bg-surface px-4 pt-16 pb-16">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm mx-auto"
      >
        <div className="flex justify-center mb-10">
          <img
            src="/jv-lockup.png"
            alt="Shimizu - Fujita - Takenaka - EEI Joint Venture"
            className="w-full max-w-[300px] h-auto logo-invert"
          />
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-center gap-3">
            <ModuleIcon className={cn('w-7 h-7 flex-shrink-0', module.iconColor)} strokeWidth={1.75} />
            <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">
              Sign in to {module.shortName}
            </h1>
          </div>
          {showSubtitle && (
            <p className="text-[15px] text-zinc-500 mt-2 text-center">{module.name}</p>
          )}
        </div>

        {error && (
          <div className="mb-5 px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg text-[13px] text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[12px] font-medium text-zinc-700">Email</label>
            <input
              type="email"
              autoComplete="email"
              {...register('email')}
              className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-400 transition-colors"
              placeholder="Enter your email"
            />
            {errors.email && <p className="text-[12px] text-red-600">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[12px] font-medium text-zinc-700">Password</label>
              <button
                type="button"
                onClick={() => toast.info('Password reset is not available in the demo')}
                className="text-[12px] text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                {...register('password')}
                className="w-full px-3.5 py-2.5 pr-11 bg-white border border-zinc-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-400 transition-colors"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-[12px] text-red-600">{errors.password.message}</p>}
          </div>

          <Button
            type="submit"
            fullWidth
            loading={loading}
            className="bg-zinc-900 hover:bg-zinc-800 text-white focus:ring-zinc-300"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <div className="mt-5 text-center">
          <Link
            to="/"
            className="text-[12px] text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            Back to modules
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-200">
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 mb-3">
            Demo Accounts
          </p>
          <div className="space-y-1.5">
            {appConfig.demo.accounts.map((acct) => (
              <button
                key={acct.email}
                type="button"
                onClick={() => fillDemo(acct.email)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 bg-white border border-zinc-200 rounded-lg hover:border-zinc-300 transition-colors text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-zinc-900 truncate">{acct.email}</p>
                  <p className="text-[11px] text-zinc-500 truncate mt-0.5">{acct.scope}</p>
                </div>
                <span className="text-[11px] font-medium text-zinc-500 flex-shrink-0">{acct.label}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
