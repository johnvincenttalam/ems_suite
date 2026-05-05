import { FileText, FileSpreadsheet, FileImage, File } from 'lucide-react'
import type { DocumentFileType } from '@/features/documents/types'
import { cn } from '@/shared/utils/cn'

const config: Record<DocumentFileType, { Icon: typeof File; bg: string; fg: string }> = {
  pdf:  { Icon: FileText,        bg: 'bg-red-50 border-red-200',     fg: 'text-red-600' },
  docx: { Icon: FileText,        bg: 'bg-blue-50 border-blue-200',   fg: 'text-blue-600' },
  xlsx: { Icon: FileSpreadsheet, bg: 'bg-emerald-50 border-emerald-200', fg: 'text-emerald-600' },
  png:  { Icon: FileImage,       bg: 'bg-violet-50 border-violet-200', fg: 'text-violet-600' },
  jpg:  { Icon: FileImage,       bg: 'bg-violet-50 border-violet-200', fg: 'text-violet-600' },
}

export function FileIcon({ type, size = 'md' }: { type: DocumentFileType; size?: 'sm' | 'md' }) {
  const cfg = config[type]
  const Icon = cfg.Icon
  const dim = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
  const iconDim = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  return (
    <div className={cn('rounded-lg flex items-center justify-center border flex-shrink-0', dim, cfg.bg)}>
      <Icon className={cn(iconDim, cfg.fg)} />
    </div>
  )
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1_048_576).toFixed(1)} MB`
}
