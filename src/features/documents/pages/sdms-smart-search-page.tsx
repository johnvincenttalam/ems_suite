import { Fragment, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, Sparkles, FileText, Calendar, Building2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useSmartSearch } from '@/features/documents/hooks/use-smart-search'
import { searchAdapter, type SmartSearchResult } from '@/features/documents/adapters'
import { useDepartments } from '@/features/departments'
import { useUsers } from '@/features/users'
import { CATEGORY_LABEL } from '@/features/documents/types'
import { PageHeader } from '@/shared/ui/page-header'
import { Spinner } from '@/shared/ui/spinner'
import { getModulePath } from '@/config/modules'
import { cn } from '@/shared/utils/cn'

const EXAMPLE_QUERIES = [
  'forklift hydraulic incident',
  'capital budget proposal',
  'vendor onboarding due diligence',
  'remote work policy',
  'cycle count standard procedure',
]

export function SdmsSmartSearchPage() {
  const [query, setQuery] = useState('')
  const trimmed = query.trim()

  const { data: results = [], isFetching } = useSmartSearch(query)
  const { data: departments = [] } = useDepartments()
  const { data: users = [] } = useUsers()

  const deptMap = useMemo(() => Object.fromEntries(departments.map((d) => [d.id, d])), [departments])
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])

  const showExamples = trimmed.length < 2
  const showNoResults = trimmed.length >= 2 && !isFetching && results.length === 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Smart Search"
        subtitle="Find documents by describing what you're looking for — title, content, tags, or category."
        actions={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-violet-200 bg-violet-50 text-violet-700 text-[11px] font-medium">
            <Sparkles className="w-3 h-3" />
            {searchAdapter.modeLabel}
          </span>
        }
      />

      <div className="bg-white rounded-xl border border-zinc-200/60 p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents using description…"
            className="w-full pl-11 pr-4 py-3 rounded-lg border border-zinc-200 bg-white text-[14px] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
            autoFocus
          />
          {isFetching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Spinner size="sm" />
            </div>
          )}
        </div>

        {showExamples && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium mr-1">
              Try
            </span>
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => setQuery(q)}
                className="inline-flex items-center px-2 py-0.5 rounded-md border bg-white text-zinc-600 border-zinc-200 text-[11px] hover:border-zinc-400 hover:text-zinc-900 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results section */}
      {showNoResults && (
        <div className="bg-white rounded-xl border border-zinc-200/60 px-6 py-12 text-center">
          <Search className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-700">No documents matched</p>
          <p className="text-[12px] text-zinc-500 mt-1">
            Try a different phrasing, or browse all documents from the Documents page.
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
            {results.length} result{results.length === 1 ? '' : 's'}
          </p>
          <ul className="space-y-3">
            {results.map((r) => (
              <ResultCard
                key={r.document.id}
                result={r}
                deptName={r.document.departmentId ? deptMap[r.document.departmentId]?.name : undefined}
                authorName={userMap[r.document.createdBy]?.name ?? r.document.createdBy}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

const MATCH_BAND_LABELS: Record<SmartSearchResult['matchedIn'], string> = {
  title: 'Matched title',
  body: 'Matched content',
  tags: 'Matched tag',
  category: 'Matched category',
}

const MATCH_BAND_STYLES: Record<SmartSearchResult['matchedIn'], string> = {
  title: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  body: 'bg-blue-50 text-blue-700 border-blue-200',
  tags: 'bg-violet-50 text-violet-700 border-violet-200',
  category: 'bg-amber-50 text-amber-700 border-amber-200',
}

function ResultCard({
  result,
  deptName,
  authorName,
}: {
  result: SmartSearchResult
  deptName?: string
  authorName: string
}) {
  const { document: doc, score, snippet, matches, matchedIn } = result
  const scorePct = Math.round(score * 100)

  return (
    <li className="bg-white rounded-xl border border-zinc-200/60 hover:border-zinc-300 transition-colors">
      <Link
        to={getModulePath('sdms', `documents/${doc.id}`)}
        className="block p-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200/60 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  {doc.trackingNumber && (
                    <span className="font-mono text-[11px] text-zinc-400">{doc.trackingNumber}</span>
                  )}
                  <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10.5px] font-medium', MATCH_BAND_STYLES[matchedIn])}>
                    {MATCH_BAND_LABELS[matchedIn]}
                  </span>
                </div>
                <p className="text-[14px] font-medium text-zinc-900 truncate">{doc.title}</p>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 text-[11px] font-medium tabular-nums whitespace-nowrap">
                {scorePct}%
              </span>
            </div>

            {snippet && (
              <p className="text-[12.5px] text-zinc-600 mt-2 leading-relaxed">
                <HighlightedText text={snippet} matches={matches} />
              </p>
            )}

            <div className="flex items-center gap-3 flex-wrap mt-2 text-[11px] text-zinc-500">
              {doc.category && (
                <span className="inline-flex items-center gap-1">
                  {CATEGORY_LABEL[doc.category]}
                </span>
              )}
              {deptName && (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {deptName}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(parseISO(doc.createdAt), 'MMM d, yyyy')}
              </span>
              <span className="text-zinc-400">{authorName}</span>
              {doc.tags && doc.tags.length > 0 && (
                <span className="flex flex-wrap gap-1">
                  {doc.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[10px]">
                      {tag}
                    </span>
                  ))}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </li>
  )
}

/** Render `text` with bolded segments at the given character ranges. */
function HighlightedText({
  text,
  matches,
}: {
  text: string
  matches: Array<[number, number]>
}) {
  if (matches.length === 0) return <>{text}</>

  // Sort + dedupe overlapping ranges to keep render simple.
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
          {seg.bold ? <mark className="bg-amber-100 text-zinc-900 rounded-sm px-0.5">{seg.text}</mark> : seg.text}
        </Fragment>
      ))}
    </>
  )
}
