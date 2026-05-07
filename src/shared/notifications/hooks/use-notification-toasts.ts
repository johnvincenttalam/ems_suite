import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useNotifications } from './use-notifications'
import type { ModuleKey } from '@/config/modules'

/**
 * Pops a sonner toast for each newly-arrived unread notification. Skips the
 * initial mount (otherwise users get blasted with one toast per existing
 * notification on every login). After the first render, the seen set holds
 * every id we've already shown so the same notification never toasts twice
 * even if it stays unread.
 *
 * Mount this once per module workspace (in ModuleLayout) so toasts fire
 * regardless of which page the user is on.
 */
export function useNotificationToasts(moduleKey?: ModuleKey): void {
  const { notifications, markRead } = useNotifications(moduleKey)
  const seenRef = useRef<Set<string> | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    // First render: bootstrap the seen set with whatever's already there
    // (read or unread). Don't toast.
    if (seenRef.current === null) {
      seenRef.current = new Set(notifications.map((n) => n.id))
      return
    }

    const seen = seenRef.current
    for (const n of notifications) {
      if (seen.has(n.id)) continue
      seen.add(n.id)
      if (n.read) continue
      const fn =
        n.severity === 'success' ? toast.success
        : n.severity === 'danger' ? toast.error
        : n.severity === 'warning' ? toast.warning
        : toast.info
      fn(n.title, {
        description: n.description,
        action: n.link
          ? {
              label: 'Open',
              onClick: () => {
                markRead(n.id)
                navigate(n.link!)
              },
            }
          : undefined,
      })
    }
  }, [notifications, markRead, navigate])
}
