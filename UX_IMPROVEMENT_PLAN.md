# UX Improvement Plan — Dental Pricing Calculator

**Frameworks:** Nielsen's 10 Heuristics · Krug's Laws · Lean UX · Refactoring UI  
**Audit score:** 6.2 / 10 → Target: 9 / 10  
**Date:** 2026-05-18

---

## Lean UX Hypothesis

> **"We believe onboarding completion rate will exceed 80% and time-to-first-price-calculated will drop below 10 minutes if we fix navigation orientation, remove the skip-step bug, add affordance to editable cells, and surface zero-price prompts."**

**Success criteria (pre-commit):**
- Onboarding completion rate: measure % of registered users who reach `obComplete()`
- Time-to-first-service: measure minutes from registration to first non-zero service price saved
- Support tickets about "couldn't find edit button": drops to zero

---

## Critical — Fix This Week

### C1 · Onboarding step dots allow skipping validation

**Heuristic violated:** Error Prevention (Nielsen #5)  
**Severity:** 4 — Catastrophic  
**File:** `static/js/app.js:1952`

**Problem:** Each dot calls `obSetStep(n)` directly, letting users jump from Step 1 to Step 4 and complete setup with all-zero/default values (rent=0, EGP, 40% profit).

**Fix:**

```js
// Before (line 1952):
${[1,2,3,4].map(i => `<div class="ob-step-dot" onclick="obSetStep(${i})">${i}</div>`).join('<div class="ob-step-line"></div>')}

// After — remove onclick, dots are visual only:
${[1,2,3,4].map(i => `<div class="ob-step-dot">${i}</div>`).join('<div class="ob-step-line"></div>')}
```

**Lean UX note:** This is the riskiest assumption to leave untested — a user who skips to step 4 gets a broken pricing model silently.

---

### C2 · Sidebar has no "you are here" indicator

**Heuristic violated:** Visibility of System Status (Nielsen #1) · Trunk Test (Krug)  
**Severity:** 3 — Major  
**Files:** `templates/index.html`, `static/css/style.css`

**Problem:** All sidebar nav links look identical regardless of which page is active. Users cannot tell where they are without reading the page heading.

**Fix — JS (in `APP.loadPage()`):**

```js
// Add after the page renders:
document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('nav-link-active', link.dataset.page === page);
});
```

**Fix — CSS (add to `static/css/style.css`):**

```css
.nav-link { position: relative; }
.nav-link-active {
    background: var(--primary-50);
    color: var(--primary);
    font-weight: 600;
}
.nav-link-active::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 3px;
    background: var(--primary);
    border-radius: 0 2px 2px 0;
}
```

---

### C3 · Dashboard KPIs have no loading state — blank screen on every navigation

**Heuristic violated:** Visibility of System Status (Nielsen #1)  
**Severity:** 3 — Major  
**File:** `static/js/app.js` — `APP.loadPage()`

**Problem:** Three async API calls (`stats`, `setup-status`, `price-list`) run before any HTML renders. The content area is blank for 200–500ms on every page load.

**Fix — add skeleton loader in `APP.loadPage()`:**

```js
// Before calling Pages[page](), inject skeleton:
document.getElementById('app-content').innerHTML = `
    <div class="skeleton-loader">
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
        <div class="skeleton-card" style="height:40px;width:60%;"></div>
    </div>`;
const html = await Pages[page]();
document.getElementById('app-content').innerHTML = html;
```

**Fix — CSS:**

```css
.skeleton-card {
    background: linear-gradient(90deg, var(--gray-100) 25%, var(--gray-200) 50%, var(--gray-100) 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
    border-radius: 12px;
    height: 80px;
    margin-bottom: 1rem;
}
@keyframes skeleton-shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}
```

---

### C4 · Edit buttons use icon-only ✎ — invisible on mobile

**Heuristic violated:** Recognition over Recall (Nielsen #6)  
**Severity:** 3 — Major  
**File:** `static/js/app.js:2521` (and equivalent lines in salaries, equipment tables)

**Problem:** `✎` is a hover-only affordance. Mobile users can't hover. Many desktop users don't recognise ✎ as "edit."

**Fix — all three tables (fixed costs, salaries, equipment):**

```js
// Before:
<button class="btn btn-sm btn-ghost" onclick="Pages.showFixedCostForm(${c.id})" title="${t('common.edit')}">✎</button>

// After:
<button class="btn btn-sm btn-ghost" onclick="Pages.showFixedCostForm(${c.id})">✎ ${t('common.edit')}</button>
```

Apply the same pattern to:
- `Pages.showSalaryForm(${s.id})` button
- `Pages.showEquipmentForm(${e.id})` button

---

### C5 · Inline editable cells have no visible affordance

**Heuristic violated:** Visibility of System Status (Nielsen #1) · Aesthetic & Minimalist Design (Nielsen #8)  
**Refactoring UI principle:** Every interactive element must signal interactivity  
**Severity:** 3 — Major  
**File:** `static/css/style.css` (inline-editable rules)

**Problem:** Editable cells only reveal themselves on hover. First-time users and all mobile users see no signal that the number is tappable/clickable.

**Fix — CSS:**

```css
/* Update the existing .inline-editable rule */
.inline-editable {
    cursor: pointer;
    transition: background 0.15s;
    position: relative;
}
.inline-editable::after {
    content: '✎';
    font-size: 0.65rem;
    color: var(--gray-400);
    position: absolute;
    top: 3px;
    right: 5px;
    opacity: 0.5;
    pointer-events: none;
    transition: opacity 0.15s;
}
.inline-editable:hover::after { opacity: 1; color: var(--primary); }
.inline-editable:hover { background: var(--primary-50); }
```

---

## Important — Fix This Sprint

### I1 · Landing page language inconsistency (hero Arabic, features English)

**Heuristic violated:** Consistency and Standards (Nielsen #4)  
**Severity:** 3 — Major  
**File:** `templates/welcome.html:524–553`

**Problem:** The calculator widget HTML is hard-coded in Arabic. The Features section is hard-coded in English. `wlApplyLang()` only translates the widget, not the features/trust/footer sections.

**Fix:** Change all Arabic hard-coded strings in the widget to English defaults (the same language the features section uses). `wlApplyLang()` already handles switching to Arabic:

```html
<!-- Before (line 524): -->
<h3 class="cw-title" id="cwStep1Title">عيادتك من أي نوع؟</h3>
<p class="cw-sub" id="cwStep1Sub">سؤالان بس — وسنملأ ٨٠٪ من البيانات تلقائياً...</p>

<!-- After: -->
<h3 class="cw-title" id="cwStep1Title">What type of clinic?</h3>
<p class="cw-sub" id="cwStep1Sub">Just 2 questions — we'll auto-fill 80% of data from similar clinic averages</p>
```

Apply to all Arabic-default strings in the widget: step labels, chip text, button labels, progress text, result labels. The `WL_T.en` and `WL_T.ar` objects already have correct translations — just change the HTML defaults to match `WL_T.en`.

Also update the progress bar default:
```html
<!-- Before (line 514): -->
<span id="cwStepLabel">خطوة ١ من ٣</span>
<span id="cwStepTime">⏱ دقيقتان تقريباً</span>

<!-- After: -->
<span id="cwStepLabel">Step 1 of 3</span>
<span id="cwStepTime">⏱ About 2 minutes</span>
```

---

### I2 · Onboarding has no step labels or time estimate

**Heuristic violated:** Visibility of System Status (Nielsen #1)  
**Krug principle:** Each click should build confidence  
**Severity:** 3 — Major  
**File:** `static/js/app.js:1950–1953`

**Problem:** Step dots show numbers 1–4 with no description. Users don't know how long setup takes or what each step covers.

**Fix — add step label and time estimate below the dot bar:**

```js
// After the ob-step-bar div (line 1953), add:
<div class="ob-step-meta">
    <span id="ob-step-label">${t('onboarding.stepOf', {step: 1, total: 4})}</span>
    <span class="ob-step-time">⏱ ${t('onboarding.setupTime')}</span>
</div>
```

**Add to `static/translations/en.json`:**

```json
"stepOf": "Step {step} of {total}",
"setupTime": "About 3 minutes"
```

**Update `obSetStep(n)` to update the label:**

```js
function obSetStep(n) {
    OB.step = n;
    // ... existing code ...
    const stepLabel = document.getElementById('ob-step-label');
    if (stepLabel) stepLabel.textContent = t('onboarding.stepOf', {step: n, total: 4});
}
```

**CSS:**

```css
.ob-step-meta {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: var(--gray-500);
    margin-top: 0.5rem;
    margin-bottom: 1.5rem;
}
.ob-step-time { opacity: 0.7; }
```

---

### I3 · Onboarding "costs note" is misleading — implies prices are auto-populated

**Heuristic violated:** Match Between System and Real World (Nielsen #2)  
**Severity:** 3 — Major  
**File:** `static/translations/en.json` → key `onboarding.costsNote`

**Problem:** The note says costs are auto-populated from clinic averages, but since the zero-price change, all starter consumables, lab materials, and service prices are 0. Users expect to see numbers; they see zeros and feel something is broken.

**Fix — update translation key:**

```json
// Before:
"costsNote": "Consumables and other costs will be auto-populated with averages from similar clinics."

// After:
"costsNote": "Your consumables, lab materials, and services are pre-loaded with zero costs. After setup, go to Consumables and Services to enter your real prices."
```

Apply equivalent fix to `ar.json`.

---

### I4 · Trial banner appears before user has any services — creates premature anxiety

**Heuristic violated:** Error Prevention (Nielsen #5) — don't alarm users unnecessarily  
**Lean UX:** Show friction only when it blocks the user's actual goal  
**Severity:** 2 — Minor  
**File:** `static/js/app.js:2146`

**Problem:** A brand-new user who just completed onboarding sees "🔒 Trial Mode Active — prices are blurred" even though they have zero services. The banner references blurred prices that don't exist yet.

**Fix:**

```js
// Before (line 2146):
const showBanner = isTrial || isExpired || isSuspended;

// After:
const showBanner = (isTrial && stats.total_services > 0) || isExpired || isSuspended;
```

---

### I5 · "Include in calculations" requires opening a modal — should be an inline toggle

**Heuristic violated:** Flexibility and Efficiency of Use (Nielsen #7)  
**Refactoring UI principle:** Reduce interaction cost for frequent binary actions  
**Severity:** 2 — Minor  
**File:** `static/js/app.js:2518`

**Problem:** Toggling a fixed cost, salary, or equipment item on/off requires: click ✎ → open modal → find checkbox → save. Three steps for a binary action.

**Fix — replace the static badge with an inline toggle:**

```js
// Before (line 2518):
<td><span class="badge badge-${c.included?'success':'gray'}">${c.included?'✓':'✗'}</span></td>

// After:
<td>
    <label class="toggle-switch" title="${c.included ? t('settings.included') : t('settings.excluded')}">
        <input type="checkbox" ${c.included ? 'checked' : ''}
               onchange="Pages.toggleFixedCostIncluded(${c.id}, this.checked)">
        <span class="toggle-track"></span>
    </label>
</td>
```

**Add the handler in `Pages`:**

```js
async toggleFixedCostIncluded(id, included) {
    try {
        await API.put(`/api/fixed-costs/${id}`, { included });
        showToast(t('common.saved'), 'success');
    } catch (e) {
        showToast(e.message, 'error');
        APP.loadPage('settings'); // revert UI on failure
    }
},
```

**Apply same pattern to:** salary `included` toggle and equipment `included` toggle.

**CSS:**

```css
.toggle-switch { display: inline-flex; align-items: center; cursor: pointer; }
.toggle-switch input { display: none; }
.toggle-track {
    width: 36px; height: 20px;
    background: var(--gray-300);
    border-radius: 999px;
    position: relative;
    transition: background 0.2s;
}
.toggle-track::after {
    content: '';
    position: absolute;
    width: 16px; height: 16px;
    background: white;
    border-radius: 50%;
    top: 2px; left: 2px;
    transition: left 0.2s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.toggle-switch input:checked + .toggle-track { background: var(--success); }
.toggle-switch input:checked + .toggle-track::after { left: 18px; }
```

---

### I6 · Zero unit costs show as `EGP 0.00` with no prompt to set them

**Refactoring UI principle:** Zero states must look different from real data  
**Heuristic violated:** Visibility of System Status (Nielsen #1)  
**Severity:** 2 — Minor  
**File:** `static/js/app.js` — lab materials table row render

**Problem:** All new clinics have unit_cost = 0. The table shows `EGP 0.00` in bold — it looks like a real value, not a missing one. Users don't realise they need to fill these in.

**Fix — in lab materials row render:**

```js
// Before:
<td><strong>${formatCurrency(m.unit_cost)}</strong></td>

// After:
<td class="inline-editable ${m.unit_cost <= 0 ? 'value-zero' : ''}"
    onclick="inlineEdit(this, '/api/lab-materials', 'unit_cost', 'float', ${m.id})">
    ${m.unit_cost > 0
        ? `<strong>${formatCurrency(m.unit_cost)}</strong>`
        : `<span class="no-value">Set price</span>`}
</td>
```

**Apply same pattern to consumables `pack_cost` column.**

**CSS (add to existing `.no-value` rule):**

```css
.value-zero .no-value {
    color: var(--warning-600, #d97706);
    font-style: italic;
    font-size: 0.8rem;
}
```

---

### I7 · Store raw numeric in `data-value` to prevent locale-parsing bugs on save/re-edit

**Severity:** 2 — Minor  
**File:** `static/js/app.js` — `inlineEdit()` function (~line 640)

**Problem:** On re-edit, the function reads `td.textContent.replace(/[^\d.]/g, '')` to recover the original number. This is fragile if `formatCurrency` outputs locale-specific separators (e.g. `1.234,50` in some locales).

**Fix — store raw value in a data attribute:**

```js
// In inlineEdit(), after setting td.innerHTML on successful save:
td.innerHTML = type === 'float'
    ? `<strong>${formatCurrency(val)}</strong>`
    : String(val);
td.setAttribute('data-value', val);   // ← add this line

// When reading on next edit, prefer data-value:
const rawNum = td.getAttribute('data-value');
const originalVal = rawNum !== null
    ? (type === 'float' ? parseFloat(rawNum) : parseInt(rawNum))
    : (type === 'float' ? parseFloat(rawText) || 0 : parseInt(rawText) || 0);
```

---

### I8 · Error toasts disappear too fast — 3 seconds is not enough for error messages

**Heuristic violated:** Help Users Recognize, Diagnose, and Recover from Errors (Nielsen #9)  
**Severity:** 2 — Minor  
**File:** `static/js/app.js` — `showToast()` function

**Problem:** Error messages like "Failed to save — Connection error" vanish in 3 seconds. Users who are mid-read lose the message before they can act.

**Fix — differentiate duration by type:**

```js
function showToast(message, type = 'info') {
    const duration = {
        error:   6000,
        warning: 5000,
        success: 2500,
        info:    3500,
    }[type] ?? 3500;

    // ... rest of existing showToast implementation, replace hardcoded timeout with `duration`
}
```

---

## Polish — Next Cycle

### P1 · Settings page needs a jump-nav TOC for long scroll

**Refactoring UI principle:** Visual hierarchy — give users a map of a long page  
**Severity:** 1 — Cosmetic  
**File:** `static/js/app.js:2398` — `Pages.settings()`

**Fix — add at the top of the settings page HTML:**

```js
// Add before the first card:
<nav class="settings-toc">
    <a href="#section-global">${t('settings.globalSettings')}</a>
    <a href="#section-capacity">${t('settings.clinicCapacity')}</a>
    <a href="#section-fixed-costs">${t('settings.fixedMonthlyCosts')}</a>
    <a href="#section-salaries">${t('settings.salaries')}</a>
    <a href="#section-depreciation">${t('settings.depreciation')}</a>
</nav>
```

**CSS:**

```css
.settings-toc {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 1.5rem;
    padding: 0.75rem 1rem;
    background: var(--gray-50);
    border-radius: 10px;
    border: 1px solid var(--gray-200);
}
.settings-toc a {
    font-size: 0.78rem;
    color: var(--gray-600);
    text-decoration: none;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    border: 1px solid var(--gray-200);
    transition: all 0.15s;
}
.settings-toc a:hover {
    background: var(--primary-50);
    color: var(--primary);
    border-color: var(--primary-200);
}
```

Also add `id="section-global"` and `id="section-capacity"` to the first two cards (the other three already have IDs).

---

### P2 · Trust stats on landing page are hardcoded — replace or remove

**Heuristic violated:** Match Between System and Real World (Nielsen #2) — honesty  
**Severity:** 1 — Cosmetic  
**File:** `templates/welcome.html:661–674`

**Options (pick one):**
- **Option A:** Wire to a real API endpoint `GET /api/stats/public` that returns live counts
- **Option B:** Remove the stats section entirely until real data exists
- **Option C:** Change to qualitative claims: "Designed for Egyptian & Gulf dental clinics" instead of "+300 Clinics"

Recommended: **Option B** — remove until real. False social proof harms trust more than no social proof.

---

### P3 · Add `autocomplete="off"` to numeric business inputs

**Severity:** 1 — Cosmetic  
**Files:** `static/js/app.js` — onboarding Step 3 inputs, settings form inputs

**Fix — add to all numeric business inputs:**

```html
<input type="number" autocomplete="off" ...>
```

Apply to: `ob-cost-rent`, `ob-cap-chairs`, `ob-cap-hours`, `ob-cap-days`, `ob-cap-util`, all settings form inputs for VAT, profit, rounding.

---

### P4 · Consumables table column widths collapse unevenly on tablet

**Refactoring UI principle:** Tables need explicit proportions on narrow viewports  
**Severity:** 1 — Cosmetic  
**File:** `static/css/style.css`

**Fix:**

```css
#consumables-table th:nth-child(1) { width: 35%; }
#consumables-table th:nth-child(2),
#consumables-table th:nth-child(3),
#consumables-table th:nth-child(4),
#consumables-table th:nth-child(5) { width: 16.25%; text-align: right; }

#consumables-table td:nth-child(2),
#consumables-table td:nth-child(3),
#consumables-table td:nth-child(4),
#consumables-table td:nth-child(5) { text-align: right; font-variant-numeric: tabular-nums; }
```

---

### P5 · Landing page CTA copy — "Start for free" is generic

**Krug principle:** Self-evident labels — say what the user gets, not what they do  
**Severity:** 1 — Cosmetic  
**File:** `templates/welcome.html:731` (in `WL_T.en`)

```js
// Before:
heroCtaText: 'Start for free',

// After:
heroCtaText: 'Calculate my chair cost free →',
```

Arabic equivalent in `WL_T.ar`:
```js
heroCtaText: 'احسب تكلفة كرسيك مجاناً ←',
```

---

## Implementation Order

```
Week 1 (Critical):
  C1 → C2 → C3 → C4 → C5

Week 2 (Important):
  I1 → I2 → I3 → I4 → I5 → I6 → I7 → I8

Week 3 (Polish):
  P1 → P2 → P3 → P4 → P5
```

---

## Lean UX Experiment Checklist

Before shipping each group, run:

| Experiment | Method | Signal | Pass criteria |
|---|---|---|---|
| Onboarding completion | Watch 3 new users complete signup → setup | Do they reach dashboard without confusion? | All 3 complete without asking for help |
| Inline edit discoverability | Show consumables page to 1 new user — ask "how would you change a price?" | Do they click a cell without prompting? | They attempt without instruction |
| Zero-price prompt | Show lab materials page with `Set price` links | Do they understand what to do? | They click and enter a value |
| Settings TOC | Show settings page — ask "where would you add a salary?" | Do they scroll or use the TOC? | < 5 seconds to click Salaries |

**Validate, then ship. Invalidated items go back to the backlog — not to the next sprint.**

---

## Files Changed Summary

| File | Changes |
|---|---|
| `static/js/app.js` | C1 (dot onclick), C2 (active nav), C3 (skeleton loader), C4 (edit labels), I2 (step label update in obSetStep), I4 (trial banner condition), I5 (toggle handler), I7 (data-value attr), I8 (toast duration) |
| `static/css/style.css` | C2 (nav-link-active), C3 (skeleton CSS), C5 (inline-editable::after), I5 (toggle-switch), I6 (value-zero), P1 (settings-toc), P4 (table column widths) |
| `templates/welcome.html` | I1 (default to English), P2 (remove/fix stats), P5 (CTA copy) |
| `static/translations/en.json` | I2 (stepOf, setupTime), I3 (costsNote) |
| `static/translations/ar.json` | I3 (costsNote Arabic), P5 (CTA Arabic) |
