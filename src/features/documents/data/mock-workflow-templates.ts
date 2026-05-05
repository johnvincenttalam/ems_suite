import type { WorkflowTemplate } from '../types'

/** Seeded approver chains. Approver IDs reference users in mockUsers (see
 * src/features/users/data/mock-users.ts). The order of approverIds is the
 * sign order — first approver signs first. */
export const mockWorkflowTemplates: WorkflowTemplate[] = [
  {
    id: 'WFT-001',
    name: 'Finance — Standard Approval',
    description: 'Manager → Director → Admin. Used for budgets, expenses, and finance policies.',
    category: 'finance',
    approverIds: ['U006', 'U008', 'U001'],
  },
  {
    id: 'WFT-002',
    name: 'HR — Policy Review',
    description: 'Operations review then Admin sign-off. Used for HR policy updates.',
    category: 'hr',
    approverIds: ['U002', 'U001'],
  },
  {
    id: 'WFT-003',
    name: 'Procurement — Vendor Contract',
    description: 'Requester → Manager → Director → Admin. For supplier and vendor contracts.',
    category: 'procurement',
    approverIds: ['U007', 'U006', 'U008', 'U001'],
  },
  {
    id: 'WFT-004',
    name: 'Compliance — Two-Person Sign-off',
    description: 'Director and Admin co-sign. Used for compliance attestations.',
    category: 'compliance',
    approverIds: ['U008', 'U001'],
  },
  {
    id: 'WFT-005',
    name: 'Legal — Contract Review',
    description: 'Manager → Admin. Quick legal review for short contracts.',
    category: 'legal',
    approverIds: ['U006', 'U001'],
  },
]
