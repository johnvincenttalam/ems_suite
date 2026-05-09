import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Command, FileText, Search } from 'lucide-react'
import { useGlobalSearch } from '@/shared/search/hooks/use-global-search'
import { highlightSpans } from '@/shared/search/lib/highlight'
import type { SearchEntityType } from '@/shared/search/lib/types'
import { cn } from '@/shared/utils/cn'

interface SearchPaletteProps {
  open: boolean
  onClose: () => void
}

const TYPE_LABEL: Record<SearchEntityType, string> = {
  document: 'Document',
  request: 'Request',
  work_order: 'Work Order',
  inventory_item: 'Item',
  asset: 'Asset',
}

const TYPE_PILL: Record<SearchEntityType, string> = {
  document: 'bg-violet-50 text-violet-700 border-violet-200',
  request: 'bg-rose-50 text-rose-700 border-rose-200',
  work_order: 'bg-orange-50 text-orange-700 border-orange-200',
  inventory_item: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  asset: 'bg-amber-50 text-amber-700 border-amber-200',
}

export function SearchPalette({ open, onClose }: SearchPaletteProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const tokens = useMemo(() => query.toLowerCase().split(/[\s,]+/).filter(Boolean), [query])
  const { hits, total } = useGlobalSearch(query)

  useEffect(() => {
    if (!open) {
      setQuery('')
      setActiveIdx(0)
      return
    }
    const t = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    setActiveIdx(0)
  }, [query])

  useEffect(() => {
    const item = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`)
    item?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx((i) => Math.min(i + 1, hits.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const hit = hits[activeIdx]
        if (hit) {
          navigate(hit.link)
          onClose()
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, hits, activeIdx, navigate, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-zinc-900/60 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-xl bg-white rounded-xl border border-zinc-200/60 shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
              <Search className="w-4 h-4 text-zinc-400 flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search documents, requests, work orders, items, assets..."
                className="flex-1 bg-transparent border-0 outline-none text-[14px] text-zinc-900 placeholder:text-zinc-400"
              />
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono text-zinc-400 bg-zinc-100 border border-zinc-200">
                Esc
              </kbd>
            </div>

            <div ref={listRef} className="flex-1 overflow-y-auto">
              {!query.trim() ? (
                <EmptyHint />
              ) : hits.length === 0 ? (
                <NoResults query={query} />
              ) : (
                <ul className="py-1">
                  {hits.map((hit, idx) => (
                    <li key={hit.id}>
                      <button
                        data-idx={idx}
                        onMouseEnter={() => setActiveIdx(idx)}
                        onClick={() => {
                          navigate(hit.link)
                          onClose()
                        }}
                        className={cn(
                          'w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors',
                          idx === activeIdx ? 'bg-zinc-50' : 'hover:bg-zinc-50/50',
                        )}
                      >
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', hit.iconBg)}>
                          <hit.icon className={cn('w-4 h-4', hit.iconColor)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border', TYPE_PILL[hit.type])}>
                              {TYPE_LABEL[hit.type]}
                            </span>
                            {hit.subtitle && <span className="font-mono text-[10px] text-zinc-400 truncate">{hit.subtitle}</span>}
                          </div>
                          <p className="text-[13px] font-medium text-zinc-900 mt-0.5 truncate">
                            <Highlighted text={hit.title} tokens={tokens} />
                          </p>
                          {hit.snippet && (
                            <p className="text-[11.5px] text-zinc-600 mt-1 leading-snug line-clamp-2">
                              <HighlightedRanges text={hit.snippet} matches={hit.matches ?? []} />
                            </p>
                          )}
                          {hit.meta && <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{hit.meta}</p>}
                        </div>
                        {idx === activeIdx && <ArrowRight className="w-3.5 h-3.5 text-zinc-400 mt-1 flex-shrink-0" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="px-4 py-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
              <div className="flex items-center gap-3">
                <span><kbd className="font-mono px-1 rounded bg-zinc-100 border border-zinc-200">↑↓</kbd> navigate</span>
                <span><kbd className="font-mono px-1 rounded bg-zinc-100 border border-zinc-200">Enter</kbd> open</span>
              </div>
              {query && <span>{hits.length} of {total}</span>}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function Highlighted({ text, tokens }: { text: string; tokens: string[] }) {
  const spans = highlightSpans(text, tokens)
  return (
    <>
      {spans.map((span, i) =>
        i % 2 === 1
          ? <mark key={i} className="bg-amber-100 text-zinc-900 rounded px-0.5">{span}</mark>
          : <span key={i}>{span}</span>,
      )}
    </>
  )
}

/**
 * Render `text` with bolded segments at the given character ranges. Used for
 * pre-computed match ranges from the search adapter (snippets), where we
 * want to bold exact char windows rather than re-tokenize on the client.
 */
function HighlightedRanges({
  text,
  matches,
}: {
  text: string
  matches: Array<[number, number]>
}) {
  if (matches.length === 0) return <>{text}</>

  // Sort + merge overlapping ranges so the render walk stays simple.
  const sorted = [...matches].sort((a, b) => a[0] - b[0])
  const merged: Array<[number, number]> = []
  for (const [s, e] of sorted) {
    const last = merged[merged.length - 1]
    if (last && s <= last[1]) {
      last[1] = Math.max(last[1], e)
    } else {
      merged.push([s, e])
    }
  }

  const segments: Array<{ text: string; bold: boolean }> = []
  let cursor = 0
  for (const [s, e] of merged) {
    if (s > cursor) segments.push({ text: text.slice(cursor, s), bold: false })
    segments.push({ text: text.slice(s, e), bold: true })
    cursor = e
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), bold: false })

  return (
    <>
      {segments.map((seg, i) => (
        <Fragment key={i}>
          {seg.bold ? <mark className="bg-amber-100 text-zinc-900 rounded px-0.5">{seg.text}</mark> : seg.text}
        </Fragment>
      ))}
    </>
  )
}

function EmptyHint() {
  return (
    <div className="px-6 py-10 flex flex-col items-center text-center">
      <Search className="w-8 h-8 text-zinc-300 mb-3" />
      <p className="text-[13px] font-medium text-zinc-700">Search anything across the platform</p>
      <p className="text-[12px] text-zinc-400 mt-1 max-w-xs">
        Documents, procurement requests, work orders, inventory items, and assets — by ID, name, sender, tags, or any text.
      </p>
      <div className="mt-4 flex items-center gap-2 text-[11px] text-zinc-400">
        <Command className="w-3 h-3" />
        <span>K to open from anywhere</span>
      </div>
    </div>
  )
}

function NoResults({ query }: { query: string }) {
  return (
    <div className="px-6 py-10 flex flex-col items-center text-center">
      <FileText className="w-8 h-8 text-zinc-300 mb-3" />
      <p className="text-[13px] font-medium text-zinc-700">Nothing matches "{query}"</p>
      <p className="text-[12px] text-zinc-400 mt-1">Try fewer words or different terms.</p>
    </div>
  )
}
