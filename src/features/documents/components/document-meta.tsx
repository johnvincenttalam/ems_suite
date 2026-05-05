import { Lock, EyeOff, Eye, Tag as TagIcon } from 'lucide-react'
import {
  CATEGORY_LABEL,
  CONFIDENTIALITY_LABEL,
  PRIORITY_LABEL,
  type DocumentCategory,
  type DocumentConfidentiality,
  type DocumentPriority,
} from '@/features/documents/types'
import { cn } from '@/shared/utils/cn'

const priorityColors: Record<DocumentPriority, string> = {
  low: 'bg-zinc-50 text-zinc-600 border-zinc-200',
  normal: 'bg-blue-50 text-blue-700 border-blue-200',
  urgent: 'bg-red-50 text-red-700 border-red-200',
}

const confidentialityIcons: Record<DocumentConfidentiality, typeof Lock> = {
  public: Eye,
  internal: EyeOff,
  confidential: Lock,
}

const confidentialityColors: Record<DocumentConfidentiality, string> = {
  public: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  internal: 'bg-amber-50 text-amber-700 border-amber-200',
  confidential: 'bg-red-50 text-red-700 border-red-200',
}

export function PriorityBadge({ value, size = 'md' }: { value: DocumentPriority; size?: 'sm' | 'md' }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full border font-medium capitalize whitespace-nowrap',
      priorityColors[value],
      size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
    )}>
      {PRIORITY_LABEL[value]}
    </span>
  )
}

export function ConfidentialityBadge({ value, size = 'md' }: { value: DocumentConfidentiality; size?: 'sm' | 'md' }) {
  const Icon = confidentialityIcons[value]
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full border font-medium capitalize whitespace-nowrap',
      confidentialityColors[value],
      size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
    )}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {CONFIDENTIALITY_LABEL[value]}
    </span>
  )
}

export function CategoryBadge({ value, size = 'md' }: { value: DocumentCategory; size?: 'sm' | 'md' }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-md border bg-zinc-50 text-zinc-700 border-zinc-200 font-medium whitespace-nowrap',
      size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs',
    )}>
      <TagIcon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {CATEGORY_LABEL[value]}
    </span>
  )
}

export function TrackingBadge({ trackingNumber }: { trackingNumber?: string }) {
  if (!trackingNumber) {
    return <span className="text-[11px] text-zinc-300 font-mono">—</span>
  }
  return (
    <span className="font-mono text-[11px] text-zinc-500 bg-zinc-50 border border-zinc-200 rounded px-1.5 py-0.5 whitespace-nowrap">
      {trackingNumber}
    </span>
  )
}
