export type ReportStatus = 'draft' | 'published'
export type MetricStatus = 'pass' | 'warn' | 'fail'
export type Comparator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq'

export interface TemplateMetric {
  id: string
  label: string
  unit: string
  target: number
  comparator: Comparator
  weight: number
}

export interface TemplateSection {
  id: string
  title: string
  metrics: TemplateMetric[]
}

export interface QmsTemplate {
  id: string
  name: string
  description?: string
  sections: TemplateSection[]
  createdAt: string
  createdBy: string
}

export interface ReportMetric {
  templateMetricId: string
  label: string
  unit: string
  target: number
  comparator: Comparator
  value: number
  status: MetricStatus
  notes?: string
}

export interface ReportSection {
  templateSectionId: string
  title: string
  metrics: ReportMetric[]
}

export interface QmsReport {
  id: string
  templateId: string
  periodStart: string
  periodEnd: string
  status: ReportStatus
  sections: ReportSection[]
  summary?: string
  preparedBy: string
  preparedAt: string
  publishedBy?: string
  publishedAt?: string
}
