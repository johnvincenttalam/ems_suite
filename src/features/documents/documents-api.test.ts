import { describe, it, expect } from 'vitest'
import { documentsApi } from './api/documents-api'
import { mockUsers } from '@/features/users'
import { mockAuditLog } from '@/features/audit-log/data/mock-audit'

async function uploadFixture(overrides?: Partial<{ approvers: string[]; createdBy: string; title: string }>) {
  return documentsApi.upload({
    title: overrides?.title ?? 'Test Document',
    fileName: 'test.pdf',
    fileType: 'pdf',
    fileSizeBytes: 200_000,
    approvers: overrides?.approvers ?? ['U002', 'U001'],
    createdBy: overrides?.createdBy ?? 'U001',
  })
}

describe('documentsApi.list', () => {
  it('returns documents newest-first', async () => {
    const result = await documentsApi.list()
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].createdAt >= result[i].createdAt).toBe(true)
    }
  })

  it('every createdBy references a known user', async () => {
    const result = await documentsApi.list()
    const userIds = new Set(mockUsers.map((u) => u.id))
    expect(result.every((d) => userIds.has(d.createdBy))).toBe(true)
  })

  it('every approver references a known user', async () => {
    const result = await documentsApi.list()
    const userIds = new Set(mockUsers.map((u) => u.id))
    for (const d of result) {
      expect(d.approvers.every((id) => userIds.has(id))).toBe(true)
    }
  })

  it('every signer is one of the document approvers', async () => {
    const result = await documentsApi.list()
    for (const d of result) {
      const approverSet = new Set(d.approvers)
      expect(d.signatures.every((s) => approverSet.has(s.signerId))).toBe(true)
    }
  })

  it('signatures count never exceeds approvers count', async () => {
    const result = await documentsApi.list()
    expect(result.every((d) => d.signatures.length <= d.approvers.length)).toBe(true)
  })

  it('approved documents have a signature from every approver', async () => {
    const result = await documentsApi.list()
    const approved = result.filter((d) => d.status === 'approved')
    expect(approved.length).toBeGreaterThan(0)
    for (const d of approved) {
      const signerIds = new Set(d.signatures.map((s) => s.signerId))
      expect(d.approvers.every((id) => signerIds.has(id))).toBe(true)
    }
  })

  it('rejected documents have a rejectedReason and rejectedBy', async () => {
    const result = await documentsApi.list()
    const rejected = result.filter((d) => d.status === 'rejected')
    expect(rejected.every((d) => !!d.rejectedReason && !!d.rejectedBy)).toBe(true)
  })

  it('archived documents have an archivedAt timestamp', async () => {
    const result = await documentsApi.list()
    const archived = result.filter((d) => d.status === 'archived')
    expect(archived.length).toBeGreaterThan(0)
    expect(archived.every((d) => !!d.archivedAt)).toBe(true)
  })

  it('non-archived documents do not have an archivedAt timestamp', async () => {
    const result = await documentsApi.list()
    expect(result.filter((d) => d.status !== 'archived').every((d) => !d.archivedAt)).toBe(true)
  })

  it('every signature timestamp is on or after the document creation time', async () => {
    const result = await documentsApi.list()
    for (const d of result) {
      expect(d.signatures.every((s) => s.signedAt >= d.createdAt)).toBe(true)
    }
  })
})

describe('documentsApi.upload', () => {
  it('creates an in_review document with sequential ID and empty signatures', async () => {
    const before = await documentsApi.list()
    const beforeIds = new Set(before.map((d) => d.id))

    const created = await uploadFixture({ title: 'Vendor NDA' })

    expect(created.id).toMatch(/^DOC-\d{3}$/)
    expect(beforeIds.has(created.id)).toBe(false)
    expect(created.status).toBe('in_review')
    expect(created.currentApproverIndex).toBe(0)
    expect(created.signatures).toEqual([])
    expect(created.version).toBe(1)
    expect(created.approvers).toEqual(['U002', 'U001'])

    const after = await documentsApi.list()
    expect(after.length).toBe(before.length + 1)
    expect(after.find((d) => d.id === created.id)).toBeTruthy()
  })

  it('rejects when approvers is empty', async () => {
    await expect(uploadFixture({ approvers: [] })).rejects.toThrow(/at least one approver/i)
  })

  it('records an audit entry with action=create and module=Documents', async () => {
    const beforeLen = mockAuditLog.length
    const created = await uploadFixture({ title: 'Audit Probe Doc', createdBy: 'U002' })
    expect(mockAuditLog.length).toBe(beforeLen + 1)
    const entry = mockAuditLog[0]
    expect(entry.action).toBe('create')
    expect(entry.module).toBe('Documents')
    expect(entry.userId).toBe('U002')
    expect(entry.detail).toContain(created.title)
  })
})

describe('documentsApi.sign', () => {
  it('appends a signature, advances the approver pointer, keeps status in_review', async () => {
    const doc = await uploadFixture({ approvers: ['U002', 'U001'] })

    const updated = await documentsApi.sign(doc.id, 'U002', 'Looks good')

    expect(updated.signatures).toHaveLength(1)
    expect(updated.signatures[0].signerId).toBe('U002')
    expect(updated.signatures[0].comment).toBe('Looks good')
    expect(updated.currentApproverIndex).toBe(1)
    expect(updated.status).toBe('in_review')
  })

  it('flips status to approved on the final signature', async () => {
    const doc = await uploadFixture({ approvers: ['U002', 'U001'] })
    await documentsApi.sign(doc.id, 'U002')
    const final = await documentsApi.sign(doc.id, 'U001')

    expect(final.status).toBe('approved')
    expect(final.currentApproverIndex).toBe(2)
    expect(final.signatures).toHaveLength(2)
  })

  it('rejects a signer who is not the next expected approver', async () => {
    const doc = await uploadFixture({ approvers: ['U002', 'U001'] })
    await expect(documentsApi.sign(doc.id, 'U001')).rejects.toThrow(/not the next approver/i)
  })

  it('rejects when the document is not in review', async () => {
    const doc = await uploadFixture({ approvers: ['U002'] })
    await documentsApi.sign(doc.id, 'U002')
    await expect(documentsApi.sign(doc.id, 'U002')).rejects.toThrow(/not in review/i)
  })

  it('records an audit entry: action=update for non-final, action=approve for final', async () => {
    const doc = await uploadFixture({ approvers: ['U002', 'U001'] })

    const beforeFirst = mockAuditLog.length
    await documentsApi.sign(doc.id, 'U002')
    expect(mockAuditLog.length).toBe(beforeFirst + 1)
    expect(mockAuditLog[0].action).toBe('update')
    expect(mockAuditLog[0].module).toBe('Documents')
    expect(mockAuditLog[0].userId).toBe('U002')

    const beforeFinal = mockAuditLog.length
    await documentsApi.sign(doc.id, 'U001')
    expect(mockAuditLog.length).toBe(beforeFinal + 1)
    expect(mockAuditLog[0].action).toBe('approve')
    expect(mockAuditLog[0].module).toBe('Documents')
  })
})

describe('documentsApi.reject', () => {
  it('flips status to rejected and stamps reason/by/at', async () => {
    const doc = await uploadFixture()
    const updated = await documentsApi.reject(doc.id, 'Needs revision', 'U001')

    expect(updated.status).toBe('rejected')
    expect(updated.rejectedReason).toBe('Needs revision')
    expect(updated.rejectedBy).toBe('U001')
    expect(updated.rejectedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('rejects when the document is not in review', async () => {
    const doc = await uploadFixture({ approvers: ['U002'] })
    await documentsApi.sign(doc.id, 'U002')
    await expect(documentsApi.reject(doc.id, 'too late', 'U001')).rejects.toThrow(/not in review/i)
  })

  it('records an audit entry with action=reject and the reason in detail', async () => {
    const doc = await uploadFixture()
    const beforeLen = mockAuditLog.length
    await documentsApi.reject(doc.id, 'Insufficient detail', 'U001')

    expect(mockAuditLog.length).toBe(beforeLen + 1)
    const entry = mockAuditLog[0]
    expect(entry.action).toBe('reject')
    expect(entry.module).toBe('Documents')
    expect(entry.userId).toBe('U001')
    expect(entry.detail).toContain('Insufficient detail')
  })
})

describe('documentsApi.archive', () => {
  it('flips a finalized document to archived with archivedAt stamped', async () => {
    const doc = await uploadFixture({ approvers: ['U002'] })
    await documentsApi.sign(doc.id, 'U002')
    await documentsApi.finalize(doc.id, 'U001')
    const archived = await documentsApi.archive(doc.id, 'U001')

    expect(archived.status).toBe('archived')
    expect(archived.archivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('rejects when the document is not approved (in_review)', async () => {
    const doc = await uploadFixture()
    await expect(documentsApi.archive(doc.id, 'U001')).rejects.toThrow(/only approved/i)
  })

  it('rejects when the document is not approved (rejected)', async () => {
    const doc = await uploadFixture()
    await documentsApi.reject(doc.id, 'no', 'U001')
    await expect(documentsApi.archive(doc.id, 'U001')).rejects.toThrow(/only approved/i)
  })

  it('rejects when approved but not yet finalized', async () => {
    const doc = await uploadFixture({ approvers: ['U002'] })
    await documentsApi.sign(doc.id, 'U002')
    await expect(documentsApi.archive(doc.id, 'U001')).rejects.toThrow(/finalized before archiving/i)
  })

  it('records an audit entry with module=Documents', async () => {
    const doc = await uploadFixture({ approvers: ['U002'] })
    await documentsApi.sign(doc.id, 'U002')
    await documentsApi.finalize(doc.id, 'U001')

    const beforeLen = mockAuditLog.length
    await documentsApi.archive(doc.id, 'U001')

    expect(mockAuditLog.length).toBe(beforeLen + 1)
    const entry = mockAuditLog[0]
    expect(entry.module).toBe('Documents')
    expect(entry.userId).toBe('U001')
    expect(entry.detail).toContain('Archived')
  })
})

describe('documentsApi.finalize', () => {
  it('stamps finalizedAt + finalizedBy on an approved document', async () => {
    const doc = await uploadFixture({ approvers: ['U002'] })
    await documentsApi.sign(doc.id, 'U002')
    const finalized = await documentsApi.finalize(doc.id, 'U001', '2027-01-01')

    expect(finalized.finalizedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(finalized.finalizedBy).toBe('U001')
    expect(finalized.validityUntil).toBe('2027-01-01')
    expect(finalized.status).toBe('approved')
  })

  it('throws when finalizing a non-approved document', async () => {
    const doc = await uploadFixture()
    await expect(documentsApi.finalize(doc.id, 'U001')).rejects.toThrow(/only approved/i)
  })

  it('throws when already finalized', async () => {
    const doc = await uploadFixture({ approvers: ['U002'] })
    await documentsApi.sign(doc.id, 'U002')
    await documentsApi.finalize(doc.id, 'U001')
    await expect(documentsApi.finalize(doc.id, 'U001')).rejects.toThrow(/already finalized/i)
  })

  it('records an audit entry with action=approve', async () => {
    const doc = await uploadFixture({ approvers: ['U002'] })
    await documentsApi.sign(doc.id, 'U002')
    const beforeLen = mockAuditLog.length
    await documentsApi.finalize(doc.id, 'U001')
    expect(mockAuditLog.length).toBe(beforeLen + 1)
    expect(mockAuditLog[0].action).toBe('approve')
    expect(mockAuditLog[0].detail).toContain('Finalized')
  })
})

describe('documentsApi.revokeSignature', () => {
  it('marks the signature revoked and rolls back to in_review', async () => {
    const doc = await uploadFixture({ approvers: ['U002', 'U001'] })
    await documentsApi.sign(doc.id, 'U002')
    await documentsApi.sign(doc.id, 'U001')

    const revoked = await documentsApi.revokeSignature(doc.id, 'U001', 'realized error')

    expect(revoked.status).toBe('in_review')
    expect(revoked.currentApproverIndex).toBe(1)
    const sig = revoked.signatures.find((s) => s.signerId === 'U001')
    expect(sig?.revokedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(sig?.revocationReason).toBe('realized error')
  })

  it('allows the original signer to re-sign after revoking', async () => {
    const doc = await uploadFixture({ approvers: ['U002'] })
    await documentsApi.sign(doc.id, 'U002')
    await documentsApi.revokeSignature(doc.id, 'U002', 'fix typo')

    const resigned = await documentsApi.sign(doc.id, 'U002', 'after fix')
    expect(resigned.status).toBe('approved')
    expect(resigned.signatures).toHaveLength(2)
    expect(resigned.signatures[1].comment).toBe('after fix')
    expect(resigned.signatures[1].revokedAt).toBeUndefined()
  })

  it('throws when the document is finalized', async () => {
    const doc = await uploadFixture({ approvers: ['U002'] })
    await documentsApi.sign(doc.id, 'U002')
    await documentsApi.finalize(doc.id, 'U001')
    await expect(documentsApi.revokeSignature(doc.id, 'U002', 'too late')).rejects.toThrow(/finalized/i)
  })

  it('throws when the user has no active signature', async () => {
    const doc = await uploadFixture({ approvers: ['U002'] })
    await documentsApi.sign(doc.id, 'U002')
    await expect(documentsApi.revokeSignature(doc.id, 'U001', 'nope')).rejects.toThrow(/no active signature/i)
  })

  it('throws when the document is rejected', async () => {
    const doc = await uploadFixture({ approvers: ['U002', 'U001'] })
    await documentsApi.sign(doc.id, 'U002')
    await documentsApi.reject(doc.id, 'no', 'U001')
    await expect(documentsApi.revokeSignature(doc.id, 'U002', 'nope')).rejects.toThrow(/rejected/i)
  })

  it('records an audit entry with the reason in detail', async () => {
    const doc = await uploadFixture({ approvers: ['U002'] })
    await documentsApi.sign(doc.id, 'U002')
    const beforeLen = mockAuditLog.length
    await documentsApi.revokeSignature(doc.id, 'U002', 'spotted error')
    expect(mockAuditLog.length).toBe(beforeLen + 1)
    expect(mockAuditLog[0].action).toBe('update')
    expect(mockAuditLog[0].detail).toContain('Revoked')
    expect(mockAuditLog[0].detail).toContain('spotted error')
  })
})

describe('documentsApi audit user resolution', () => {
  it('looks up userName for the createdBy on upload audit entries', async () => {
    const created = await uploadFixture({ createdBy: 'U001', title: 'Resolved Author Doc' })
    const entry = mockAuditLog.find((e) => e.detail.includes(created.title))!
    const u = mockUsers.find((u) => u.id === 'U001')!
    expect(entry.userName).toBe(u.name)
  })
})

async function receiptFixture(overrides?: { receivedBy?: string; title?: string }) {
  return documentsApi.registerReceipt({
    title: overrides?.title ?? 'Inbox Doc',
    fileName: 'inbox.pdf',
    fileType: 'pdf',
    fileSizeBytes: 120_000,
    receipt: {
      receivedBy: overrides?.receivedBy ?? 'U002',
      mode: 'email',
      senderSource: 'External Sender Co.',
    },
  })
}

describe('documentsApi.registerReceipt', () => {
  it('creates a draft document with a tracking number', async () => {
    const doc = await receiptFixture({ title: 'Tracked Receipt' })
    expect(doc.status).toBe('draft')
    expect(doc.trackingNumber).toMatch(/^SDMS-\d{4}-\d{4}$/)
    expect(doc.approvers).toEqual([])
    expect(doc.signatures).toEqual([])
    expect(doc.receipt?.senderSource).toBe('External Sender Co.')
    expect(doc.receipt?.receivedBy).toBe('U002')
  })

  it('records an audit entry with action=create', async () => {
    const beforeLen = mockAuditLog.length
    const doc = await receiptFixture({ title: 'Receipt Audit Probe', receivedBy: 'U001' })
    expect(mockAuditLog.length).toBe(beforeLen + 1)
    expect(mockAuditLog[0].action).toBe('create')
    expect(mockAuditLog[0].module).toBe('Documents')
    expect(mockAuditLog[0].userId).toBe('U001')
    expect(mockAuditLog[0].detail).toContain(doc.trackingNumber!)
  })
})

describe('documentsApi.classify', () => {
  it('updates category, priority, confidentiality, and tags on a draft', async () => {
    const doc = await receiptFixture()
    const updated = await documentsApi.classify(doc.id, {
      category: 'finance',
      priority: 'urgent',
      confidentiality: 'confidential',
      departmentId: 'D003',
      tags: ['budget', 'q2'],
    }, 'U001')

    expect(updated.category).toBe('finance')
    expect(updated.priority).toBe('urgent')
    expect(updated.confidentiality).toBe('confidential')
    expect(updated.departmentId).toBe('D003')
    expect(updated.tags).toEqual(['budget', 'q2'])
    expect(updated.status).toBe('draft')
  })

  it('throws when classifying a non-draft document', async () => {
    const doc = await uploadFixture()
    await expect(
      documentsApi.classify(doc.id, {
        category: 'other',
        priority: 'normal',
        confidentiality: 'internal',
      }, 'U001'),
    ).rejects.toThrow(/only draft/i)
  })

  it('throws on unknown document', async () => {
    await expect(
      documentsApi.classify('DOC-MISSING', {
        category: 'other',
        priority: 'normal',
        confidentiality: 'internal',
      }, 'U001'),
    ).rejects.toThrow(/not found/i)
  })
})

describe('documentsApi.startWorkflow', () => {
  it('promotes a draft to in_review with approvers and seeds a routing entry', async () => {
    const doc = await receiptFixture()
    const started = await documentsApi.startWorkflow(doc.id, ['U002', 'U001'], 'U001', '2026-05-15')

    expect(started.status).toBe('in_review')
    expect(started.approvers).toEqual(['U002', 'U001'])
    expect(started.currentApproverIndex).toBe(0)
    expect(started.deadline).toBe('2026-05-15')
    expect(started.routings?.length).toBeGreaterThanOrEqual(1)
    const last = started.routings![started.routings!.length - 1]
    expect(last.recipientId).toBe('U002')
    expect(last.purpose).toBe('approval')
    expect(last.status).toBe('pending')
  })

  it('throws when approvers is empty', async () => {
    const doc = await receiptFixture()
    await expect(documentsApi.startWorkflow(doc.id, [], 'U001')).rejects.toThrow(/at least one approver/i)
  })

  it('throws when document is not a draft', async () => {
    const doc = await uploadFixture()
    await expect(documentsApi.startWorkflow(doc.id, ['U001'], 'U001')).rejects.toThrow(/only draft/i)
  })
})

describe('documentsApi.route', () => {
  it('appends a routing entry with status=pending', async () => {
    const doc = await uploadFixture({ approvers: ['U002', 'U001'] })
    const before = doc.routings?.length ?? 0
    const updated = await documentsApi.route(doc.id, {
      senderId: 'U002',
      recipientId: 'U004',
      purpose: 'review',
      notes: 'Cross-functional eyes please',
    })
    expect(updated.routings!.length).toBe(before + 1)
    const r = updated.routings![updated.routings!.length - 1]
    expect(r.recipientId).toBe('U004')
    expect(r.status).toBe('pending')
    expect(r.notes).toContain('Cross-functional')
  })
})

describe('documentsApi.recordAccess', () => {
  it('appends an access log entry', async () => {
    const doc = await uploadFixture()
    const before = doc.accessLog?.length ?? 0
    const updated = await documentsApi.recordAccess(doc.id, 'U002', 'view')
    expect(updated.accessLog!.length).toBe(before + 1)
    expect(updated.accessLog![updated.accessLog!.length - 1].activity).toBe('view')
    expect(updated.accessLog![updated.accessLog!.length - 1].userId).toBe('U002')
  })

  it('records an audit entry for download access', async () => {
    const doc = await uploadFixture()
    const beforeLen = mockAuditLog.length
    await documentsApi.recordAccess(doc.id, 'U002', 'download', 'External counsel review')
    expect(mockAuditLog.length).toBe(beforeLen + 1)
    expect(mockAuditLog[0].action).toBe('update')
    expect(mockAuditLog[0].detail).toContain('Download')
    expect(mockAuditLog[0].detail).toContain('External counsel review')
  })

  it('does not audit a routine view of a non-confidential document', async () => {
    const doc = await uploadFixture()
    const beforeLen = mockAuditLog.length
    await documentsApi.recordAccess(doc.id, 'U002', 'view')
    expect(mockAuditLog.length).toBe(beforeLen)
  })
})

describe('documentsApi.archive — retention', () => {
  it('stamps default retention metadata', async () => {
    const doc = await uploadFixture({ approvers: ['U002'] })
    await documentsApi.sign(doc.id, 'U002')
    await documentsApi.finalize(doc.id, 'U001')
    const archived = await documentsApi.archive(doc.id, 'U001')

    expect(archived.archiveInfo).toBeDefined()
    expect(archived.archiveInfo!.retentionMonths).toBe(60)
    expect(archived.archiveInfo!.disposalDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(archived.archiveInfo!.storageLocation).toBeTruthy()
  })

  it('honors explicit retention override', async () => {
    const doc = await uploadFixture({ approvers: ['U002'] })
    await documentsApi.sign(doc.id, 'U002')
    await documentsApi.finalize(doc.id, 'U001')
    const archived = await documentsApi.archive(doc.id, 'U001', {
      storageLocation: 'Vault Z — Shelf 9',
      retentionMonths: 24,
    })
    expect(archived.archiveInfo!.storageLocation).toBe('Vault Z — Shelf 9')
    expect(archived.archiveInfo!.retentionMonths).toBe(24)
  })
})

describe('documentsApi.sign — routing closure', () => {
  it('closes the pending routing entry for the signer when one exists', async () => {
    const draft = await receiptFixture()
    const started = await documentsApi.startWorkflow(draft.id, ['U002', 'U001'], 'U001')
    const pendingForU002 = started.routings!.find((r) => r.recipientId === 'U002' && r.status === 'pending')
    expect(pendingForU002).toBeTruthy()

    const signed = await documentsApi.sign(draft.id, 'U002', 'looks fine')
    const closed = signed.routings!.find((r) => r.id === pendingForU002!.id)
    expect(closed?.status).toBe('completed')
    expect(closed?.completedAt).toBeTruthy()

    const handoff = signed.routings!.find((r) => r.recipientId === 'U001' && r.status === 'pending')
    expect(handoff).toBeTruthy()
  })
})
