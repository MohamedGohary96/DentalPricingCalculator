# Responsiveness Plan — Dental Pricing Calculator

Plan to make the Vue 3 + Vite app fully responsive across mobile (≤480px), large mobile (481–767px), tablet portrait (768–1023px), tablet landscape (1024–1279px), and desktop (≥1280px). Bilingual EN/AR (RTL). No visual redesign — responsiveness pass only.

---

## 1. Breakpoint System

Five device classes → four breakpoint tokens. We design **mobile-first** and use **min-width** queries to layer up. Tailwind config and a CSS-var mirror so both `@media` and `var(--bp-*)` are usable.

| Token | Range | Tailwind alias | Mental model | Primary surfaces |
|---|---|---|---|---|
| `--bp-xs` | ≤480px | (default) | iPhone SE / mini portrait | Single column, drawer nav, bottom-sheet modals |
| `--bp-sm` | 481–767px | `sm:` | Large phone / phablet | Single column, slightly relaxed padding |
| `--bp-md` | 768–1023px | `md:` | iPad portrait | 2-col where it fits, drawer nav still |
| `--bp-lg` | 1024–1279px | `lg:` | iPad landscape, small laptop | Persistent sidebar appears, tables expand |
| `--bp-xl` | ≥1280px | `xl:` | Desktop | Full sidebar + multi-col content + side-by-side wizard rail |

Sidebar appears at **lg** (1024px), not md — iPad portrait gets the drawer to preserve content width. This is the most important boundary in the system; everything else cascades from it.

### Container queries vs. media queries

Use **media queries** for: shell-level layout (sidebar, topbar, rail), modal vs. bottom sheet, auth two-pane → stacked.

Use **container queries** (`@container`) for: reusable cards that may appear inside narrower regions (`StatsCard`, `SectionCard`, `DpcLastReview`, achievement tiles), table card-mode cells, and dashboard tiles. These need to adapt to their slot, not the viewport — e.g. a `StatsCard` rendered in a 2-up grid on desktop is narrower than one rendered full-width in a drawer.

Set `container-type: inline-size` on each card root. Caniuse is green for all targeted browsers.

---

## 2. Layout Strategy per Surface

### [AppShell.vue](frontend/src/components/AppShell.vue)

| Breakpoint | Pattern |
|---|---|
| ≥1280 | 240px sidebar + flex main (current) |
| 1024–1279 | Sidebar 200px (tighter padding, icon+label still) |
| 768–1023 | **Sidebar → off-canvas drawer**, fixed topbar (56px) with hamburger + logo + lang/user; drawer slides from `inset-inline-start` |
| ≤767 | Same topbar + drawer, **plus optional bottom tab bar** (5 items: Dashboard, Cases, Pricing, Services, More). Justification below |

Gamification block (`DpcHealthScore`, `DpcLastReview`, upgrade CTA) and `user-card` move into the drawer footer; never bottom-tab-bar (too information-dense).

### [WizardShell.vue](frontend/src/components/WizardShell.vue) + [DpcWizardRail.vue](frontend/src/components/DpcWizardRail.vue)

| Breakpoint | Pattern |
|---|---|
| ≥1280 | Vertical rail 280px + content 56px padding + 76px footer (current) |
| 1024–1279 | Rail 220px, content 32px padding |
| 768–1023 | **Rail collapses to horizontal stepper** above content; the contextual note (`wiz-rail-note`) becomes a collapsible "?" tooltip in the topbar |
| ≤767 | **Stepper → 3-dot progress strip + "Step X of 3 · {label}"** below topbar; sticky bottom action bar (back ← / next →) replaces the footer; topbar height 52px |

CTA placement on mobile: sticky **bottom action bar** (96px when keyboard closed; reduces to 56px when soft keyboard pushes viewport — listen to `visualViewport.resize`). Action bar respects `env(safe-area-inset-bottom)`.

### Auth screens + [AuthHeroCard.vue](frontend/src/components/AuthHeroCard.vue)

| Breakpoint | Pattern |
|---|---|
| ≥1024 | Two-pane: navy hero (left) + form (right), 50/50 (current) |
| 768–1023 | 40/60 with hero compressed; hero cards become single column |
| ≤767 | **Single column.** Navy hero collapses to a 200px banner with logo, eyebrow, and one rotating `AuthHeroCard` (testimonial). Bullets + secondary cards hidden below md. Form fills the rest. Glassmorphism kept but `backdrop-filter` only above sm (perf hit on low-end Android Chrome) |

### [DashboardView.vue](frontend/src/views/app/DashboardView.vue)

- ≥1280: existing multi-card grid
- 1024–1279: 3-col → 2-col stat grid
- 768–1023: 2-col stat grid, `setupChecklist` becomes full-width
- ≤767: **Single column**, stat cards stack, `DpcAchievements` becomes horizontally scrollable strip (snap-x), trial banner becomes sticky-top alert dismissible

### Tables — [PriceListView.vue](frontend/src/views/results/PriceListView.vue), [ChairCostView.vue](frontend/src/views/results/ChairCostView.vue), [CaseTrackerView.vue](frontend/src/views/app/CaseTrackerView.vue)

See §5 below — chosen pattern: **priority columns + expandable row on small screens** (NOT horizontal scroll, NOT pure card list).

### Forms — Setup steps, [SettingsView.vue](frontend/src/views/app/SettingsView.vue)

| Breakpoint | Pattern |
|---|---|
| ≥1024 | 2-col grid for related fields (rent + chairs, hours + days) |
| 768–1023 | 2-col stays; reduce field width |
| ≤767 | **Single column**; labels on top (already is); `inputmode` on numeric; sticky footer for primary action |

### Modals — [DpcModal.vue](frontend/src/components/DpcModal.vue)

- ≥768: Centered dialog, max-width 480px (current)
- ≤767: **Bottom sheet.** Slide up from `bottom: 0`, full width, max-height 90vh, header has drag handle, body scrolls, footer pinned. Backdrop click and swipe-down both close. This is the single biggest UX win on phones.

---

## 3. Navigation Pattern — Why drawer + bottom tabs

On phones the AppShell has 7 nav items (8 with super-admin). Choices:

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| Pure hamburger drawer | Familiar, scales to N items | Burying primary nav hurts task switching mid-flow (Pricing ↔ Cases ↔ Consumables) | OK |
| Bottom tab bar only | Thumb-friendly, persistent | Too few slots for 7 items, sub-items get lost | No |
| **Hamburger drawer + bottom tab bar (4 primary + More)** | Persistent reach to the 4 highest-traffic destinations; drawer absorbs the long tail (Settings, Subscription, SuperAdmin, Consumables) | Two nav systems to maintain | **Yes** |

Bottom tabs (in order, mirrored for RTL): Dashboard · Pricing · Cases · Services · More. "More" opens the drawer.

Bottom bar height 56px + safe-area-inset-bottom. Hide on scroll-down, restore on scroll-up (and always show in landscape). Hide entirely on the setup wizard and auth (those have their own footers).

---

## 4. Wizard Rail Adaptation

| Width | Form |
|---|---|
| ≥1024 | Vertical rail (current `DpcWizardRail`) with full step labels and `wiz-rail-note` |
| 768–1023 | Horizontal stepper bar: `① ── ② ── ③` with labels under each dot |
| ≤767 | Compact progress: `"Step 2 of 3 · Costs"` + a 3-segment progress bar (`FormProgressBar` already exists — reuse it). Tap the label to open a sheet listing all steps for jump nav |

Mobile CTAs: sticky bottom action bar holding `[Back]` (ghost) + `[Continue]` (primary). Place "Skip with defaults" as a `link` button above the action bar, not inside it — secondary actions inside primary bars cause mis-taps.

---

## 5. Tables — One pattern across all three views

**Recommendation: priority columns + expandable detail row** (not card-per-row, not horizontal scroll with frozen column).

Pattern:
- Each column declares a priority (1=always visible, 2=tablet+, 3=desktop+).
- On ≤767: show priority-1 columns only + a row chevron. Tap row → expand inline to reveal everything else as a definition list (label/value pairs).
- Action buttons (per-row edit/delete) move into a row overflow menu (`⋯`) on small screens.

Why this over alternatives:

| Pattern | Why not |
|---|---|
| Horizontal scroll w/ frozen first column | Discoverable on touch but hides margin/profit columns — the whole point of the Price List is seeing variance side-by-side. Frozen column also breaks RTL flipping cleanly. |
| Pure card-per-row | Eats vertical space, kills scannability. Case Tracker has dozens of rows. |
| Priority + expandable | Preserves the scannability of the headline metric while still surfacing detail on demand. Works identically in RTL. |

Per-view priority assignments (suggested):
- **Price List** ([PriceListView.vue](frontend/src/views/results/PriceListView.vue)): P1 = Service · Suggested · Current · Δ badge. P2 = Cost. P3 = Margin slider, VAT, actions.
- **Chair Cost** ([ChairCostView.vue](frontend/src/views/results/ChairCostView.vue)): P1 = Cost line · Amount. P2 = % of total. P3 = source/edit.
- **Case Tracker** ([CaseTrackerView.vue](frontend/src/views/app/CaseTrackerView.vue)): P1 = Service · Count · Revenue. P2 = Mat cost. P3 = Margin. Plus: sticky month selector at top, sticky totals row at bottom.

Trade-off: the global profit simulator on Price List (margin slider + VAT + rounding) doesn't belong above an expanded row list — collapse it into a sticky FAB on mobile that opens a bottom sheet with the controls. **Worth prototyping before committing** — flag for product.

---

## 6. Forms & Inputs

| Concern | Spec |
|---|---|
| Touch target min | 44×44 (already met on `DpcField` input @ 44px) |
| `DpcBtn` sizes | `md` is 40px — bump min-height to 44px on phones, OR enforce `lg` on primary CTAs in mobile views. Keep `xs`/`sm` desktop-only. |
| Input font-size | **Raise from 14.5px → 16px on ≤767** to avoid iOS Safari zoom-on-focus trap |
| Label placement | Top (current) — keep |
| Numeric fields (money, hours, %) | Add `inputmode="decimal"` and `pattern="[0-9]*"`. Step1Profile/Step2Costs/Settings all have these |
| Email field | `inputmode="email"` + `autocomplete="email"` |
| Password | `autocomplete="current-password"` / `"new-password"` |
| Submit on Enter | Audit `<form>` wrappers — some auth views use `@click` on the button, breaking iOS Done-key submit |
| Sticky action bar | Use `position: sticky; bottom: 0` with `env(safe-area-inset-bottom)` padding |
| Field error display | `field-msg` already inline — fine on mobile, no change |
| Autofocus | Avoid on mobile (triggers keyboard immediately, hides hero context) |

---

## 7. Typography & Spacing — make tokens flex

The current type ramp is fixed-pixel (`--text-base: 1.125rem`). On mobile that hero size compounds with long Arabic words and breaks lines awkwardly.

Approach: **fluid type via `clamp()`** for display tokens only, keep body tokens fixed.

| Token | Mobile → Desktop |
|---|---|
| `--text-4xl` | `clamp(2rem, 5vw, 3.125rem)` (50px) |
| `--text-3xl` | `clamp(1.625rem, 4vw, 2.375rem)` |
| `--text-2xl` | `clamp(1.375rem, 3vw, 2rem)` |
| `--text-xl` | `clamp(1.25rem, 2.4vw, 1.625rem)` |
| `--text-lg`–`--text-xs` | **unchanged** (body legibility is non-negotiable) |

Spacing — introduce two layout-level tokens that flex:
- `--gutter`: `clamp(16px, 3vw, 32px)` for content padding
- `--section-gap`: `clamp(24px, 4vw, 48px)` between major blocks

Hard-coded `padding: 44px 56px` in `WizardShell.vue` and `48px` paddings elsewhere should adopt `--gutter`. Existing spacing tokens (`--space-1..24`) stay as-is.

---

## 8. RTL Considerations

The codebase already uses `inset-inline-start/end` consistently and `html[dir="rtl"]` in `DpcBtn.vue`. Additional items to verify/fix during the pass:

| Concern | Action |
|---|---|
| Drawer slide direction | Drawer must enter from `inset-inline-start` — slides from right in RTL automatically |
| Bottom tab order | Reverse via `flex-direction: row-reverse` under `dir="rtl"` so the "primary" tab matches reading flow |
| Wizard step transitions | `wiz-step-enter-from { transform: translateX(32px) }` is LTR-locked — replace with `translateX(var(--tx))` where `--tx` is `32px` LTR / `-32px` RTL, or use logical CSS transform once supported |
| Caret/chevron icons | Row-expand chevrons and "next →" arrows must flip in RTL — `DpcIcon` does not currently mirror; add a `:flip-rtl` prop |
| Table column order | Logical order (priority cols first) — no manual flip needed since DOM order = visual order in both directions |
| Progress bar | `FormProgressBar` fills LTR — verify it fills toward the start of the inline axis (it should already if using `inset-inline-start`) |
| Money / number formatting | Numbers stay LTR even in RTL pages — wrap in `<bdi>` or `direction: ltr; unicode-bidi: isolate` on `.dpc-money` |
| Sliders (margin slider on Price List) | Track and thumb must reverse — `<input type="range">` does not auto-flip in WebKit; needs explicit `direction: rtl` |
| Auth hero | Eyebrow + bullets stay readable; testimonial card already symmetric |

---

## 9. Component-by-Component Checklist

| Component | Responsive change |
|---|---|
| [AppShell.vue](frontend/src/components/AppShell.vue) | Drawer + topbar + bottom tabs below `lg`; sidebar width drops at `lg` |
| [WizardShell.vue](frontend/src/components/WizardShell.vue) | Rail collapses to stepper at `md`, to progress strip at `xs`/`sm`; sticky footer action bar |
| [DpcWizardRail.vue](frontend/src/components/DpcWizardRail.vue) | Add `horizontal` variant prop; reuse same component or split into `DpcStepperHorizontal` |
| [AuthHeroCard.vue](frontend/src/components/AuthHeroCard.vue) | Hide non-testimonial variants ≤sm; drop `backdrop-filter` ≤sm for perf |
| [DpcModal.vue](frontend/src/components/DpcModal.vue) | **Bottom sheet variant ≤sm** with drag handle; pull modal animation from scale-pop → slide-up |
| [DpcBtn.vue](frontend/src/components/DpcBtn.vue) | Raise `md` min-height 40→44 on phones, OR enforce `lg` for primary mobile CTAs; `full` becomes default in sticky bars |
| [DpcField.vue](frontend/src/components/DpcField.vue) | Input font-size 14.5→16px ≤sm; add `inputmode` and `autocomplete` pass-through props |
| [DpcPanel.vue](frontend/src/components/DpcPanel.vue) | Padding via `--gutter`; container-query for inner layout |
| [DpcChip.vue](frontend/src/components/DpcChip.vue) | Min tap target 32px desktop → 36px mobile; horizontal scroll container helper |
| [DpcToast.vue](frontend/src/components/DpcToast.vue) | Move toast container from top-right to **bottom-center** ≤sm, above safe-area + bottom nav |
| [ToastContainer.vue](frontend/src/components/ToastContainer.vue) | Reposition under safe-area |
| [DpcProgress.vue](frontend/src/components/DpcProgress.vue) | Already linear — verify RTL fill direction |
| [DpcHealthScore.vue](frontend/src/components/DpcHealthScore.vue) | Scale down to 48px diameter in mobile drawer |
| [DpcLastReview.vue](frontend/src/components/DpcLastReview.vue) | Stack date + label vertically in narrow container (container query) |
| [DpcCoverageBar.vue](frontend/src/components/DpcCoverageBar.vue) | Verify segments don't crush; allow label wrap |
| [DpcAchievements.vue](frontend/src/components/DpcAchievements.vue) | Horizontal snap-scroll ≤sm |
| [DpcMonthlyNudge.vue](frontend/src/components/DpcMonthlyNudge.vue) | Becomes bottom-sheet ≤sm (reuses modal sheet variant) |
| [DpcEmptyState.vue](frontend/src/components/DpcEmptyState.vue) | Tighter padding ≤sm |
| [DpcSkeleton.vue](frontend/src/components/DpcSkeleton.vue) | Match table-card heights when in card mode |
| [DpcLogo.vue](frontend/src/components/DpcLogo.vue) | Mark-only variant for mobile topbar |
| [PageHeader.vue](frontend/src/components/PageHeader.vue) | Title size via fluid `--text-2xl`; actions collapse into `⋯` overflow ≤sm |
| [SectionCard.vue](frontend/src/components/SectionCard.vue) | Container-query for header layout |
| [StatsCard.vue](frontend/src/components/StatsCard.vue) | Container-query (icon ↔ stack) instead of viewport query |
| [AlertBanner.vue](frontend/src/components/AlertBanner.vue) | Icon shrinks, CTA moves below text ≤sm |
| [FormProgressBar.vue](frontend/src/components/FormProgressBar.vue) | Reuse for wizard mobile progress |
| [LangSwitch.vue](frontend/src/components/LangSwitch.vue) | Already small — drop label, icon-only ≤sm |
| [TrustBadge.vue](frontend/src/components/TrustBadge.vue) | Wrap or hide on ≤sm auth screen |
| [InputGroup.vue](frontend/src/components/InputGroup.vue) | Stack left/right addons vertically ≤sm if both present |
| [table/DpcTable.vue](frontend/src/components/table/DpcTable.vue) | Add `card-mode` prop driven by container query; switch off horizontal scroll on mobile in favor of priority+expand |
| [table/DpcTableHead.vue](frontend/src/components/table/DpcTableHead.vue) | Hide low-priority columns ≤sm |
| [table/DpcTableRow.vue](frontend/src/components/table/DpcTableRow.vue) | Add `expandable` mode |
| [table/DpcTableCell.vue](frontend/src/components/table/DpcTableCell.vue) | Add `priority` prop |

---

## 10. Testing Matrix

### Viewports

| Device | Width × Height | Orientation | OS / Browser |
|---|---|---|---|
| iPhone SE (2nd–3rd gen) | 375×667 | portrait | iOS Safari |
| iPhone 14 / 15 | 390×844 | portrait + landscape | iOS Safari |
| iPhone 14/15 Pro Max | 430×932 | portrait | iOS Safari |
| Pixel 7 | 412×915 | portrait | Android Chrome |
| Galaxy S22 | 360×780 | portrait | Android Chrome |
| iPad mini | 768×1024 | both | iPad Safari |
| iPad Air | 820×1180 | both | iPad Safari |
| iPad Pro 11" | 1194×834 | landscape | iPad Safari |
| Laptop | 1366×768 | — | Chrome, Safari |
| Desktop | 1920×1080 | — | Chrome, Firefox |

### Top 10 user flows (each tested in EN and AR)

1. Register → email verify → land on `SetupIntroView` (iPhone SE, AR)
2. Complete 3-step setup wizard with on-screen keyboard open (Pixel 7, EN)
3. Login (remember me) → Dashboard with trial banner (iPad mini portrait, AR)
4. Dashboard → open `DpcMonthlyNudge` → dismiss (iPhone 14, EN)
5. Price List → adjust margin slider on a row → save (iPad Pro landscape, AR — slider RTL critical)
6. Price List → open global profit simulator FAB → apply (iPhone 15 Pro Max, EN)
7. Case Tracker → switch month → enter case counts → save (Pixel 7, AR)
8. Services → add new service via modal/bottom-sheet (iPhone SE, EN)
9. Settings → change currency + clinic name → save with sticky footer (iPhone SE, AR)
10. Logout from drawer (iPad mini portrait, EN)

### Acceptance checks per flow

- No horizontal page scroll at any breakpoint
- All touch targets ≥44px
- No iOS zoom on field focus
- Focus ring visible after `Tab`
- Drawer closes on backdrop tap, on back-gesture (mobile Safari), and on route change
- Sticky action bar respects safe-area-inset-bottom
- Arabic line lengths don't cause overflow on stat cards
- Modal/sheet does not trap scroll on the body (`overscroll-behavior: contain`)

---

## 11. Build Sequence (phased)

Ranked by user impact × effort. Each phase is shippable in isolation.

### Phase 0 — Foundation (1–2 days)

Touch only tokens; nothing visible should change at desktop sizes.
- Add breakpoint tokens to [frontend/src/assets/tokens.css](frontend/src/assets/tokens.css)
- Add `--gutter`, `--section-gap`
- Convert display type tokens to `clamp()`
- Add `overflow-x: hidden` guard on `html, body` + `min-width: 0` on `.main-area`

### Phase 1 — AppShell + Auth (highest blast radius) (3–4 days)

This is what users see first; everything else lives inside AppShell.
- AppShell: drawer + mobile topbar + bottom tab bar
- AuthHeroCard / Login / Register / Forgot / Reset / VerifyEmail: stacked layout ≤sm
- DpcBtn: ensure 44px on mobile primary
- DpcField: 16px input font + inputmode pass-through
- DpcModal: bottom-sheet variant ≤sm
- DpcToast: bottom-center ≤sm + safe-area

### Phase 2 — Wizard (high impact, narrow surface) (2 days)

New users hit this immediately after register; can't ship Phase 1 register flow without it.
- WizardShell: collapsing rail + sticky footer
- DpcWizardRail: horizontal + progress-strip variants
- Setup steps 1/2/3: single-column at mobile, sticky CTA

### Phase 3 — Tables & data views (largest UX gain) (4–5 days)

- DpcTable: card-mode / priority columns / expandable rows
- PriceListView: profit simulator becomes FAB → bottom sheet on mobile
- ChairCostView: card mode
- CaseTrackerView: card mode + sticky totals + sticky month selector

### Phase 4 — Forms & Settings (2 days)

- SettingsView: single-column, sticky save
- ConsumablesView, ServicesView: card mode + add-via-sheet
- SubscriptionView: stacked plan cards
- SuperAdminView: defer to a "good enough" pass (internal users only)

### Phase 5 — Dashboard polish + Welcome (1–2 days)

- DashboardView: container-query the stat cards
- DpcAchievements: horizontal snap-scroll
- WelcomeView: marketing landing — verify line-lengths, CTA tap targets
- Trial banner: dismissible sticky-top mobile

### Phase 6 — RTL polish + cross-browser (2 days)

- Wizard transition direction fix
- Range slider RTL
- Bottom-tab order under RTL
- iOS Safari `100vh` → `100svh` swap
- Test pass against full matrix

**Total: ~14–17 dev days.** Phases 1–3 deliver ~80% of user-visible improvement.

---

## 12. Risks & Open Questions

| # | Item | Decision needed from |
|---|---|---|
| 1 | **Bottom tab bar — yes or no?** Adds maintenance vs. faster reach on mobile. Default plan says yes; if product wants pure-drawer for simplicity, drop ~½ day of Phase 1 | Product |
| 2 | **Price List profit simulator on mobile** — FAB+bottom-sheet vs. inline collapsible at top. The simulator's value comes from seeing rows react live; both patterns hide that. **Worth prototyping in Figma or quick HTML before committing.** | Product + design |
| 3 | **Tables: priority+expand vs. horizontal scroll** — confirm scannability is more valuable than density. If product disagrees, fallback is horizontal scroll w/ sticky leftmost cell | Product |
| 4 | **Supported minimum width** — committing to 360px (Galaxy S22) or 320px (legacy iPhone SE 1st gen)? Difference affects how aggressively we shrink in PageHeader, drawer, etc. | Product |
| 5 | **`backdrop-filter` on cheap Android** — auth hero glass cards. Drop entirely ≤sm or keep with fallback? Plan says drop | Design |
| 6 | **iPad portrait gets the drawer, not the sidebar** — some users may expect a desktop-style sidebar on iPad. Alternative: keep sidebar on iPad portrait but collapse it to icon-only rail | Product |
| 7 | **Wizard "Save & exit"** button visibility on mobile topbar — keep, move into a topbar overflow menu, or drop entirely? | Product |
| 8 | **SuperAdminView responsive priority** — internal-only. Plan defers it to Phase 4 with minimum effort. Confirm acceptable | Product |
| 9 | **PWA / install banner / offline** — out of scope for this responsiveness pass? Should be confirmed so we don't over-engineer | Product |
| 10 | **Tailwind in use?** Repo uses scoped CSS + tokens, not utility classes. Plan assumes we **don't introduce Tailwind** — we extend the CSS-var / scoped-CSS approach. Confirm | Engineering |

---

### Items to prototype before committing code

1. **Price List on iPhone SE in Arabic** — the most information-dense screen × the worst case. Validates the priority+expand pattern survives Arabic margin badges.
2. **DpcModal → bottom sheet transition** — make sure it doesn't fight iOS scroll inside the sheet body.
3. **Bottom tab bar + sticky wizard footer collision** — confirm they're never visible together (wizard hides tabs).
4. **WizardShell rail → horizontal stepper at the md/lg boundary** — visual continuity matters here; this is where the design language is most at risk of fracturing.
