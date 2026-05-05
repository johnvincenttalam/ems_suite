# Claude context for this repo

This is the **Enterprise Management System (EMS)** template — a reusable, **module-first** admin platform (React 19 + Vite 8 + TypeScript + Tailwind v4) designed to host the 12 EMS modules behind a single integrated UI. It's also a fork-friendly base for any module-oriented enterprise app.

Read this file before making changes — it captures conventions that aren't obvious from the code and things that have already been tried and rejected.

## Stack — non-negotiable

- React 19, Vite 8, TypeScript 5.9 (strict, `erasableSyntaxOnly` on — no parameter properties in classes)
- Tailwind CSS v4 (`@theme` block in `src/index.css` defines tokens; CSS variables drive the accent theme)
- React Router 7, TanStack Query + Table, Zustand, React Hook Form + Zod, Framer Motion, Sonner, Lucide
- Vitest + @testing-library/react for tests (jsdom, `globals: true`)

## Module-first architecture

The app does NOT have a single shared admin shell. Instead:

1. **`/`** — module selector (no auth). Cards grid; clicking goes to per-module login (or directly into the module if already authenticated).
2. **`/module/<key>/login`** — login scoped to a module. The module's name + icon appear on the branding panel.
3. **`/module/<key>/*`** — module workspace. Has its own sidebar (sourced from that module's `nav` in `config/modules.ts`), its own breadcrumbs, and a topbar with "Modules" / "Switch module" affordances back to `/`.
4. **Access denied** — if a logged-in user lacks access to the requested module, `ProtectedRoute` renders `AccessDeniedPage` instead of the children.

### Layout

```
src/
├── app/                # App.tsx, providers.tsx, routes.tsx
├── config/             # ★ Single source of truth for customization
│   ├── app.ts          # App name, logo, login copy, demo accounts
│   ├── modules.ts      # ★ The 12 modules — key, name, icon, nav, default route
│   ├── features.ts     # Feature flags (per page, not per module)
│   ├── feature-imports.ts  # Lazy-import map (one entry per FeatureKey)
│   ├── locale.ts       # Currency, locale, date format defaults
│   └── theme.ts        # Accent preset names + swatches
├── features/           # ★ Self-contained feature folders
│   ├── modules/        # The module-selector page
│   ├── auth/           # Login, ProtectedRoute, AccessDeniedPage, auth store
│   ├── <feature>/      # Domain features (inventory, documents, fleet, …)
│   └── ...
├── shared/             # Reusable UI + infra (ui, layout, hooks, lib, stores, utils, env.ts)
└── main.tsx
```

Path alias: `@/*` → `./src/*`. Always use it — never relative imports that climb out of a feature (`../../`).

### Feature folder convention

```
features/<name>/
├── pages/          # Route components
├── components/     # Feature-specific components (not shared across features)
├── api/            # API layer (usersApi, etc.)
├── data/           # Mock seeds (mockUsers, mockOrders)
├── hooks/          # Feature-specific React Query hooks
├── store/          # Feature-specific Zustand stores
├── lib/            # Pure helpers (e.g., features/auth/lib/access.ts)
├── types.ts        # Domain types
└── index.ts        # ★ Barrel — public surface of the feature
```

Other files import from `@/features/<name>` (the barrel), not internals. The one tolerated exception: `auth-store` imports `@/features/users/data/mock-users` directly to avoid a barrel cycle.

## Modules vs features

These are different layers:
- **Module** (`config/modules.ts`) — a top-level workspace from the EMS spec (e.g., Inventory, SDMS, Admin). Each has a key, icon, description, default landing route, and a list of nav items.
- **Feature** (`config/features.ts`) — a single page or sub-page (e.g., `inventory`, `warehouses`, `categories`). A module's `nav` references feature keys.

A module bundles 1+ features. Adding a page = a new feature; adding a top-level workspace = a new module. See recipes below.

### The 12 EMS modules (today)

| Key | Module | Owns features |
|-|-|-|
| `mis` | Management Information System | dashboard, activity |
| `sdms` | Smart Document Management | documents |
| `inventory` | Inventory | inventory, warehouses, categories, uom |
| `assets` | Asset Management | assets |
| `fleet` | Fleet Management | fleet |
| `tracking` | Tracking | tracking |
| `qms` | Quality Management | qms |
| `procurement` | Requisition & Procurement | procurement, suppliers |
| `reports` | Reports & Analytics | reports, charts |
| `maintenance` | Maintenance | maintenance |
| `checklist` | Checklist | checklists |
| `admin` | Administrator & User Mgmt | users, roles, departments, auditLog, settings |

The split lives in `config/modules.ts` — change there, not here.

## Module access (permission model)

`User.modules: ModuleKey[]` lists the modules a user can enter. The module-level check is module access in/out — there's no per-page granularity yet (a user with access to a module sees its full sidebar).

- **Helper:** `hasModuleAccess(user, moduleKey)` from `@/features/auth`
- **Gate:** `ProtectedRoute` accepts an optional `module` prop. When set, it renders `AccessDeniedPage` for authenticated-but-unauthorized users.
- **Selector UI:** logged-in users see locked cards (`Lock` icon, "No access" pill, dimmed) for modules they can't enter. Clicking shows a toast.
- **Empty state:** users with `modules: []` get a dedicated "no accessible modules" view with a sign-out action.

Demo accounts (all share `password: 'demo123'`):
- `admin@example.com` — all 12
- `operations@example.com` — MIS, Inventory, Assets, Fleet, Tracking, Maintenance, Checklist
- `documents@example.com` — MIS, SDMS, Reports

## Adapter pattern

Anywhere the template might be swapped for a real implementation, the boundary is a single-file adapter. The only one today is **auth**:

```
features/auth/adapters/
├── auth-adapter.ts          # interface
├── mock-auth-adapter.ts     # default (localStorage-backed)
└── index.ts                 # export authAdapter: AuthAdapter = mockAuthAdapter
```

**To wire real auth:** implement `AuthAdapter`, change the single export in `index.ts`. The auth store, `ProtectedRoute`, and `http.ts` pick it up automatically. The real adapter should populate `User.modules` based on whatever your backend returns.

Apply the same pattern for any other swappable layer (payments, storage, analytics…).

## HTTP client

`src/shared/lib/http.ts` — typed `fetch` wrapper.
- Prepends `VITE_API_URL`
- Injects `Authorization: Bearer <authAdapter.getToken()>` (pass `skipAuth: true` to opt out)
- Serializes JSON bodies, parses JSON responses
- Throws `HttpError` (class, fields: `status`, `statusText`, `body`) on non-2xx

Use it in feature API files: `http.get<T>('/path')`, `http.post<T>('/path', body)`, etc. The mock-based `features/*/api/*.ts` files each have a commented example of the HTTP version — uncomment and swap when going live.

## Theming

Accent colors are **CSS custom properties**, not hardcoded hex. Four presets defined in `src/index.css` under `@layer base`:

```css
.accent-zinc    { --accent-500: ...; --accent-600: ...; --accent-fg: ...; }
.dark.accent-zinc { ... }   /* dark-mode values of the same preset */
/* indigo / emerald / rose */
```

Tailwind utilities exposed: `bg-accent`, `bg-accent-hover`, `text-accent-fg`. Use these — don't introduce new hardcoded colors for primary actions.

Active preset is applied as a class on `<html>` by `shared/stores/theme-store.ts` and persisted in `localStorage`. Live-switchable under **Admin → Settings → Appearance**.

### Dark mode pattern (important)

The codebase uses **plain light-mode classes** (`bg-white`, `text-zinc-900`, `border-zinc-200/60`) and lets the overrides in `index.css` handle dark mode (`.dark .bg-white { #18181b !important }` etc.). **Don't add explicit `dark:` variants** in new pages — they collide with the override system, and Tailwind's alpha modifiers (`bg-white/80`) aren't caught by the overrides at all. Match the existing topbar/sidebar pattern.

## Routing

- Module selector + login pages are eager.
- Every `/module/<key>/*` page is `React.lazy()`'d via `featureImports`.
- Each lazy route is wrapped in `<ErrorBoundary>` (`shared/ui/error-boundary.tsx`) — a render error in one page won't blank the app.
- Routes are generated dynamically by mapping over `modules` — no manual per-feature `<Route>` declarations.
- The sidebar prefetches a feature's chunk on `onMouseEnter` / `onFocus` via `prefetchFeature(item.feature)`.
- Old `/admin/*` URLs redirect to `/` so legacy bookmarks don't 404.

## Tests

- Co-locate: `foo.ts` ↔ `foo.test.ts`, `foo.tsx` ↔ `foo.test.tsx`
- Run: `npm test` (one-shot), `npm run test:watch`, `npm run test:ui`
- Vitest globals are enabled (`describe`, `it`, `expect`, `vi` work without import); `@testing-library/jest-dom` matchers are extended globally via `src/test/setup.ts`
- React Router components need `<MemoryRouter>` in tests; Zustand stores need manual reset in `beforeEach` because they're module-level singletons

## Build & verification

- `npm run build` — always run before declaring work done. It's `tsc -b && vite build`, so type errors and bundle errors both surface.
- `npm test` — must pass
- For UI changes, run `npm run dev` and walk the user flow: `/` → pick module → login (`admin@example.com` / `demo123`) → confirm sidebar matches → "Modules" → pick a different one.
- The 500KB chunk warning on `index.js` is **cosmetic** — total eager payload is ~177 KB gzipped. Don't attempt to silence it by splitting vendor chunks; the current layout is intentional.

## Conventions / rules

1. **No comments explaining what the code does.** Only explain *why* when it's non-obvious. Don't add comments referencing past refactors, TODOs, or who-did-what.
2. **Don't invent fractional Tailwind classes** (`translate-x-5.5`, `w-1.5.5`). If you need precise offsets, use arbitrary values: `translate-x-[22px]`.
3. **Don't nest buttons inside buttons.** If an inner control needs to click, change the outer to `<div role="button">` with `tabIndex` + `onKeyDown`.
4. **Don't bypass the config layer.** If you're about to hardcode an app name, logo, nav item, currency, color, or module — stop and add it to `config/` instead.
5. **Never commit without running `npm run build` and `npm test`.**
6. **All barrel exports use named exports**, not default. `React.lazy()` wrappers convert to `{ default: ... }` in `feature-imports.ts`.
7. **When adding a lucide icon**, prefer one already imported in the same file over pulling a new one. The icon library is tree-shaken but per-file imports affect bundle granularity.
8. **Click-outside, async auth, and other shared behaviors have hooks/utilities** — check `shared/hooks/` and `shared/utils/` before re-implementing.
9. **Use plain light-mode Tailwind classes**, not `dark:` variants. The `index.css` overrides handle dark mode globally.

## Adding a feature to an existing module (recipe)

E.g., adding a "Stock Transfers" page to the Inventory module.

1. Create `src/features/transfers/` with `pages/transfers-page.tsx` and `index.ts` (barrel: `export { TransfersPage } from './pages/transfers-page'`).
2. Add the key to `src/config/features.ts` (`transfers: true`).
3. Register lazy import in `src/config/feature-imports.ts`:
   ```ts
   transfers: () => import('@/features/transfers'),
   ```
4. Add a page entry to `featurePages` in `src/app/routes.tsx`:
   ```ts
   transfers: lazy(() => featureImports.transfers().then((m: any) => ({ default: m.TransfersPage }))),
   ```
5. In `src/config/modules.ts`, find the `inventory` module's `nav` and add the item:
   ```ts
   { label: 'Transfers', path: 'transfers', icon: ArrowLeftRight, feature: 'transfers' }
   ```
6. Add at least one sample test.
7. `npm test && npm run build` to verify.

The route is auto-generated from the module's nav. No manual `<Route>` to add.

## Adding a new module (recipe)

E.g., adding a "Customer Relationship" module.

1. Decide which features it owns. Each must exist (or be added per the feature recipe).
2. In `src/config/modules.ts`, append a new `EmsModule`:
   ```ts
   {
     key: 'crm',
     name: 'Customer Relationship',
     shortName: 'CRM',
     description: 'Customers, contacts, and pipeline.',
     icon: Users,
     iconBg: 'bg-cyan-50',
     iconColor: 'text-cyan-600',
     defaultPath: '',
     nav: [{ items: [{ label: 'Customers', path: '', icon: Users, feature: 'customers' }] }],
   }
   ```
3. Add `'crm'` to the `ModuleKey` union in the same file.
4. Update `mockUsers` so the demo admin (and anyone who should access it) has `'crm'` in their `modules`.
5. `npm test && npm run build`.

The selector card, route, sidebar, login, and access-control all derive from the module entry — no other files need changes.

## Deleting a module from a fork

1. Remove the module entry from `src/config/modules.ts` (and the key from `ModuleKey`).
2. Remove the module key from any user's `modules` array in mock data.
3. If the module's features are no longer referenced anywhere, you can delete those `features/<name>/` folders too — see "Deleting a feature" below.

## Deleting a feature from a fork

1. Delete `src/features/<name>/`.
2. Remove its import from `src/config/feature-imports.ts`.
3. Remove its entry from `featurePages` in `src/app/routes.tsx`.
4. Remove the nav entry from any module in `src/config/modules.ts`.
5. Remove its key from `src/config/features.ts`.

## Known gaps (not bugs — deliberate scope)

- **No i18n** — all strings are English. Add when needed.
- **Mock auth + mock API** — real backends require adapter swaps (see above).
- **Per-action permissions** — `User.modules` is binary access. Read-only / write modes inside a module aren't modeled. Add when a real use case arises.
- **Per-route skeletons** — Suspense fallback is a plain spinner. Fine for now.

## Do NOT

- ...delete `config/` files thinking they're unused — they drive the whole template.
- ...add a top-level shell route or "global sidebar". Modules are isolated workspaces; mixing them defeats the design.
- ...hardcode `/module/<key>` paths when navigating — use `getModulePath(key, relativePath)` from `@/config/modules`.
- ...wire `fetch()` directly in feature API files. Use `http` from `shared/lib/http.ts`.
- ...import from `@/features/X` inside `@/features/X`'s own barrel (circular).
- ...add explicit `dark:` variants in components — use plain light-mode classes; `index.css` handles inversion.
- ...silence type errors with `@ts-ignore`. Fix the root cause.
