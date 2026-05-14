import type { DocumentCategory, SignatureSlot, WorkflowTemplate } from '../types'
import { mockWorkflowTemplates } from '../data/mock-workflow-templates'
import { mockUsers } from '@/features/users/data/mock-users'
import { canManageWorkflowTemplates } from '../lib/sdms-permissions'

function assertCanManage(actorId: string): void {
  const actor = mockUsers.find((u) => u.id === actorId) ?? null
  if (!canManageWorkflowTemplates(actor)) {
    throw new Error('You do not have permission to manage workflow templates')
  }
}

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? Math.random() * 200 + 100))

interface CreateTemplateInput {
  name: string
  description?: string
  category?: DocumentCategory
  approverIds: string[]
  signatureSlots?: SignatureSlot[]
  referenceUrl?: string
}

type UpdateTemplateInput = Partial<CreateTemplateInput>

function nextTemplateId(): string {
  const max = mockWorkflowTemplates.reduce((m, t) => {
    const n = Number(t.id.replace(/^WFT-/, ''))
    return Number.isFinite(n) && n > m ? n : m
  }, 0)
  return `WFT-${String(max + 1).padStart(3, '0')}`
}

function findOrThrow(id: string): WorkflowTemplate {
  const t = mockWorkflowTemplates.find((x) => x.id === id)
  if (!t) throw new Error(`Workflow template ${id} not found`)
  return t
}

/**
 * Workflow templates API. Swap with real HTTP when backend is ready:
 *   list:   () => http.get<WorkflowTemplate[]>('/workflow-templates')
 *   create: (input) => http.post<WorkflowTemplate>('/workflow-templates', input)
 *   update: (id, input) => http.patch<WorkflowTemplate>(`/workflow-templates/${id}`, input)
 *   delete: (id) => http.delete(`/workflow-templates/${id}`)
 */
export const workflowTemplatesApi = {
  list: async (): Promise<WorkflowTemplate[]> => {
    await delay()
    return [...mockWorkflowTemplates]
  },

  create: async (input: CreateTemplateInput, actorId: string): Promise<WorkflowTemplate> => {
    await delay(120)
    assertCanManage(actorId)
    if (input.approverIds.length === 0) throw new Error('At least one approver is required')
    if (!input.name.trim()) throw new Error('Name is required')
    const t: WorkflowTemplate = {
      id: nextTemplateId(),
      name: input.name.trim(),
      description: input.description?.trim() || undefined,
      category: input.category,
      approverIds: [...input.approverIds],
      signatureSlots: input.signatureSlots && input.signatureSlots.length > 0 ? input.signatureSlots : undefined,
      referenceUrl: input.referenceUrl?.trim() || undefined,
    }
    mockWorkflowTemplates.push(t)
    return t
  },

  update: async (id: string, patch: UpdateTemplateInput, actorId: string): Promise<WorkflowTemplate> => {
    await delay(120)
    assertCanManage(actorId)
    const t = findOrThrow(id)
    if (patch.approverIds !== undefined && patch.approverIds.length === 0) {
      throw new Error('At least one approver is required')
    }
    if (patch.name !== undefined) {
      const trimmed = patch.name.trim()
      if (!trimmed) throw new Error('Name is required')
      t.name = trimmed
    }
    if (patch.description !== undefined) t.description = patch.description.trim() || undefined
    if (patch.category !== undefined) t.category = patch.category
    if (patch.approverIds !== undefined) t.approverIds = [...patch.approverIds]
    if (patch.signatureSlots !== undefined) {
      t.signatureSlots = patch.signatureSlots.length > 0 ? patch.signatureSlots : undefined
    }
    if (patch.referenceUrl !== undefined) t.referenceUrl = patch.referenceUrl.trim() || undefined
    return t
  },

  delete: async (id: string, actorId: string): Promise<void> => {
    await delay(100)
    assertCanManage(actorId)
    const idx = mockWorkflowTemplates.findIndex((x) => x.id === id)
    if (idx < 0) throw new Error(`Workflow template ${id} not found`)
    mockWorkflowTemplates.splice(idx, 1)
  },
}
