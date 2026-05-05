# SDMS User Guide

The **Smart Document Management System** is the SDMS module of EMS Suite. It tracks documents from the moment they enter the organization through review, approval, finalization, and long-term archival — with a full audit trail.

This guide is for end users (creators, approvers, reviewers, administrators). For the underlying spec, see [`sdms-spec.md`](./sdms-spec.md) in the same folder.

---

## Quick start (5 minutes)

1. **Pick the SDMS module** at the home page (`/`).
2. **Log in** with any demo account — see [Demo accounts](#demo-accounts) below. Password is `demo123` (or anything; mock auth accepts any password).
3. You land on the **SDMS Dashboard**. From here you can:
   - See organization-wide stats (Total Documents, Pending Approvals, Approved This Month, Overdue)
   - View **My Tasks** — documents waiting on your action
   - See recent documents and document status breakdown
4. Click **My Tasks** in the sidebar to see what needs your attention.
5. Click **Documents** to browse the directory.
6. Click **Create Document** (top right of Dashboard or Documents page) to add a new document.

---

## Demo accounts

All accounts share password `demo123`. Switch between them quickly using the **↻ icon** in the topbar (User Switcher).

| Account | Role in demos | SDMS access |
|-|-|-|
| `admin@example.com` (Admin User) | System administrator, final approver | Full |
| `operations@example.com` (Jane Doe) | Cross-functional user | Yes |
| `documents@example.com` (Marcus Hale) | SDMS power user | Yes |
| `sarah.johnson@example.com` (Sarah Johnson) | Document creator | Yes |
| `mike.thompson@example.com` (Mike Thompson) | Manager-level approver | Yes |
| `emily.davis@example.com` (Emily Davis) | Operations approver / reviewer | Yes |
| `david.chen@example.com` (David Chen) | Director-level approver | Yes |

> **Note:** the User Switcher exists because the app currently uses mock authentication. When real auth is wired up, this control should be removed or restricted to admins.

---

## The document lifecycle

Every document moves through a defined set of phases:

```
inbox  →  classified  →  in workflow  →  finalized  →  archived
                                    ↘
                                     disapproved
                                    ↘
                                     revision requested → resubmitted
```

| Phase | What it means | Where it lives |
|-|-|-|
| **Inbox** | Unclassified draft (no category yet). Usually a doc that came in via mail/email and was logged. | Documents tab, status filter `Draft` |
| **Classified** | Draft with category, priority, confidentiality, department assigned. Ready to start a workflow. | Documents tab |
| **In workflow** | Doc is being routed to approvers in order. | My Tasks (for current approver) and Documents tab (status `In Review`) |
| **Approved** | All approvers have signed. | Documents tab (status `Approved`) |
| **Finalized** | Signatures are locked. The doc can no longer be edited or have signatures revoked. | Documents tab (status `Approved`, with finalize date) |
| **Archived** | Long-term storage with retention metadata. | Documents tab, status filter `Archived` |
| **Disapproved** | An approver rejected with reason. Workflow ended. | My Tasks → Returned (for the author); Documents tab status `Disapproved` |
| **Revision requested** | An approver returned the doc for the author to revise and resubmit. | My Tasks → Returned (for the author) |

---

## Common tasks (how-to)

### Create a new document

1. **SDMS → Documents** → click **Create Document** (top right). Or click **Create Document** on the Dashboard header.
2. Fill in the form:
   - **File** — drag-and-drop or click to mock-pick a file
   - **Title** (required), **Description** (optional)
   - **Type** (category), **Department**, **Priority**, **Confidentiality**
   - **Tags** — type and press Enter to add chips
3. **Workflow Template** (optional, right sidebar) — pick a named approver chain (e.g. "Finance — Standard Approval"). It auto-fills the approvers and category.
4. **Approvers** — pick who needs to sign, in order. The first listed signs first.
5. Click **Save Draft** to keep it as a draft (no approvers required), or **Submit for Approval** to send it into the workflow immediately.

### Approve a task assigned to you

1. **SDMS → My Tasks** → **Pending Approvals** tab. The sidebar badge shows the count.
2. Click a row → opens the **Document Viewer**.
3. Read the doc, check the **Workflow Progress** sidebar to see who's signed and who's pending.
4. (Optional) type a comment in the **Comments** panel.
5. Click **Approve** to sign and advance the workflow. If you typed a comment, your signature carries it.
6. The doc moves to the next approver, or — if you're the final signer — flips to `Approved` and exits your tasks.

You can also approve quickly from the My Tasks list using the inline **Approve** button on each row (no navigation needed).

### Disapprove a document

Disapproval ends the workflow with a recorded reason. Use this when the doc shouldn't move forward at all.

1. From the Document Viewer or the My Tasks list, click **Disapprove**.
2. (From My Tasks) a modal asks for a reason. From the viewer, type the reason in the comment box first, then click **Disapprove**.
3. The author sees the disapproval in their **My Tasks → Returned** tab.

### Request a revision (vs disapprove)

**Request Revision** means *"I'm not approving yet — please change something and resubmit"*. The author can later resubmit the document into the same workflow.

1. From the Document Viewer, type what needs to change in the comment box.
2. Click **Request Revision**.
3. The doc shows up in the author's Returned tab labeled `Revision requested: <reason>` (different from `Disapproved` so they know they can act on it).

### Resubmit a revision (as the author)

1. **SDMS → My Tasks → Returned** tab → find the row labeled `Revision requested`.
2. Click the row → opens the Viewer with an amber callout showing the reviewer's reason.
3. Edit the document as needed (in a real deployment this would mean re-uploading the file), then click **Resubmit for Approval**.
4. Confirm in the dialog — prior signatures are cleared, the version number increments (v1 → v2), and the workflow restarts at step 1.

### Finalize an approved document

Finalization locks the signatures so they cannot be revoked. It's required before archiving.

1. **SDMS → Documents** → find the row with status `Approved`.
2. Click the **Finalize** action.
3. Confirm in the modal. Optionally set a `Validity Until` date.

### Archive a finalized document

Archiving moves a finalized document to long-term storage with retention metadata.

1. **SDMS → Documents** → find an approved-and-finalized row.
2. Click the **Archive** action.
3. Defaults: 60 months retention, "Vault A — Default Shelf", off-site cloud cold storage. These can be customized in a real deployment.
4. The document's status changes to `Archived` and it's filtered out of active views by default. Use the status filter chip to see archived documents.

### Search & filter the directory

The **Documents** page supports:
- **Status filter chips** — Draft / In Review / Approved / Disapproved / Archived
- **Search input** — searches title, tracking number, ID, author
- **Category, Priority, Confidentiality, Department** dropdown filters
- **Export menu** — CSV / Excel / PDF for the current filtered view

### Manage workflow templates (admin)

A workflow template is a named, reusable approver chain.

1. **SDMS → Admin → Workflow Templates**.
2. Click **New Template** (top right) to create one. Name, default category, approver chain.
3. The approver chain has up/down arrows on each chip to reorder.
4. **Edit** an existing template via the pencil icon.
5. **Delete** via the trash icon. Documents already created from a deleted template keep their copied approver list — only future picks lose access to it.
6. The "Used By" column shows how many existing documents share this exact approver chain.

Templates created here become available immediately in the **Create Document** form's Workflow Template picker.

---

## Status badges & colors

| Status | Color | Meaning |
|-|-|-|
| Draft | Gray | Not yet in any workflow |
| In Review | Blue | Currently being routed to approvers |
| Approved | Green | All approvers have signed |
| Disapproved | Red | An approver rejected; workflow ended |
| Archived | Gray | Locked away with retention metadata |

In the **Workflow Progress** stepper:

| State | Color | Meaning |
|-|-|-|
| Done | Green check | This approver has signed |
| Current | Amber | Awaiting this approver's signature |
| Pending | Gray | Waiting in queue |
| Disapproved | Red X | This approver rejected |

---

## Roles in a workflow

| Role | What they do | Where they see it |
|-|-|-|
| **Creator (author)** | Created the document; can resubmit if revision is requested | My Tasks → Returned (for revisions) |
| **Approver** | Listed in the document's approver chain. Signs in their assigned order. Once it's their turn, the doc shows up in their My Tasks → Pending. | My Tasks → Pending |
| **Reviewer** | Routed the document for review (not approval). They give input but don't gate the workflow. | My Tasks → For Review |
| **Administrator** | Manages users, workflow templates, and SDMS settings. Often the final approver. | Admin section of the SDMS sidebar |

---

## Digital signatures

When you click **Approve**, the system records a digital signature with:

- **Signer ID** — who signed
- **Timestamp** — when (UTC)
- **Comment** — optional message attached to the signature
- **Method** — `click-to-sign` (default; PKI / OTP / biometric reserved for future)
- **Reason** — `approval` (default; `review` / `witness` / `acknowledgment` reserved)
- **Document version** — which version was signed (proves the signature applies to specific content)
- **User agent** — browser/device fingerprint

To see the metadata, open any signed document → **Versions** tab in the Document Viewer.

You can verify the integrity of a signature chain via the document detail drawer's **Verify Signature Chain** button. The verifier checks:
- Each signer is in the approver list
- Signatures are in chronological order
- No signatures were applied after finalization
- Revoked signatures are flagged

> **Note:** the current implementation is a structural/auditable digital signature, not cryptographic PKI. Real PKI requires backend integration — see the spec for details.

---

## Audit trail

Every meaningful action on a document is recorded in the audit log. To see it:

- **Per document** — Document Viewer → **Audit Trail** tab
- **System-wide for SDMS** — SDMS sidebar → no direct logs page (logs are filtered to SDMS only via redirects), or click **Admin → Audit Log** in the Admin module

What's logged:
- Document created / classified / routed
- Sign / disapprove / request revision / resubmit
- Finalize / archive
- Access events (view / download / print / edit)

---

## Tips & gotchas

- **Sequential approval only.** The current API enforces strict sign order. Approver 2 cannot sign before Approver 1. Parallel/conditional approvals require additional implementation.
- **Drafts can have no approvers.** "Save Draft" doesn't validate approvers; "Submit for Approval" requires at least one.
- **Revision vs disapproval is meaningful.** Use Disapprove only when the document should not move forward at all. Use Request Revision when the author should revise and try again.
- **Resubmitting clears prior signatures.** Approvers will need to sign the new version. The version number increments, so the audit trail still shows what was signed against what content.
- **Archiving requires finalization.** You can't skip from Approved straight to Archived — finalize first.
- **Workflow templates copy approvers.** When a template is applied, the approver list is copied into the document at submit time. Editing the template later doesn't change docs already created from it.
- **Dev User Switcher is visible in production builds today.** This is intentional for the mock template. Remove it before deploying with real auth.

---

## FAQ

**I approved a task but the badge still shows the old number.**
The badge counts only **Pending Approvals** (where you're the next signer). If you have other items in *For Review* or *Returned*, those don't decrement the badge but do show up in My Tasks. The page subtitle "X tasks waiting on you" includes all three buckets.

**Where's the file preview?**
File rendering isn't wired up in the template — uploads are mocked. The Viewer's Preview tab shows file metadata only. A real deployment would integrate a PDF/image renderer here.

**Can I delete a document?**
Not currently. The lifecycle ends in Archived (with a disposal date), not deletion. Adding soft-delete / Trash would require a model change.

**Why does the comment box's "Sign & Send" button approve the document?**
Comments are tied to signatures in the current model — there's no comment-only API. Clicking Sign & Send records your signature with the comment attached. To post a comment without approving, type the text and use the Disapprove or Request Revision button instead.

**How do I get back to the module selector?**
Topbar → **Modules** link (top-left, next to the search). Or click your avatar → **Switch module**.

**Where can I see my signed/finalized documents?**
**My Tasks → Completed** tab. Shows everything you've signed that ended in `Approved`.

---

## Where to look in the codebase

For developers extending the SDMS:

- **Pages** — `src/features/documents/pages/`
- **API (mock-backed)** — `src/features/documents/api/`
- **Types** — `src/features/documents/types.ts`
- **Mock data** — `src/features/documents/data/`
- **Hooks** — `src/features/documents/hooks/`
- **Workflow templates** — `src/features/documents/data/mock-workflow-templates.ts`
- **Sidebar / nav config** — `src/config/modules.ts` (look for `key: 'sdms'`)
