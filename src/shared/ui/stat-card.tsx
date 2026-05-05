import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { cn } from '@/shared/utils/cn'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  trend?: { value: number; positive: boolean }
  index?: number
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (!isInView) return
    const duration = 900
    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.floor(eased * value))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [value, isInView])

  return <span ref={ref}>{display.toLocaleString()}</span>
}

function formatAnimatedValue(value: string | number) {
  if (typeof value === 'number') {
    return <AnimatedNumber value={value} />
  }
  const match = String(value).match(/^(₱|)([\d,]+\.?\d*)(.*?)$/)
  if (match) {
    const num = Number(match[2].replace(/,/g, ''))
    if (!isNaN(num) && num > 0) {
      return <>{match[1]}<AnimatedNumber value={num} />{match[3]}</>
    }
  }
  return value
}

export function StatCard({ title, value, subtitle, icon: Icon, iconBg = 'bg-zinc-100', iconColor = 'text-zinc-500', trend, index = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: [0.21, 0.47, 0.32, 0.98] as const }}
      className="bg-white rounded-xl border border-zinc-200/60 p-5"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-semibold text-zinc-900 tracking-tight">{formatAnimatedValue(value)}</p>
          {subtitle && <p className="text-xs text-zinc-400">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className={cn('w-1.5 h-1.5 rounded-full', trend.positive ? 'bg-emerald-500' : 'bg-red-500')} />
              <span className="text-xs text-zinc-500">
                {trend.positive ? '+' : '-'}{Math.abs(trend.value)}% vs last month
              </span>
            </div>
          )}
        </div>
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', iconBg)}>
          <Icon className={cn('w-[18px] h-[18px]', iconColor)} />
        </div>
      </div>
    </motion.div>
  )
}
