import type { QmsTemplate, QmsReport } from '@/features/qms/types'

export const mockQmsTemplates: QmsTemplate[] = [
  {
    id: 'QT-001',
    name: 'Operations Monthly Performance',
    description: 'KPIs for Operations dept. — Inventory, Procurement, Maintenance',
    createdAt: '2024-08-12',
    createdBy: 'U001',
    sections: [
      {
        id: 'QTS-001-1',
        title: 'Inventory',
        metrics: [
          { id: 'M-001-1-1', label: 'Stock-out rate',           unit: '%',  target: 5,  comparator: 'lte', weight: 1 },
          { id: 'M-001-1-2', label: 'Cycle count accuracy',     unit: '%',  target: 98, comparator: 'gte', weight: 1 },
          { id: 'M-001-1-3', label: 'Stock turnover',           unit: 'x',  target: 4,  comparator: 'gte', weight: 1 },
        ],
      },
      {
        id: 'QTS-001-2',
        title: 'Procurement',
        metrics: [
          { id: 'M-001-2-1', label: 'Avg approval time',        unit: 'h',  target: 24, comparator: 'lte', weight: 1 },
          { id: 'M-001-2-2', label: 'Rejection rate',           unit: '%',  target: 10, comparator: 'lte', weight: 1 },
        ],
      },
      {
        id: 'QTS-001-3',
        title: 'Maintenance',
        metrics: [
          { id: 'M-001-3-1', label: 'Work order completion rate', unit: '%', target: 90, comparator: 'gte', weight: 1 },
          { id: 'M-001-3-2', label: 'Avg time to complete',     unit: 'd',  target: 3,  comparator: 'lte', weight: 1 },
          { id: 'M-001-3-3', label: 'Overdue work orders',      unit: '%',  target: 5,  comparator: 'lte', weight: 1 },
        ],
      },
    ],
  },
  {
    id: 'QT-002',
    name: 'QA Monthly Audit',
    description: 'Quality department monthly audit',
    createdAt: '2024-08-22',
    createdBy: 'U002',
    sections: [
      {
        id: 'QTS-002-1',
        title: 'Checklists',
        metrics: [
          { id: 'M-002-1-1', label: 'Completion rate',          unit: '%',  target: 95, comparator: 'gte', weight: 1 },
          { id: 'M-002-1-2', label: 'Required-item fail rate',  unit: '%',  target: 2,  comparator: 'lte', weight: 1 },
        ],
      },
      {
        id: 'QTS-002-2',
        title: 'Documents',
        metrics: [
          { id: 'M-002-2-1', label: 'Avg time to approve',      unit: 'd',  target: 2,  comparator: 'lte', weight: 1 },
          { id: 'M-002-2-2', label: 'Documents in review > 7d', unit: 'count', target: 0, comparator: 'eq', weight: 1 },
        ],
      },
    ],
  },
  {
    id: 'QT-003',
    name: 'HSE Monthly Report',
    description: 'Health, Safety & Environment monthly metrics',
    createdAt: '2024-09-04',
    createdBy: 'U001',
    sections: [
      {
        id: 'QTS-003-1',
        title: 'Safety',
        metrics: [
          { id: 'M-003-1-1', label: 'Recordable incidents',     unit: 'count', target: 0, comparator: 'eq', weight: 2 },
          { id: 'M-003-1-2', label: 'Days since last incident', unit: 'd',     target: 30, comparator: 'gte', weight: 1 },
          { id: 'M-003-1-3', label: 'PPE compliance rate',      unit: '%',     target: 98, comparator: 'gte', weight: 1 },
        ],
      },
      {
        id: 'QTS-003-2',
        title: 'Compliance',
        metrics: [
          { id: 'M-003-2-1', label: 'Statutory inspections completed', unit: '%', target: 100, comparator: 'gte', weight: 1 },
          { id: 'M-003-2-2', label: 'HSE training current',           unit: '%', target: 95,  comparator: 'gte', weight: 1 },
        ],
      },
    ],
  },
]

export const mockQmsReports: QmsReport[] = [
  {
    id: 'QR-2026-04-OPS',
    templateId: 'QT-001',
    periodStart: '2026-04-01',
    periodEnd: '2026-04-30',
    status: 'draft',
    summary: 'Solid month — only outlier is overdue work orders trending up due to AST-009 maintenance backlog.',
    preparedBy: 'U002',
    preparedAt: '2026-04-27T11:00:00Z',
    sections: [
      { templateSectionId: 'QTS-001-1', title: 'Inventory', metrics: [
        { templateMetricId: 'M-001-1-1', label: 'Stock-out rate',       unit: '%', target: 5,  comparator: 'lte', value: 3.2,  status: 'pass' },
        { templateMetricId: 'M-001-1-2', label: 'Cycle count accuracy', unit: '%', target: 98, comparator: 'gte', value: 98.4, status: 'pass' },
        { templateMetricId: 'M-001-1-3', label: 'Stock turnover',       unit: 'x', target: 4,  comparator: 'gte', value: 3.6,  status: 'warn', notes: 'Slight slowdown — Q1 demand softer than forecast' },
      ]},
      { templateSectionId: 'QTS-001-2', title: 'Procurement', metrics: [
        { templateMetricId: 'M-001-2-1', label: 'Avg approval time', unit: 'h', target: 24, comparator: 'lte', value: 18,  status: 'pass' },
        { templateMetricId: 'M-001-2-2', label: 'Rejection rate',    unit: '%', target: 10, comparator: 'lte', value: 12.5, status: 'warn', notes: 'Driven by REQ-2025-0314 budget rejection' },
      ]},
      { templateSectionId: 'QTS-001-3', title: 'Maintenance', metrics: [
        { templateMetricId: 'M-001-3-1', label: 'Work order completion rate', unit: '%', target: 90, comparator: 'gte', value: 92,  status: 'pass' },
        { templateMetricId: 'M-001-3-2', label: 'Avg time to complete',       unit: 'd', target: 3,  comparator: 'lte', value: 2.4, status: 'pass' },
        { templateMetricId: 'M-001-3-3', label: 'Overdue work orders',        unit: '%', target: 5,  comparator: 'lte', value: 8,   status: 'fail', notes: 'AST-009 brake replacement waiting on parts' },
      ]},
    ],
  },
  {
    id: 'QR-2026-03-OPS',
    templateId: 'QT-001',
    periodStart: '2026-03-01',
    periodEnd: '2026-03-31',
    status: 'published',
    summary: 'Strong month across all categories — exceeded targets on inventory accuracy and maintenance completion.',
    preparedBy: 'U002',
    preparedAt: '2026-04-04T09:00:00Z',
    publishedBy: 'U001',
    publishedAt: '2026-04-08T10:14:00Z',
    sections: [
      { templateSectionId: 'QTS-001-1', title: 'Inventory', metrics: [
        { templateMetricId: 'M-001-1-1', label: 'Stock-out rate',       unit: '%', target: 5,  comparator: 'lte', value: 2.1,  status: 'pass' },
        { templateMetricId: 'M-001-1-2', label: 'Cycle count accuracy', unit: '%', target: 98, comparator: 'gte', value: 99.0, status: 'pass' },
        { templateMetricId: 'M-001-1-3', label: 'Stock turnover',       unit: 'x', target: 4,  comparator: 'gte', value: 4.2,  status: 'pass' },
      ]},
      { templateSectionId: 'QTS-001-2', title: 'Procurement', metrics: [
        { templateMetricId: 'M-001-2-1', label: 'Avg approval time', unit: 'h', target: 24, comparator: 'lte', value: 16, status: 'pass' },
        { templateMetricId: 'M-001-2-2', label: 'Rejection rate',    unit: '%', target: 10, comparator: 'lte', value: 6,  status: 'pass' },
      ]},
      { templateSectionId: 'QTS-001-3', title: 'Maintenance', metrics: [
        { templateMetricId: 'M-001-3-1', label: 'Work order completion rate', unit: '%', target: 90, comparator: 'gte', value: 96,  status: 'pass' },
        { templateMetricId: 'M-001-3-2', label: 'Avg time to complete',       unit: 'd', target: 3,  comparator: 'lte', value: 1.9, status: 'pass' },
        { templateMetricId: 'M-001-3-3', label: 'Overdue work orders',        unit: '%', target: 5,  comparator: 'lte', value: 2,   status: 'pass' },
      ]},
    ],
  },
  {
    id: 'QR-2026-04-QA',
    templateId: 'QT-002',
    periodStart: '2026-04-01',
    periodEnd: '2026-04-30',
    status: 'draft',
    preparedBy: 'U002',
    preparedAt: '2026-04-27T13:00:00Z',
    sections: [
      { templateSectionId: 'QTS-002-1', title: 'Checklists', metrics: [
        { templateMetricId: 'M-002-1-1', label: 'Completion rate',         unit: '%', target: 95, comparator: 'gte', value: 92, status: 'warn', notes: 'Vehicle pre-trip checklist completion lower than expected' },
        { templateMetricId: 'M-002-1-2', label: 'Required-item fail rate', unit: '%', target: 2,  comparator: 'lte', value: 1.4, status: 'pass' },
      ]},
      { templateSectionId: 'QTS-002-2', title: 'Documents', metrics: [
        { templateMetricId: 'M-002-2-1', label: 'Avg time to approve',      unit: 'd',     target: 2, comparator: 'lte', value: 1.6, status: 'pass' },
        { templateMetricId: 'M-002-2-2', label: 'Documents in review > 7d', unit: 'count', target: 0, comparator: 'eq',  value: 1,   status: 'fail', notes: 'DOC-002 MSA renewal pending CEO signature for 9 days' },
      ]},
    ],
  },
  {
    id: 'QR-2026-03-HSE',
    templateId: 'QT-003',
    periodStart: '2026-03-01',
    periodEnd: '2026-03-31',
    status: 'published',
    summary: 'Zero recordable incidents. PPE compliance at 99.1%.',
    preparedBy: 'U001',
    preparedAt: '2026-04-02T14:00:00Z',
    publishedBy: 'U001',
    publishedAt: '2026-04-04T09:00:00Z',
    sections: [
      { templateSectionId: 'QTS-003-1', title: 'Safety', metrics: [
        { templateMetricId: 'M-003-1-1', label: 'Recordable incidents',     unit: 'count', target: 0,  comparator: 'eq',  value: 0,    status: 'pass' },
        { templateMetricId: 'M-003-1-2', label: 'Days since last incident', unit: 'd',     target: 30, comparator: 'gte', value: 124,  status: 'pass' },
        { templateMetricId: 'M-003-1-3', label: 'PPE compliance rate',      unit: '%',     target: 98, comparator: 'gte', value: 99.1, status: 'pass' },
      ]},
      { templateSectionId: 'QTS-003-2', title: 'Compliance', metrics: [
        { templateMetricId: 'M-003-2-1', label: 'Statutory inspections completed', unit: '%', target: 100, comparator: 'gte', value: 100, status: 'pass' },
        { templateMetricId: 'M-003-2-2', label: 'HSE training current',            unit: '%', target: 95,  comparator: 'gte', value: 96,  status: 'pass' },
      ]},
    ],
  },
]
