import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { useClickOutside } from '@/shared/hooks/use-click-outside'

export interface SearchableSelectOption {
  label: string
  value: string
}

interface SearchableSelectProps {
  label?: string
  error?: string
  options: SearchableSelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  id?: string
}

export function SearchableSelect({
  label,
  error,
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No results',
  disabled,
  id,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const fieldId = id || label?.toLowerCase().replace(/\s+/g, '-')

  useClickOutside(rootRef, () => setOpen(false), open)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setActiveIndex(0)
      return
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (activeIndex >= filtered.length) setActiveIndex(0)
  }, [filtered, activeIndex])

  const selected = options.find((o) => o.value === value) ?? null

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const opt = filtered[activeIndex]
      if (opt) {
        onChange(opt.value)
        setOpen(false)
      }
    }
  }

  return (
    <div className="space-y-1.5" ref={rootRef}>
      {label && (
        <label htmlFor={fieldId} className="block text-[13px] font-medium text-zinc-700">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          id={fieldId}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((v) => !v)}
          className={cn(
            'w-full h-10 px-3 pr-9 bg-white border rounded-lg text-sm text-left flex items-center',
            'focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-400 transition-colors',
            error ? 'border-red-300' : 'border-zinc-200',
            disabled && 'opacity-60 cursor-not-allowed',
            selected ? 'text-zinc-900' : 'text-zinc-400',
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-zinc-200/80 rounded-lg overflow-hidden">
            <div className="relative border-b border-zinc-100">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActiveIndex(0)
                }}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-3 py-2 text-[13px] text-zinc-700 placeholder:text-zinc-400 focus:outline-none bg-white"
              />
            </div>
            <ul className="max-h-60 overflow-y-auto py-1" role="listbox">
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-[12.5px] text-zinc-400">{emptyText}</li>
              )}
              {filtered.map((opt, i) => {
                const isSelected = opt.value === value
                const isActive = i === activeIndex
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => {
                        onChange(opt.value)
                        setOpen(false)
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-left',
                        isActive ? 'bg-zinc-50' : 'bg-white',
                        isSelected ? 'text-zinc-900 font-medium' : 'text-zinc-700',
                      )}
                    >
                      <span className="flex-1 truncate">{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
