/**
 * Severity rank for an insight:
 *  - critical: requires immediate attention; surfaced prominently
 *  - warning:  trending in the wrong direction; worth checking
 *  - info:     useful narrative; no action required
 */
export type InsightSeverity = 'critical' | 'warning' | 'info'

export type InsightModule =
  | 'inventory'
  | 'maintenance'
  | 'procurement'
  | 'assets'
  | 'fleet'
  | 'general'

/**
 * A single narrative line surfaced on dashboards. Derived from cross-module
 * data — never persisted. Each insight has a stable `id` so React can key on
 * it without churn between renders.
 */
export interface Insight {
  /** Stable across re-derivations of the same underlying state. */
  id: string
  message: string
  severity: InsightSeverity
  module: InsightModule
  /** Optional supporting figure rendered alongside the message (e.g. "+15%"). */
  metric?: string
  /** Optional in-app navigation target (route, with query string if useful). */
  href?: string
}

export const SEVERITY_RANK: Record<InsightSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
}
