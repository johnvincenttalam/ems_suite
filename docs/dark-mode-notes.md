# Dark Mode — Patterns, Common Bugs, and Fixes

A cheat sheet for any Tailwind admin template that uses **CSS-class-targeted dark mode** (i.e. a `.dark` class on `<html>` and rules like `.dark .bg-zinc-100 { ... }`).

> **The single root cause behind almost every dark-mode bug in this style of theming:** *literal-class overrides don't cascade to Tailwind's alpha modifiers or its `divide-*` utility.* This file documents every variant of that bug and the exact fixes.

---

## Why this happens

When you write a dark-mode rule like:

```css
.dark .bg-zinc-100 { background-color: #27272a !important; }
```

…it only matches elements with the literal class `bg-zinc-100`. Tailwind generates **alpha modifiers** as their own classes:

- `bg-zinc-100/40` → class is `bg-zinc-100\/40` (escaped `/` for the literal `/`)
- `bg-zinc-100/60` → class is `bg-zinc-100\/60`
- …etc.

These don't match `.dark .bg-zinc-100`. So in dark mode they keep their light-mode color (a near-white tint) and you get washed-out gray panels on dark backgrounds.

The same trap exists for `border-*/{40,60,80}` and for the `divide-*` family (which uses a different selector entirely — `> :not([hidden]) ~ :not([hidden])`).

---

## Bug 1 — Alpha-variant background tints

**Symptoms (what to look for in dark mode):**
- Detail panels in expandable rows render as light gray on the dark page (washed out).
- Metric / KPI tiles with `bg-emerald-50/40`, `bg-amber-50/40`, `bg-red-50/40` look identical (all washed gray) instead of tinted.
- Filter chip / tab inactive states look like bright white pills.

**Common offenders:**
```
bg-zinc-50/40       expand-row detail panels
bg-zinc-200/60      Tabs inactive count badges, FilterChips backgrounds
bg-emerald-50/40    "pass" metric tiles
bg-emerald-50/60    success summary tiles
bg-amber-50/40      "warn" metric tiles
bg-amber-50/60      pending summary tiles
bg-red-50/40        "fail" metric tiles
bg-red-50/60        danger summary tiles
bg-blue-50/40       selected-row highlight
bg-blue-50/60       in-progress tiles
bg-violet-50/40     accent tiles
bg-violet-50/60     accent summary tiles
```

**Fix — add to your dark-mode CSS block:**

```css
/* Alpha-variant tints — Tailwind generates these as standalone classes
   that the dark overrides for the base class (e.g. .bg-emerald-50) don't catch. */
.dark .bg-zinc-50\/40  { background-color: rgba(39, 39, 42, 0.4) !important; }
.dark .bg-zinc-200\/60 { background-color: rgba(63, 63, 70, 0.6) !important; }

.dark .bg-emerald-50\/40, .dark .bg-emerald-50\/60 { background-color: rgba(16, 185, 129, 0.10) !important; }
.dark .bg-amber-50\/40,   .dark .bg-amber-50\/60   { background-color: rgba(245, 158, 11, 0.10) !important; }
.dark .bg-red-50\/40,     .dark .bg-red-50\/60     { background-color: rgba(239, 68, 68, 0.10)  !important; }
.dark .bg-blue-50\/40,    .dark .bg-blue-50\/60    { background-color: rgba(59, 130, 246, 0.10) !important; }
.dark .bg-violet-50\/40,  .dark .bg-violet-50\/60  { background-color: rgba(139, 92, 246, 0.10) !important; }
```

The `\/` is required to escape the slash in the class selector. Without it the rule won't match.

---

## Bug 2 — Tinted-100 borders on tiles

**Symptoms:**
- Tile borders like `border-emerald-100`, `border-amber-100`, `border-blue-100` remain bright pastel in dark mode (they're meant to be subtle).

**Fix:**

```css
.dark .border-emerald-100 { border-color: rgba(16, 185, 129, 0.20) !important; }
.dark .border-amber-100   { border-color: rgba(245, 158, 11, 0.20) !important; }
.dark .border-blue-100    { border-color: rgba(59, 130, 246, 0.20) !important; }
```

Same pattern applies for `border-red-100` / `border-violet-100` if you use them.

---

## Bug 3 — Border alpha variants

**Symptoms:**
- Row dividers in tables / expand-row panels render as **near-white solid lines** in dark mode — too thick and too bright.

**Common offenders:**
```
border-zinc-100/80
border-zinc-100/70
border-zinc-100/40
border-zinc-200/60
```

**Fix — two paths:**

**A) Add explicit overrides:**
```css
.dark .border-zinc-100\/60 { border-color: rgba(39, 39, 42, 0.6) !important; }
.dark .border-zinc-100\/80 { border-color: rgba(39, 39, 42, 0.8) !important; }
.dark .border-zinc-200\/60 { border-color: rgba(63, 63, 70, 0.6) !important; }
```

**B) Use the unaliased class** (`border-zinc-100`, `border-zinc-200`) — these are typically already covered by the base dark override. Pick a single divider weight convention across the codebase (e.g. `border-zinc-100/60` for table rows, `border-zinc-200` for footers) and stick to it.

---

## Bug 4 — `divide-y divide-*` doesn't dark-mode

**Symptoms:**
- A `<ul>` or `<table>` styled with `divide-y divide-zinc-100` shows near-white horizontal lines in dark mode while the same color works fine when applied via `border-zinc-100`.

**Cause:** Tailwind's `divide-zinc-100` doesn't add a `.border-zinc-100` class to children — it adds a CSS rule using a sibling selector:

```css
.divide-zinc-100 > :not([hidden]) ~ :not([hidden]) { border-color: rgb(244 244 245); }
```

So `.dark .border-zinc-100 { ... }` never matches.

**Fix:** Replace `divide-y divide-zinc-100` with explicit per-row borders:

```tsx
{/* Before */}
<ul className="divide-y divide-zinc-100">
  {items.map(i => <li>...</li>)}
</ul>

{/* After */}
<ul>
  {items.map(i => <li className="border-t border-zinc-100/60 first:border-t-0">...</li>)}
</ul>
```

This uses `border-zinc-100/60` (or `border-zinc-100`) which **does** get the dark-mode override.

---

## Bug 5 — `bg-zinc-900` on non-button elements

**Symptoms:**
- Active count badges, hand-rolled avatar circles, or any `<span>`/`<div>` with `bg-zinc-900` render as a black circle on a black surface in dark mode — invisible.

**Cause:** A common dark-mode override targets only buttons:

```css
.dark button.bg-zinc-900,
.dark a.bg-zinc-900,
.dark [type="submit"].bg-zinc-900 { background-color: #fafafa !important; color: #09090b !important; }
```

A `<span>` or `<div>` with `bg-zinc-900` keeps the literal `#18181b` color in dark mode — same as the body background, so the element disappears.

**Fix — pick the right path for the element:**

**A)** If it's a count badge / pill on a span, broaden the override:
```css
.dark span.bg-zinc-900 {
  background-color: #fafafa !important;
  color: #09090b !important;
}
```

**B)** If it's an avatar / brand-colored element, **use accent tokens** instead of literal `bg-zinc-900`:
```tsx
{/* Before */}
<div className="rounded-full bg-zinc-900">
  <span className="text-white">AU</span>
</div>

{/* After */}
<div className="rounded-full bg-accent">
  <span className="text-accent-fg">AU</span>
</div>
```

Define accent tokens in your `@theme` block so they auto-flip:
```css
.accent-zinc          { --accent-500: #18181b; --accent-fg: #ffffff; }
.dark.accent-zinc     { --accent-500: #fafafa; --accent-fg: #09090b; }
```

The accent tokens give you free brand-color customization (indigo / emerald / rose presets) and the dark-mode flip is built in.

---

## Bug 6 — Map / chart tiles look wrong in dark mode

**Symptom:** A real map (Leaflet/Mapbox) or chart with light tiles looks jarring inside a dark UI.

**Don't auto-dark the map.** Maps are *data surfaces*, not chrome. Dark map tiles trade readability for aesthetic — roads, place names, and stale markers all lose contrast. Linear, Datadog, and most fleet/logistics dispatch software keep light maps inside dark UIs intentionally.

**If you must support both:**
- Detect the active theme (`useThemeStore().theme === 'dark'`)
- Switch the tile layer URL: light tile (e.g. CartoDB Voyager) ↔ dark tile (e.g. CartoDB Dark Matter)
- Re-mount the `<TileLayer>` with `key={theme}` so Leaflet refetches

---

## Bug 7 — Recharts grid lines and labels stay light

**Symptoms (in dark mode):**
- Chart axis lines and grid render as **near-white** strokes — washed out and overpowering against the dark surface.
- Axis tick labels stay light gray on a dark background but with low contrast.
- The default tooltip is white-on-white when you hover a series.

**Cause:** Recharts renders SVG with **inline presentation attributes** (e.g. `stroke="#e4e4e7"`, `fill="#71717a"`). These come through as `style="stroke: …"` on the DOM — Tailwind classes can't reach them, and a CSS rule without `!important` loses to the inline style.

**Fix — target Recharts' stable class names with `!important`:**

```css
/* Recharts uses inline SVG presentation attributes (stroke, fill) on grid
   lines and tick labels which CSS without !important won't reach for
   style="" attribute values. !important on a class selector wins, and
   these recharts class names are stable across versions. */
.dark .recharts-cartesian-grid line       { stroke: #27272a !important; }
.dark .recharts-cartesian-axis-tick-value { fill:   #71717a !important; }
.dark .recharts-text                      { fill:   #a1a1aa !important; }
.dark .recharts-default-tooltip {
  background-color: #18181b !important;
  border-color:     #3f3f46 !important;
  color:            #e4e4e7 !important;
}
```

These four selectors fix every chart in the codebase at once — you don't have to touch individual `<LineChart>` / `<BarChart>` / `<PieChart>` instances.

**Bigger principle:** any SVG-based component that renders inline color attributes (Recharts, react-leaflet markers, hand-rolled SVGs) needs CSS overrides via stable class names, not Tailwind classes on the wrappers. Same trick applies to your own SVG pies / donuts — render them with `stroke="currentColor"` / `fill="currentColor"` and apply `text-zinc-…` on the parent so the color flows through `currentColor` and inherits the dark override naturally:

```tsx
{/* ❌ Inline color — won't dark-mode */}
<circle stroke="#e4e4e7" />

{/* ✅ currentColor — inherits text-* class which has a dark override */}
<circle stroke="currentColor" className="text-zinc-200" />
```

---

## Bug 8 — Surfaces that should stay white in BOTH modes

**Symptom:** A signature canvas, rendered document page, or any "ink on paper" surface goes dark in dark mode. Dark-ink content (signature strokes, PDF glyphs) becomes invisible against the dark background.

**Why this isn't just a regular surface:** these are **substrates**, not UI chrome. The content is authored in dark ink against a white assumption — a signature drawn at `#18181b` ink on a `#ffffff` paper canvas is unreadable when the paper goes to `#18181b`. Auto-flipping every white surface for "dark mode parity" breaks this.

**The trap:** if you write the surface as `bg-white`, your dark override (`.dark .bg-white { background: #18181b !important }`) catches it and inverts it — but you don't want that here.

**Fix — semantic class + remove `bg-white`:**

```css
/* index.css — define a semantic class for "always-paper" surfaces */
.surface-paper { background-color: #ffffff !important; }
```

```tsx
{/* ❌ Before — dark mode override catches this and inverts */}
<div className="bg-white border border-zinc-200 …">
  <SignatureCanvas penColor="#18181b" … />
</div>

{/* ✅ After — surface-paper is unique to your CSS, not in any dark override */}
<div className="surface-paper border border-zinc-200 …">
  <SignatureCanvas penColor="#18181b" … />
</div>
```

**When to use `.surface-paper`:**
- Signature canvases (drawing surface for `react-signature-canvas` etc.)
- Rendered PDF / document pages (`react-pdf` page wrappers)
- Signed-document image previews (the user expects to see the dark signature)
- Print-preview surfaces

**Don't use it for:**
- Cards, modals, panels — those are UI chrome and should flip with theme

The trick is that `.surface-paper` is your own custom class — no dark override touches it, so it stays white regardless of mode. `!important` defends against any future broad rule that might accidentally hit it.

---

## Audit checklist for a new template

Run this over any admin template using class-targeted dark mode:

- [ ] `grep -rE 'bg-(zinc|emerald|amber|red|blue|violet|orange|cyan|purple|indigo)-(50|100|200)\\?\/(20|30|40|50|60|80)' src/` — list every alpha-bg variant and confirm each has a dark override.
- [ ] `grep -rE 'border-(zinc|emerald|amber|red|blue)-(100|200)\\?\/(40|60|80)' src/` — same for border alphas.
- [ ] `grep -r 'divide-y\|divide-' src/` — replace any `divide-{color}` usages with per-child `border-t border-{color} first:border-t-0`.
- [ ] `grep -rE '(span|div).*bg-zinc-900' src/` — verify any non-button `bg-zinc-900` uses accent tokens or has a span/div override.
- [ ] `grep -rl 'recharts\|<LineChart\|<BarChart\|<PieChart' src/` — if you find Recharts, drop in the `.recharts-*` overrides from the CSS block.
- [ ] `grep -rE 'fill="#|stroke="#' src/` — any custom SVG with hex literals breaks dark mode. Switch to `fill="currentColor"` / `stroke="currentColor"` and apply `text-zinc-*` on the wrapper.
- [ ] `grep -r 'SignatureCanvas\|<Page \|react-pdf\|paper.*bg-white' src/` — find any "ink on paper" surfaces and migrate them to `.surface-paper`.
- [ ] Toggle dark mode on **every page** after building. Anything that looks washed-out gray (instead of tinted) is missing an alpha override. Anything dark-on-dark (like a signature you can't see) is a paper-surface issue.
- [ ] Specifically check expandable rows, metric tiles, KPI cards, filter chips, tab badges, avatar circles, modal backgrounds, **chart axes/grids/tooltips**, **signature canvases**, **rendered document pages**.
- [ ] Verify `border-t border-zinc-100/60` (or your chosen unified weight) is the convention across all tables.

---

## Drop-in CSS block

Copy this block into your `index.css` (or wherever your dark-mode rules live), under your existing `.dark` overrides. It covers every issue above:

```css
/* === Alpha-variant tints — Tailwind generates these as standalone classes; the
   dark overrides for the base class (e.g. .bg-emerald-50) don't catch them. === */

/* Backgrounds */
.dark .bg-zinc-50\/40   { background-color: rgba(39, 39, 42, 0.4)  !important; }
.dark .bg-zinc-200\/60  { background-color: rgba(63, 63, 70, 0.6)  !important; }

.dark .bg-emerald-50\/40, .dark .bg-emerald-50\/60 { background-color: rgba(16, 185, 129, 0.10) !important; }
.dark .bg-amber-50\/40,   .dark .bg-amber-50\/60   { background-color: rgba(245, 158, 11, 0.10) !important; }
.dark .bg-red-50\/40,     .dark .bg-red-50\/60     { background-color: rgba(239, 68, 68, 0.10)  !important; }
.dark .bg-blue-50\/40,    .dark .bg-blue-50\/60    { background-color: rgba(59, 130, 246, 0.10) !important; }
.dark .bg-violet-50\/40,  .dark .bg-violet-50\/60  { background-color: rgba(139, 92, 246, 0.10) !important; }

/* Borders — alpha variants */
.dark .border-zinc-100\/60 { border-color: rgba(39, 39, 42, 0.6) !important; }
.dark .border-zinc-100\/80 { border-color: rgba(39, 39, 42, 0.8) !important; }
.dark .border-zinc-200\/60 { border-color: rgba(63, 63, 70, 0.6) !important; }

/* Borders — light pastel variants on tinted tiles */
.dark .border-emerald-100 { border-color: rgba(16, 185, 129, 0.20) !important; }
.dark .border-amber-100   { border-color: rgba(245, 158, 11, 0.20) !important; }
.dark .border-blue-100    { border-color: rgba(59, 130, 246, 0.20) !important; }
.dark .border-red-100     { border-color: rgba(239, 68, 68, 0.20)  !important; }
.dark .border-violet-100  { border-color: rgba(139, 92, 246, 0.20) !important; }

/* === Pill-style count badges — span.bg-zinc-900 isn't covered by the
   button-only rule; in dark mode the literal black blends into the surface,
   so invert it. === */
.dark span.bg-zinc-900 {
  background-color: #fafafa !important;
  color: #09090b !important;
}

/* === divide-* utilities — the .border-* overrides above don't reach the
   sibling-selector rule that divide-y emits. Mirror them. === */
.dark .divide-zinc-100 > :not([hidden]) ~ :not([hidden])      { border-color: #27272a !important; }
.dark .divide-zinc-200 > :not([hidden]) ~ :not([hidden])      { border-color: #3f3f46 !important; }
.dark .divide-zinc-100\/60 > :not([hidden]) ~ :not([hidden])  { border-color: rgba(39, 39, 42, 0.6) !important; }
.dark .divide-zinc-200\/60 > :not([hidden]) ~ :not([hidden])  { border-color: rgba(63, 63, 70, 0.6) !important; }

/* === Recharts — inline SVG presentation attributes that Tailwind classes
   can't reach. !important on stable Recharts class names wins. === */
.dark .recharts-cartesian-grid line       { stroke: #27272a !important; }
.dark .recharts-cartesian-axis-tick-value { fill:   #71717a !important; }
.dark .recharts-text                      { fill:   #a1a1aa !important; }
.dark .recharts-default-tooltip {
  background-color: #18181b !important;
  border-color:     #3f3f46 !important;
  color:            #e4e4e7 !important;
}

/* === "Always-paper" surfaces — signature canvases, rendered document
   pages, anything where dark ink needs a white substrate. Stays white in
   both light and dark mode. Apply via className="surface-paper" instead
   of bg-white (which gets dark-flipped). === */
.surface-paper { background-color: #ffffff !important; }
```

---

## Underlying lessons

1. **Alpha modifiers and `divide-*` are second-class citizens of class-targeted dark mode.** If you can choose, prefer overriding via CSS variables (`var(--surface-tint)`) instead of literal class overrides — variables flow through alpha modifiers automatically.
2. **Hand-rolled brand elements (avatars, badges) should always use accent tokens**, never `bg-zinc-900` directly. Accent tokens flip with theme; literal classes don't.
3. **Maps and charts are data surfaces, not chrome.** Don't auto-dark them just for visual cohesion — readability comes first.
4. **SVG inline color attributes need `!important` on a stable class selector.** Tailwind `dark:` variants can't reach `style=""`-attribute values. Recharts is the canonical example, but the same rule applies to your own custom SVGs — render them with `currentColor` whenever possible so `text-*` classes (which DO have dark overrides) flow through naturally.
5. **Identify "always-paper" surfaces upfront.** Signature canvases, rendered document pages, and anything else where dark ink needs a white substrate — these aren't UI chrome. Use a semantic class (`.surface-paper`) instead of `bg-white`, so dark-mode overrides skip them.
6. **Build an audit checklist and run it after every theming change.** Every new tinted variant you introduce is another class that needs a matching dark override unless you use variables.

---

## A note on the better long-term fix

The issues above all stem from using **literal class overrides for dark mode**. If you're starting a new template, consider switching to **CSS-variable-based theming** instead:

```css
:root          { --surface: #ffffff; --surface-tint: #f4f4f5; }
.dark          { --surface: #09090b; --surface-tint: #27272a; }

@theme {
  --color-surface: var(--surface);
  --color-surface-tint: var(--surface-tint);
}
```

Then use `bg-surface-tint` everywhere. Alpha modifiers still work (`bg-surface-tint/40`), `divide-surface-tint` works, and there's exactly **one** variable to flip per theme. No per-class overrides to maintain.

The cost: every existing component using `bg-zinc-100`, `bg-zinc-50`, etc., needs to migrate. For a fresh template that's nothing; for an established one, it's a sweep.
