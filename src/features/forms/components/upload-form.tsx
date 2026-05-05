import { useRef, useState } from 'react'
import { Upload, File, X, Image as ImageIcon, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/utils/cn'

interface UploadedFile {
  id: string
  file: File
  preview?: string
  progress: number
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(type: string) {
  if (type.startsWith('image/')) return ImageIcon
  if (type.includes('pdf') || type.includes('document')) return FileText
  return File
}

export function UploadForm() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = (list: FileList | null) => {
    if (!list) return
    const newFiles: UploadedFile[] = Array.from(list).map((file) => {
      const entry: UploadedFile = {
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        progress: 0,
      }
      if (file.type.startsWith('image/')) {
        entry.preview = URL.createObjectURL(file)
      }
      return entry
    })
    setFiles((prev) => [...prev, ...newFiles])
    newFiles.forEach((entry) => simulateUpload(entry.id))
  }

  const simulateUpload = (id: string) => {
    let progress = 0
    const tick = () => {
      progress = Math.min(100, progress + Math.random() * 25)
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, progress } : f)))
      if (progress < 100) setTimeout(tick, 200 + Math.random() * 200)
    }
    tick()
  }

  const remove = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id)
      if (target?.preview) URL.revokeObjectURL(target.preview)
      return prev.filter((f) => f.id !== id)
    })
  }

  const onDrag = (e: React.DragEvent, active: boolean) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(active)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    addFiles(e.dataTransfer.files)
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div
        onDragEnter={(e) => onDrag(e, true)}
        onDragOver={(e) => onDrag(e, true)}
        onDragLeave={(e) => onDrag(e, false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
          dragActive ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50/50'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center mx-auto mb-3">
          <Upload className="w-5 h-5 text-zinc-500" />
        </div>
        <p className="text-sm font-medium text-zinc-900">
          {dragActive ? 'Drop files here' : 'Click to upload or drag and drop'}
        </p>
        <p className="text-[12px] text-zinc-400 mt-1">Any file type · up to 10 MB each</p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((entry) => {
            const Icon = fileIcon(entry.file.type)
            return (
              <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200">
                {entry.preview ? (
                  <img src={entry.preview} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-zinc-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-medium text-zinc-900 truncate">{entry.file.name}</p>
                    <span className="text-[11px] text-zinc-400 flex-shrink-0">{formatSize(entry.file.size)}</span>
                  </div>
                  <div className="mt-1.5 h-1 rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-200', entry.progress >= 100 ? 'bg-emerald-500' : 'bg-zinc-900')}
                      style={{ width: `${entry.progress}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    {entry.progress >= 100 ? 'Uploaded' : `${Math.round(entry.progress)}%`}
                  </p>
                </div>
                <button onClick={() => remove(entry.id)} className="p-1.5 rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {files.length > 0 && (
        <div className="flex gap-3 pt-2">
          <Button onClick={() => { toast.success(`Uploaded ${files.length} file${files.length === 1 ? '' : 's'}`); setFiles([]) }}>
            Finish
          </Button>
          <Button variant="ghost" onClick={() => setFiles([])}>Clear all</Button>
        </div>
      )}
    </div>
  )
}
