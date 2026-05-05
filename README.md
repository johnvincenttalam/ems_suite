# EMS — Enterprise Management System

A modular operations platform for managing **assets, inventory, procurement, maintenance, fleet, tracking, documents, checklists, and quality reports** in one place. Built on top of a feature-first React admin scaffold.

> **Three docs, three audiences:**
> - **`README.md`** (this file) — what the system is, how to run it, where things live.
> - **[`EMS.md`](./EMS.md)** — the original product spec (entities, workflows, UI/UX standards).
> - **[`CLAUDE.md`](./CLAUDE.md)** — codebase conventions for AI assistants and contributors.

---

## What's in the box

| # | Module | Route | What it does |
|-|-|-|-|
| 1 | **MIS Dashboard** | `/admin` | Executive overview — KPI tiles, "needs attention" panel, charts pulling from every module |
| 2 | **Inventory** | `/admin/inventory` | Items · Stock movements (in / out / transfer / adjustment) · Cycle count |
| 3 | **Assets** | `/admin/assets` | Registry · Assignment to users · Transfer · Disposal — full lifecycle |
| 4 | **Procurement** | `/admin/procurement` | Requests with line items · Approval queue (closes the loop into Inventory) |
| 5 | **Maintenance** | `/admin/maintenance` | Work orders · Schedule (Overdue / Today / Week / Later) · Technician workload |
| 6 | **Checklists** | `/admin/checklists` | Templates · Assignments · Per-item pass/fail results |
| 7 | **Documents** | `/admin/documents` | Upload · Multi-step approval workflow · Digital signatures · Archive |
| 8 | **Fleet** | `/admin/fleet` | Vehicles · Trips · Fuel logs · Vehicle maintenance (joined from Maintenance) |
| 9 | **Tracking** | `/admin/tracking` | Live map (Leaflet + OSM) · GPS · Tags (RFID/QR) · Scan history |
| 10 | **Quality (QMS)** | `/admin/qms` | Monthly reports · Templates · Printable signed reports |
| 11 | **Reports & Analytics** | `/admin/reports` | Cross-module aggregations · Trends · Drill-down · Bulk CSV import / export |
| 12 | **Administration** | `/admin/users`, `/roles`, `/departments`, `/warehouses`, `/categories`, `/uom`, `/suppliers`, `/audit-log` | Master data + audit trail |

Every module is **lazy-loaded** — its chunk only ships when the user navigates to its route. The 12-module app weighs ~178 KB gzipped on first paint, with each module's chunk averaging ~6 KB gzipped.

---

## Quick start

```bash
npm install
cp .env.example .env.local   # optional — every var has a default
npm run dev
```

Open http://localhost:5173 and sign in:

```
Email:    admin@example.com
Password: demo123
```

The app ships with mock data covering every module — you can click around the whole EMS without a backend.

---

## Stack

- **React 19** + **TypeScript 5.9 (strict)** + **Vite 8**
- **Tailwind CSS v4** — theme tokens via CSS variables (`@theme` block in `src/index.css`)
- **React Router 7** — lazy routes, error boundaries per route
- **TanStack Query** — data fetching + cache; **TanStack Table** for tables
- **Zustand** — auth, theme, UI state
- **React Hook Form** + **Zod** — forms + validation
- **Recharts** — dashboards, trends, drill-down charts
- **Leaflet** + **react-leaflet** — real interactive map (CartoDB Voyager tiles, free)
- **Framer Motion** — page transitions
- **Sonner** — toasts
- **date-fns** — time math
- **Vitest** + **@testing-library/react** — tests

---

## Architecture

```
src/
├── app/            Composition root — App.tsx, providers.tsx, routes.tsx
├── config/         ★ Single source of truth (app, navigation, features, theme, locale)
├── features/       ★ Self-contained feature folders — drop in / pull out
│   ├── dashboard/        MIS executive view
│   ├── inventory/        items + movements
│   ├── assets/           registry + assignments
│   ├── procurement/      requests + approvals
│   ├── maintenance/      work orders + schedule + technicians
│   ├── checklists/       templates + assignments + results
│   ├── documents/        upload + workflow + archive
│   ├── fleet/            vehicles + trips + fuel + maintenance
│   ├── tracking/         live map + tags + scans
│   ├── qms/              reports + templates + printable
│   ├── reports/          cross-module analytics
│   ├── audit-log/        read-only event log + lib/audit-emitter.ts
│   ├── users/, roles/, departments/, warehouses/,
│   ├── categories/, uom/, suppliers/
│   └── auth/             mock-auth-adapter, ProtectedRoute, login page
├── shared/
│   ├── ui/               Button, Card, Modal, Input, StatusBadge, ...
│   ├── layout/           AdminLayout, Sidebar (grouped), Topbar
│   ├── lib/              http — typed fetch with auth injection
│   ├── stores/           themeStore
│   ├── utils/            cn, format, export-csv
│   └── env.ts
└── index.css             Tailwind tokens + light/dark + accent presets
```

**Path alias:** `@/*` → `./src/*`. Always use it; never reach across feature folders with `../../`.

### Each feature follows the same shape

```
features/<name>/
├── pages/          Route components
├── components/     Feature-specific components (not shared across features)
├── api/            <feature>-api.ts — current impl returns mock data with delay()
├── data/           mock-<feature>.ts — seed arrays
├── hooks/          use-<feature>.ts — TanStack Query wrappers
├── types.ts        Domain types
└── index.ts        ★ Barrel — public surface (named exports only)
```

This means copying a single folder into another project brings the pages, data, types, and barrel exports with it. See `CLAUDE.md` § "Adding a new feature" for the full recipe.

---

## Cross-module workflows

The EMS spec § 4 describes flows that cross module boundaries. Status:

| Workflow | Wired? | Notes |
|-|-|-|
| **Procurement → Inventory stock-in** | ✅ | Approving a request creates a Stock In movement for every line item, updates the bound items' quantities, and writes audit entries. See `features/procurement/api/procurement-api.ts` → `approve()`. |
| **Document workflow (Upload → Sign → Approve / Reject → Archive)** | ✅ | `documentsApi.upload`, `sign`, `reject`, `archive` are real mutations against `mockDocuments`. Sign is sequential — only the next-expected approver can sign; the final signature flips the doc to `approved`. Each step writes an audit entry. |
| **Audit log auto-write** | ⚠ partial | `recordAudit()` fires from every mutation in the modules with real handlers (inventory, procurement, documents, and admin master-data: warehouses/users/uom/suppliers/departments/categories). Modules without mutation handlers yet (assets, checklists, fleet, maintenance, qms, tracking) will hook in once their handlers are added. |
| **Asset lifecycle (Create → Assign → Maintain → Transfer → Dispose)** | 🟡 UI only | Each step has its own modal but doesn't yet auto-emit cross-module events. |
| **Maintenance → Checklist** | 🟡 UI only | `WorkOrder.checklistId` field is in the schema but no UI yet attaches a template / launches an assignment. |
| **Tracking → Dashboard** | ✅ | Live map and entity list are wired; tracking events render on the MIS dashboard's Quick Links. |

When a backend is wired, each handler already has the right shape — swap the body of `*-api.ts` from mock array mutation to `http.post(...)` and React Query's invalidation pattern keeps the UI consistent.

---

## Mock-first → real backend

Every feature has an `api/<feature>-api.ts` like this:

```ts
import { mockX } from '@/features/<feature>/data/mock-<feature>'
// import { http } from '@/shared/lib/http'

export const xApi = {
  list: async (): Promise<X[]> => {
    await delay()
    return mockX                                    // ← mock today
    // return http.get<X[]>('/api/x')               // ← real tomorrow
  },
}
```

To wire a real backend for one module:
1. Uncomment the `http` import.
2. Replace mock returns with `http.get` / `http.post` / `http.patch` / `http.del`.
3. Set `VITE_API_URL` in `.env.local` so the http client targets your server.

For real auth, implement `AuthAdapter` (in `features/auth/adapters/auth-adapter.ts`) and change the single export in `features/auth/adapters/index.ts` — `ProtectedRoute`, the store, and the http client all pick up the new implementation automatically.

---

## Configuration

Everything customer-customizable lives in **`src/config/`**:

| File | Owns |
|-|-|
| `app.ts` | App name, logo (Lucide icon), login copy, demo credentials |
| `navigation.ts` | Sidebar groups + items (Operations / Administration / Account) |
| `features.ts` | Feature flags — filter sidebar **and** routes |
| `feature-imports.ts` | Central lazy-import map (shared by routes + sidebar prefetch) |
| `theme.ts` | Accent preset names (zinc / indigo / emerald / rose) |
| `locale.ts` | Currency, locale, date format defaults |

Disabling a feature in `features.ts` removes it from the sidebar and skips its route registration; its lazy chunk never loads.

### Environment variables

All `VITE_`-prefixed; defaults make the app run with no `.env.local`:

| Variable | Default | Purpose |
|-|-|-|
| `VITE_APP_NAME` | `EMS` | Sidebar logo text + browser tab title |
| `VITE_API_URL` | `""` | Base URL for the http client |
| `VITE_DEFAULT_ACCENT` | `zinc` | `zinc` / `indigo` / `emerald` / `rose` |
| `VITE_DEFAULT_CURRENCY` | `USD` | ISO 4217 |
| `VITE_DEFAULT_LOCALE` | `en-US` | BCP 47 |

---

## Theming & dark mode

- Four accent presets, four CSS variable bundles — `bg-accent`, `bg-accent-hover`, `text-accent-fg` are the only utilities you should use for primary actions
- Light/dark via a `.dark` class on `<html>`; toggled in the topbar, persisted in localStorage
- Each accent has distinct light/dark values so every combination stays readable
- Status colours follow the EMS spec § 5: `pending` = amber, `approved` / `signed` = emerald, `rejected` / `failed` = red, `ongoing` = blue

If you add new tinted utility variants (e.g. `bg-emerald-50/40`), add a matching dark-mode override in `src/index.css`. Tailwind's alpha modifiers don't inherit from the base class's dark override.

---

## Tests & build

```bash
npm test          # one-shot
npm run test:watch
npm run test:ui
npm run build     # tsc -b + Vite production build
```

**131 tests** across 20 files. Tests focus on data integrity and FK relationships — every cross-feature reference (e.g. asset → category type, line item → inventory item, work order → asset) is verified.

Co-locate tests next to the file under test: `foo.ts` ↔ `foo.test.ts`.

---

## Adding a new feature

1. Create `src/features/<name>/` with at least `pages/<name>-page.tsx` and `index.ts`.
2. Barrel: `export { NamePage } from './pages/<name>-page'`.
3. Register the lazy import in `src/config/feature-imports.ts`.
4. Add the route in `src/app/routes.tsx`.
5. Add a nav entry in `src/config/navigation.ts` (under the right group).
6. Add the key to `src/config/features.ts`.
7. Add at least one sample test.
8. `npm test && npm run build`.

No global state to wire, no cross-feature edits.

---

## Removing a feature

1. Delete `src/features/<name>/`.
2. Remove its import from `src/config/feature-imports.ts`.
3. Remove its nav entry from `src/config/navigation.ts`.
4. Remove its key from `src/config/features.ts`.
5. Remove its route + `lazy()` declaration from `src/app/routes.tsx`.

About 5 minutes per feature.

---

## Roadmap / known gaps

What's deliberately not built (yet) — drop in when you need them:

- **Real backend** — every `*-api.ts` is a mock. Pick a backend, wire one feature, repeat.
- **Real auth** — currently mock. The adapter pattern lets you swap one file.
- **Permissions enforcement** — the Roles UI is beautiful but no `usePermission(key)` hook exists yet to gate routes/buttons.
- **Maintenance ↔ Checklist hand-off** — `WorkOrder.checklistId` is in the schema, no UI yet attaches it.
- **Global command palette** (Cmd+K)
- **Live notifications** wired to data (NotificationCenter exists but shows mock)
- **PDF export** — currently CSV + `window.print()`. Add jsPDF when ready.
- **i18n** — every string is English.
- **Mobile responsiveness audit** — sidebar is mobile-aware; tables and the map need verification.
- **Persistence** — mock state lives in module-level arrays; a refresh resets to seed data.

See § "What's still left" notes inside each module's docs (in `CLAUDE.md` and feature READMEs) for the per-feature follow-ups.

---

## Scripts

```bash
npm run dev          # Dev server (Vite) at http://localhost:5173
npm run build        # tsc -b + Vite production build
npm run preview      # Preview the production build
npm test             # Vitest one-shot
npm run test:watch
npm run test:ui      # Vitest UI
npm run lint         # ESLint
```

---

## Demo account

```
Email:    admin@example.com
Password: demo123
```

The mock auth adapter accepts any email present in `mockUsers` with any password. To restrict, edit `features/auth/adapters/mock-auth-adapter.ts`.

---

## Attribution

- Map tiles: **CARTO Voyager** raster tiles, free under CC BY 3.0; data © OpenStreetMap contributors (ODbL). For high-volume production traffic, switch to Stadia Maps, MapTiler, or self-host.
- Icons: **Lucide**.
- Inter typeface from Google Fonts.

---

## License

Use freely for any project. See `LICENSE` if/when added.
