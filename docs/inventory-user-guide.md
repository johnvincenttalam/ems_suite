# Inventory User Guide

The **Inventory Management System** is the Inventory module of EMS Suite. It tracks consumable and durable items across warehouses, records every stock movement (in / out / transfer / adjustment), gates risky changes through an approver, runs scheduled cycle counts to reconcile book vs. physical stock, and rolls everything up into a dashboard, alerts page, and report library — all with an audit trail.

This guide is for end users (operators, approvers, warehouse leads, administrators). For implementation details, see [`ems-specification.md`](./ems-specification.md) and the inline code comments in `src/features/inventory/`.

---

## Quick start (5 minutes)

1. **Pick the Inventory module** at the home page (`/`).
2. **Log in** with any demo account — see [Demo accounts](#demo-accounts) below. Password is `demo123` (or anything; mock auth accepts any password).
3. You land on the **Inventory Dashboard**:
   - Stat cards: Total Items, Low Stock, Stock-outs, Inventory Value
   - Charts: 6-month value trend (estimated), stock by category, value by warehouse, movement breakdown
   - Cards: Items Below Reorder, Recent Movements, Top Categories, Recent Activity
4. Click **Items** in the sidebar to browse the registry. **Stock In/Out**, **Transfers**, **Adjustments**, **Cycle Count** are the four operational workflows.
5. Click **Settings** (Administration group) to tune thresholds, defaults, and approval/movement rules.

---

## Demo accounts

All accounts share password `demo123`. Switch between them quickly using the **↻ icon** in the topbar (User Switcher).

| Account | Role in demos | Inventory access |
|-|-|-|
| `admin@example.com` (Admin User) | System administrator, can approve every workflow | Full + admin |
| `operations@example.com` (Jane Doe) | Operations Manager, primary inventory approver | Full + admin |
| `john@example.com` (John Smith) | Field operator — submits stock in/out and pending transfers/adjustments | Full, not admin |
| `emily.davis@example.com` (Emily Davis) | Procurement Analyst — read access | Full, not admin |

> Approver dropdowns on Transfers and Adjustments are filtered to **inventory module admins only**, so John Smith can submit but only Admin User and Jane Doe show up as pickable approvers.

---

## The stock movement model

Every change to on-hand quantity is recorded as a **Stock Movement** with one of four types:

| Type | What it does | Apply timing |
|-|-|-|
| **Stock In** | Adds to a warehouse (PO receipt, intake, return) | Immediate — posts on submit |
| **Stock Out** | Removes from a warehouse (issuance, consumption) | Immediate — posts on submit |
| **Transfer** | Moves stock from one warehouse to another | **Pending until approved** |
| **Adjustment** | Reconciles a discrepancy (damage, loss, found stock, cycle count correction) | **Pending until approved** |

Stock In and Stock Out post immediately because they're paper-trail operations on physical events that already happened. Transfers and Adjustments require approval because they shift recorded balances and can hide loss or theft if unsupervised.

### Approval lifecycle (transfers + adjustments)

```
   submit          approve            (book updated)
pending  ─────────────────►  applied
   │
   │  reject (with reason)
   ▼
rejected
```

| Status | Color | Meaning |
|-|-|-|
| Pending | Amber | Submitted, awaiting the named approver |
| Approved (applied) | Green | Approver signed; stock change posted |
| Rejected | Red | Approver declined with a reason; stock unchanged |

The submitter picks the approver explicitly when submitting. Only that named user (or any inventory module admin) can act on the request. The audit log records both the submission and the resolution.

---

## The cycle count lifecycle

A **Cycle Count Session** spot-checks a warehouse (or a category within it) and posts auto-applied adjustments for any variance.

```
schedule  ─►  start  ─►  in_progress  ─►  finalize  ─►  completed
                              │
                              └─ cancel ─►  cancelled
```

| Status | Color | What's happening |
|-|-|-|
| Scheduled | Gray | Lines locked from the warehouse snapshot at scheduling time. No counts entered yet. |
| Counting (in_progress) | Amber | Counters recording physical quantities line-by-line. |
| Completed | Green | Finalized — variances posted as adjustments and stock reconciled. |
| Cancelled | Red | Dropped without applying any adjustments. Recorded counts kept for audit. |

> **Variance is computed against LIVE stock, not the schedule-time snapshot.** If movements happen during the count window (e.g. a stock-out on an item being counted), the finalize math reconciles the book to whatever the counter physically saw, so there's no double-counting. The snapshot value is shown alongside in the audit narrative.

---

## Common tasks (how-to)

### Register a new item

1. **Inventory → Items** → click **Register Item** (top right of the table).
2. Fill in the form:
   - **Name** (required), **SKU** (required, unique)
   - **Category**, **Unit of Measure**, **Warehouse**
   - **Quantity on hand** (initial stock), **Reorder Level**, **Unit Cost**
3. Click **Save**. The item is recorded with an `INV-XXXX` ID.
4. The audit log records `Added item …` against your name.

### Record a stock-in (receive stock)

1. **Inventory → Stock In / Out** → top tab **Stock In**.
2. Pick the item. The form shows **current / change / after** quantities live so you can sanity-check.
3. Enter the **Quantity** received.
4. **Batch Number** — required if Settings → System Preferences → "Require batch number" is on; optional otherwise.
5. **Reference Number** — leave blank to auto-generate `RCPT-XXXXXX-NNN` (only when Settings → "Auto-generate reference number" is on); otherwise type your own (PO number, delivery note, etc.).
6. **Remarks** — optional context.
7. Click **Save Stock-In**. The item's quantity is updated immediately.

### Record a stock-out (issue stock)

1. **Inventory → Stock In / Out** → top tab **Stock Out**.
2. Pick the item — the live preview shows current/change/**after**.
3. If the result would push stock below zero, the preview turns red and the form notes:
   > Negative stock is disabled in Settings — submission will fail.
4. Submit. If `allowNegativeStock` is on (Settings → System Preferences), the form does not block negative outcomes.

### Submit a transfer

1. **Inventory → Transfers** → fill the New Transfer form on the left.
2. Pick **Item**, **Source Warehouse**, **Destination Warehouse** (must differ), **Quantity**.
3. Pick the **Approving Authority** — only inventory admins are listed.
4. Add **Remarks** (optional but recommended for the approver).
5. Click **Submit Transfer**. The row appears in the right-hand list with status **Pending — Awaits {approver}**.
6. While pending, stock is unchanged. The named approver sees the inline **Approve** / **Reject** buttons on their copy of the row.

### Approve or reject a transfer

1. **Inventory → Transfers** → in the right-hand list, find the pending row addressed to you.
2. The row shows inline **Approve** and **Reject** buttons. The buttons only appear if you are the named approver.
3. Click **Approve** to post the stock change immediately, or **Reject** to open a modal that requires a reason.
4. Either way, the audit log captures who, when, and (on reject) why.

### Submit an adjustment

1. **Inventory → Adjustments** → fill the New Adjustment form.
2. Pick the **Item**. The form shows **Current Stock** (read-only), takes the **Adjusted Stock** target you want, and computes **Variance** live.
3. Pick a **Reason** from the dropdown (Damage / Loss / Cycle count correction / Expiry / Found stock / Other).
4. Pick the **Approving Authority**.
5. Optional **Remarks** for additional context.
6. Click **Submit Adjustment**.

> The adjustment captures the user's intended **target on-hand quantity**, not just the delta. If other movements happen between submission and approval, the approver's posting recomputes the delta against live stock — so the book lands on your target, not on a stale arithmetic.

### Approve or reject an adjustment

Same UI shape as transfers. Pending adjustments display in the right-hand list with `Awaits {approver}`. The approver sees inline **Approve** / **Reject**. Approve posts the adjustment; Reject requires a reason.

### Run a cycle count

1. **Inventory → Cycle Count** → fill the **Schedule New Count** form on the left:
   - **Warehouse** (required)
   - **Category** (optional — leave blank to count every item)
   - **Schedule Date**
2. Click **Schedule Count**. A new session appears in the right-hand list with status `Scheduled`.
3. Click the session to open its **Cycle Count Details** panel below.
4. Enter the **Actual** quantity for each line. The session auto-promotes from `Scheduled` to `Counting` on the first count.
5. The right-hand summary donut shows Match / Variance / Not Counted breakdowns live.
6. When done counting (you can leave lines uncounted — they'll be ignored on finalize):
   - Click **Finalize Session** to apply the adjustments. A confirm modal previews each adjustment as `Book → Counted (variance)` so you can sanity-check.
   - Click **Cancel session** to drop the session without applying anything (counts stay on the record for audit).
7. Finalize creates auto-applied **Adjustment** movements (no separate approver — the count itself is the authorization), and the session flips to `Completed`.

### Set up alerts thresholds

1. **Inventory → Settings → Stock Thresholds**.
2. Two percent thresholds, both expressed as a percentage of the item's reorder level:
   - **Reorder Level Warning (%)** — default 80%. Stock at or below this is **Low**.
   - **Critical Level (%)** — default 50%. Stock at or below this is **Critical**.
3. The page enforces `Critical ≤ Warning` and surfaces a banner if you tie them.
4. Items at exactly 0 always trigger a stock-out alert regardless of these settings.

### Generate a report

1. **Inventory → Reports** → top tab **Generate**.
2. Pick a **Report Type** in the left rail (Stock Movement / Consumption / Low Stock / Valuation / Stock Aging).
3. Set filters: **Date from**, **Date to**, **Warehouse**, **Category**, **Format** (PDF / Excel / CSV).
4. The form validates `Date from ≤ Date to` and disables Generate while invalid.
5. Click **Generate Report**. The request is recorded in **Recent Reports** below (last 25, persisted in `localStorage`).

> Generation is mocked — the request is recorded for audit, but no file is produced until the backend reporting service is wired up. The Download button will say so when clicked.

The **Analytics** tab shows real computed numbers (Total Items, Total Value, Low Stock, Stock-outs, 30d movements, Turnover Hint, Slow Movers, Warehouses) and breakdowns by Warehouse / Category / Movement Type.

---

## Settings reference

Settings live at **Inventory → Settings**. Most apply immediately (no save button) and persist to `localStorage`.

### General
- **Default reorder level** — pre-fills the field on the Register Item form.

### Stock Thresholds
- **Reorder Level Warning (%)** — drives the Low Stock counter and "Items Below Reorder" list on the dashboard.
- **Critical Level (%)** — drives the critical-stock count.

### System Preferences
- **Enable barcode scanning** — placeholder toggle (scanner integration pending).
- **Auto-generate reference number** — Stock In/Out fills in `RCPT-XXXXXX-NNN` / `ISSUE-XXXXXX-NNN` when the user leaves it blank.
- **Require batch number** — Stock In/Out submissions must include a batch number; useful for traceability.
- **Allow negative stock** — when off, stock-outs and adjustment approvals refuse to push item quantity below zero. When on, they're allowed (with no warning beyond the form preview).

### Movement Rules
- **Require reason on adjustment** — when on, the adjustment form requires a Reason. When off, the field is optional.
- **Require destination on transfer** — when on, transfers must specify a destination warehouse. When off, transfers can be submitted with destination blank.

### Defaults
- **Default Warehouse / Default Unit / Default Currency** — pre-fill these fields on new forms. Users can still override per-record.

### Notifications
- **Low stock** / **Stock out** — control whether the bell icon and Alerts page surface those events.

---

## Stock health thresholds (the math)

Given an item's `quantity` and `reorderLevel`, and the configured percent thresholds:

| Result | Condition |
|-|-|
| **Out of stock** | `quantity ≤ 0` |
| **Critical** | `quantity > 0 && quantity ≤ reorderLevel × (criticalPercent / 100)` |
| **Low** | `quantity > 0 && quantity ≤ reorderLevel × (reorderWarningPercent / 100)` |
| **Healthy** | otherwise |

Items with `reorderLevel = 0` are always healthy (unless on-hand is 0).

The `getStockHealth(item, thresholds)` helper in `src/features/inventory/lib/stock-health.ts` is the single source of truth — the dashboard, the alerts page, and the items table all use it.

---

## Status badges & colors

### Movement status

| Status | Color | Meaning |
|-|-|-|
| Pending | Amber | Awaiting approver action |
| Approved (applied) | Green | Stock change posted |
| Rejected | Red | Approver declined with reason |

### Cycle count session status

| Status | Color | Meaning |
|-|-|-|
| Scheduled | Gray | Lines locked, no counts yet |
| Counting | Amber | In progress; auto-promoted on first count |
| Completed | Green | Finalized; adjustments posted |
| Cancelled | Red | Dropped before finalization |

### Cycle count line status

| State | Color | Meaning |
|-|-|-|
| Pending | Gray | No actual quantity entered |
| Match | Green | Counted = current book quantity |
| Variance | Amber | Counted differs from book; an adjustment will be posted on finalize |

---

## Tips & gotchas

- **Stock In/Out and Transfers are different concepts.** Stock In/Out is paper-trail movement (you're recording that something physically happened, often outside the system). Transfers are an inter-warehouse stock movement that requires authorization. Don't try to model "moving stock to another site" as a stock-out + stock-in — use Transfer.
- **Cycle count finalize uses live stock, not the snapshot.** If movements happen during the count, the variance and posted adjustment are computed against the current book quantity at finalize time. The original `expectedQty` from the snapshot is preserved on the line for the audit narrative.
- **Adjustment target is preserved through approval.** When you submit an adjustment to "set stock to X", that target is captured. If movements happen before the approver acts, the posted delta is recomputed so the book lands on X — not on `X - intervening movements`.
- **Approvers are inventory admins only.** The approver dropdown filters to users with `moduleAdmins.includes('inventory')`. If you can't find the person you want, check their role in Admin → Users.
- **Settings apply immediately.** There's no "Save" button — every toggle and input writes through to local state and persists. "Reset to defaults" reverts all settings at once.
- **Reorder thresholds are percentages, not absolute counts.** Default 80% / 50% means "warn at 80% of reorder level, critical at 50%". A 100-unit reorder level with default thresholds warns at 80 units and goes critical at 50 units.
- **Generation is mocked.** Reports → Generate records the request for audit but doesn't produce a file. The Download button is honest about this — it says "Download not available yet" with the report ID.
- **Movements page is hidden but reachable.** The legacy `/module/inventory/movements` route still exists for the unified audit view, but it's not in the sidebar. Stock In/Out, Transfers, and Adjustments cover the operational use cases.

---

## FAQ

**Why do my stock-outs sometimes fail with "Cannot stock-out N of {item}"?**
The `Allow negative stock` setting is off (default). The form blocks any stock-out that would push `item.quantity` below zero. Either reduce the quantity, do a stock-in first, or flip the setting on in Settings → System Preferences. The same guard runs on adjustment approval — an approver can't sign off an adjustment with a negative outcome unless the setting allows it.

**The transfer I submitted shows status "Pending — Awaits …" but I am the approver. Why don't I see Approve/Reject buttons?**
You can't approve transfers/adjustments you submitted yourself. The submitter and approver must be different users. Switch users with the topbar User Switcher to the named approver.

**My cycle count shows Variance for items I didn't expect.**
Two common causes:
1. A stock movement (in/out/applied transfer/applied adjustment) happened on the item between the schedule time and now. The session displays variance as `actualQty - currentBookQty` — so even if you counted what was on the shelf at scheduling, today's book may differ.
2. Counts are entered by user; double-check the actual quantity on the line.

**I cleared the count input and now it shows 0 — did I commit a count of zero?**
No. Clearing the input does **not** commit. The count stays at its previous value (or remains uncounted if it had never been recorded). Only typing a number and pressing Tab/Enter or clicking outside commits the value.

**How do I un-count a line?**
You can't directly. Once a line has an `actualQty`, the only way to remove it is to enter a new value. There's no "I made a mistake, please mark this line uncounted" UX yet.

**What happens to pending transfers if I delete a referenced item?**
The mock API doesn't currently allow deleting items that have non-rejected movement history. If a real backend allows it, the audit trail will retain the transfer record but display the deleted item's name as a missing reference.

**Where can I see all movements (regardless of type)?**
The legacy `/module/inventory/movements` route still works — it's just hidden from the sidebar. You can navigate to it directly. Otherwise the System Logs page (Administration group) shows the full audit trail filtered to Inventory.

**How do I reset the demo data?**
Refresh the page. The mock data lives in JS module state — every full page reload restores the original seed. (Settings persist across reloads via `localStorage`; clear that key to reset settings.)

**How do I get back to the module selector?**
Topbar → **Modules** link (top-left). Or click your avatar → **Switch module**.

---

## Where to look in the codebase

For developers extending the Inventory module:

- **Pages** — `src/features/inventory/pages/`
- **API (mock-backed)** — `src/features/inventory/api/`
  - `inventory-api.ts` — items + movements (addMovement, approveMovement, rejectMovement)
  - `cycle-count-api.ts` — session lifecycle (schedule, start, recordCount, finalize, cancel)
- **Types** — `src/features/inventory/types.ts`
- **Mock data** — `src/features/inventory/data/mock-inventory.ts`
- **Hooks** — `src/features/inventory/hooks/`
- **Stores** — `src/features/inventory/store/`
  - `inventory-settings-store.ts` — settings (Zustand + localStorage)
  - `inventory-reports-store.ts` — generated reports history
- **Stock health helper** — `src/features/inventory/lib/stock-health.ts`
- **Sidebar / nav config** — `src/config/modules.ts` (look for `key: 'inventory'`)
- **Tests** — `src/features/inventory/inventory-api.test.ts`, `src/features/inventory/cycle-count-api.test.ts`
