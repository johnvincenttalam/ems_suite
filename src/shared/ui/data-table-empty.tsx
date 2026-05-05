import type { LucideIcon } from 'lucide-react'

interface DataTableEmptyProps {
  colSpan: number
  icon: LucideIcon
  message: string
  description?: string
}

export function DataTableEmpty({ colSpan, icon: Icon, message, description }: DataTableEmptyProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center">
        <div className="flex flex-col items-center">
          <Icon className="w-10 h-10 text-zinc-300 mb-3" />
          <p className="text-sm text-zinc-500">{message}</p>
          {description && <p className="text-xs text-zinc-400 mt-1">{description}</p>}
        </div>
      </td>
    </tr>
  )
}
