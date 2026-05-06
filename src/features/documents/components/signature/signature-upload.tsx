import { useRef } from 'react'
import { Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'

const MAX_SIZE = 2 * 1024 * 1024

interface SignatureUploadProps {
  signatureImage: string | null
  onCapture: (dataUrl: string) => void
  onRemove: () => void
}

export function SignatureUpload({ signatureImage, onCapture, onRemove }: SignatureUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (file.type !== 'image/png') {
      toast.error('Only PNG files are accepted')
      return
    }
    if (file.size > MAX_SIZE) {
      toast.error('File must be under 2 MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') onCapture(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  if (signatureImage) {
    return (
      <div className="space-y-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-3 flex items-center justify-center">
          <img src={signatureImage} alt="Uploaded signature" className="max-h-[160px] object-contain" />
        </div>
        <Button type="button" variant="ghost" size="sm" leftIcon={<X className="w-3.5 h-3.5" />} onClick={onRemove}>
          Remove
        </Button>
      </div>
    )
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/png" className="hidden" onChange={handleChange} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="w-full rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50/50 py-10 flex flex-col items-center gap-2 text-zinc-500 hover:border-zinc-400 hover:bg-zinc-50 transition-colors cursor-pointer"
      >
        <Upload className="w-6 h-6" />
        <span className="text-[13px] font-medium">Click or drop a PNG file</span>
        <span className="text-[11px] text-zinc-400">Max 2 MB</span>
      </button>
    </div>
  )
}
