# 🎯 Visual Testing Guide - Quick Checklist

## 🚀 Quick Start

1. Start the dev server: `npm run dev` (in frontend folder)
2. Open browser: `http://localhost:5173`
3. Login with test credentials
4. Follow the checkpoints below

---

## 📋 View-by-View Testing Checkpoints

### ✅ Dashboard (`/app/dashboard`)

**Load Test**:
- [ ] Page loads without flash of unstyled content
- [ ] Cards fade in with stagger (watch carefully)
- [ ] Health score ring animates from 0% to actual percentage
- [ ] Numbers count up smoothly

**Interaction Test**:
- [ ] Hover any stat card → lifts 2px + shadow appears
- [ ] Click health score → subtle pulse feedback
- [ ] Language toggle → instant RTL/LTR flip
- [ ] All icons render correctly (no broken images)

**Visual Check**:
- [ ] Gradient on page title looks smooth
- [ ] Spacing between cards is consistent (18px gap)
- [ ] Colors match design system (teal, ink, paper)
- [ ] Numbers use monospace font (Plex Mono)

---

### ✅ Services (`/app/services`)

**Load Test**:
- [ ] PageHeader appears with icon
- [ ] Table rows fade in sequentially
- [ ] Search box is focused automatically (optional)

**Interaction Test**:
- [ ] Hover table row → background changes + left teal bar appears
- [ ] Click any service → modal slides up from bottom
- [ ] Edit service fields → inputs have teal focus ring
- [ ] Save → modal closes with fade-out
- [ ] Delete → confirmation modal appears

**Visual Check**:
- [ ] Table columns align properly
- [ ] Icons in table are sized consistently (14-16px)
- [ ] Modal backdrop has blur effect
- [ ] Category headers stand out from rows

---

### ✅ Price List (`/results/price-list`)

**Load Test**:
- [ ] Simulator panel loads on right side
- [ ] Price table loads without horizontal scroll
- [ ] Export button visible in header

**Interaction Test**:
- [ ] Drag profit slider → all prices update in real-time
- [ ] Edit any price → row highlights
- [ ] Scroll down → sticky save bar appears with slide-up
- [ ] Click "Export CSV" → file downloads

**Visual Check**:
- [ ] Variance badges color-coded (teal/amber/rose)
- [ ] Sticky bar has elevation shadow
- [ ] Revenue impact shows with + or - prefix
- [ ] Simulator panel has consistent padding

---

### ✅ Settings (`/app/settings`)

**Load Test**:
- [ ] Sidebar navigation loads with active section highlighted
- [ ] Form fields populate with current values
- [ ] All sections accessible via nav

**Interaction Test**:
- [ ] Click nav section → smooth scroll to section
- [ ] Active section has teal background + left accent
- [ ] Edit any field → auto-save indicator appears
- [ ] Add staff → modal opens, form validation works

**Visual Check**:
- [ ] Navigation sticky when scrolling
- [ ] Active indicator animates smoothly
- [ ] Form labels and inputs aligned
- [ ] Section cards have consistent styling

---

### ✅ Consumables (`/app/consumables`)

**Load Test**:
- [ ] Table view loads by default
- [ ] View toggle buttons visible in header
- [ ] Edit panel on right side (empty state)

**Interaction Test**:
- [ ] Toggle to grid view → cards appear with fade
- [ ] Hover grid card → lifts with shadow
- [ ] Click item → edit panel slides in from right
- [ ] Edit pack cost → unit cost updates instantly
- [ ] Toggle back to table → smooth transition

**Visual Check**:
- [ ] Grid cards have equal height
- [ ] Card icons centered and sized properly
- [ ] Table/grid toggle has active state
- [ ] Edit panel has sticky positioning

---

### ✅ Subscription (`/app/subscription`)

**Load Test**:
- [ ] Status card fades in first
- [ ] Trial progress bars animate width
- [ ] Feature cards appear with stagger
- [ ] Contact card glow pulses subtly

**Interaction Test**:
- [ ] Hover feature card → lifts 2px
- [ ] Click contact button → navigates or opens link
- [ ] Trial bars show correct percentages
- [ ] Days remaining displays correctly

**Visual Check**:
- [ ] Status icon matches subscription state
- [ ] Progress bars have shimmer effect
- [ ] Contact card has gradient background
- [ ] Feature icons in teal circles

---

### ✅ Case Tracker (`/app/cases`)

**Load Test** (if NOT subscribed):
- [ ] Lockout wall displays centered
- [ ] Icon floats gently (animation)
- [ ] Feature list shows 3 items
- [ ] Upgrade button is prominent

**Load Test** (if subscribed):
- [ ] Month selector loads with current month
- [ ] Table loads with saved counts
- [ ] Metrics cards show correct totals
- [ ] History shows past months

**Interaction Test**:
- [ ] Change month → table updates
- [ ] Enter case count → metrics update live
- [ ] Hover metric card → lifts
- [ ] Save button → loading state → success

**Visual Check**:
- [ ] Month selector styled consistently
- [ ] Metrics grid responsive (2 columns)
- [ ] History list items have hover state
- [ ] Save button disabled when no changes

---

### ✅ Chair Cost (`/results/chair-cost`)

**Cinematic Sequence** (watch the full animation):
1. [ ] Label fades in at 300ms
2. [ ] Number counts up from 0 (1200ms duration)
3. [ ] Currency suffix appears
4. [ ] Time slice cards appear below
5. [ ] Breakdown cards slide up with stagger (120ms each)
6. [ ] Total card appears last (highlighted in teal)
7. [ ] Benchmark appears with fade
8. [ ] "You" indicator pulses on benchmark
9. [ ] CTA section slides up last

**Interaction Test**:
- [ ] Hover breakdown card → lifts
- [ ] Hover time slice → background lightens
- [ ] Benchmark "you" dot pulses continuously
- [ ] CTA button → hover lifts + shadow

**Visual Check**:
- [ ] Number uses large font (96px on desktop)
- [ ] Breakdown cards grid properly (2 columns)
- [ ] Benchmark visualization aligns correctly
- [ ] Total card stands out (teal background)

---

## 🎨 Global Elements Check

### Navigation

- [ ] Sidebar width: 240px
- [ ] Logo icon has teal gradient
- [ ] Active nav item: black background
- [ ] Nav icons opacity: 0.7 default, 1.0 active
- [ ] Language toggle works instantly

### Typography

- [ ] Headings use Inter font (or fallback)
- [ ] Body text is readable (14px minimum)
- [ ] Numbers use IBM Plex Mono
- [ ] Arabic text uses proper font (if in RTL mode)
- [ ] Letter spacing negative on headings

### Colors

- [ ] Teal: `#0d9488` (primary actions)
- [ ] Ink: `#1a1714` (text)
- [ ] Paper: `#fefdfb` (background)
- [ ] Surface: Slightly darker than paper
- [ ] No hardcoded colors (all use CSS variables)

### Spacing

- [ ] Consistent gaps between cards (16-18px)
- [ ] Page padding: 28px
- [ ] Card padding: 20-24px
- [ ] Button heights: 40px (default), 48px (lg)

### Shadows

- [ ] Cards: Subtle inset border
- [ ] Buttons: Small shadow on hover
- [ ] Modals: Large shadow (0 20px 60px)
- [ ] Sticky elements: Medium shadow

---

## 📱 Responsive Testing

### Mobile (375px width)

1. Resize browser to 375px or use DevTools
2. Check each view:
   - [ ] Dashboard: Cards stack vertically
   - [ ] Services: Table scrolls horizontally or collapses
   - [ ] Price List: Simulator moves below table
   - [ ] Settings: Sidebar collapses to hamburger
   - [ ] Consumables: Grid becomes single column

### Tablet (768px width)

1. Resize to 768px
2. Check:
   - [ ] Dashboard: 2-column grid
   - [ ] Navigation: Full sidebar visible
   - [ ] Cards: Responsive but not cramped

### Desktop (1440px+ width)

1. Open in full screen
2. Check:
   - [ ] Max-width containers prevent overstretching
   - [ ] Content centered with margins
   - [ ] No excessive white space

---

## ♿ Accessibility Testing

### Keyboard Navigation

1. Start at top of page
2. Press `Tab` repeatedly
3. Check:
   - [ ] Focus indicator visible on all interactive elements
   - [ ] Focus order is logical (top to bottom, left to right)
   - [ ] Skip to content link (if applicable)
   - [ ] Modal traps focus when open
   - [ ] `Escape` closes modals

### Screen Reader (Optional)

1. Enable VoiceOver (Mac) or NVDA (Windows)
2. Navigate page
3. Check:
   - [ ] All images have alt text
   - [ ] Buttons have clear labels
   - [ ] Form inputs have labels
   - [ ] ARIA labels on icon-only buttons

### Color Contrast

1. Use browser extension (WAVE, axe DevTools)
2. Check:
   - [ ] Text contrast ratio ≥ 4.5:1
   - [ ] Interactive elements distinguishable
   - [ ] Error states clearly visible

### Reduced Motion

1. Enable "Reduce motion" in OS settings
2. Reload page
3. Check:
   - [ ] Animations still work but instant
   - [ ] No motion sickness triggers
   - [ ] Content still accessible

---

## 🔍 Browser Compatibility

Test in each browser:

### Chrome/Edge
- [ ] All animations smooth
- [ ] Backdrop filter works
- [ ] Grid layouts correct

### Firefox
- [ ] CSS custom properties work
- [ ] Flexbox/Grid layouts match
- [ ] Font rendering acceptable

### Safari
- [ ] Webkit prefixes applied
- [ ] Backdrop filter works
- [ ] iOS Safari (if available)

---

## ⚡ Performance Testing

### Load Time

1. Open DevTools Network tab
2. Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
3. Check:
   - [ ] Page interactive < 2s
   - [ ] No render-blocking resources
   - [ ] Fonts load without FOUT

### Animation Performance

1. Open DevTools Performance tab
2. Record while interacting
3. Check:
   - [ ] 60fps during animations
   - [ ] No layout thrashing
   - [ ] Smooth scroll

### Bundle Size

1. Build production version
2. Check:
   - [ ] CSS < 100KB (gzipped)
   - [ ] JS bundles reasonable size
   - [ ] Assets optimized

---

## 🐛 Common Issues to Watch For

### Layout
- [ ] No horizontal scroll on any view
- [ ] Cards don't overflow containers
- [ ] Text doesn't wrap awkwardly
- [ ] Images maintain aspect ratio

### Animations
- [ ] No janky/stuttering motion
- [ ] Stagger delays working correctly
- [ ] Hover states instant (<200ms)
- [ ] Loading states clear

### Forms
- [ ] Validation messages clear
- [ ] Submit disabled when invalid
- [ ] Success/error feedback visible
- [ ] Inputs accessible via keyboard

### Data
- [ ] Numbers formatted correctly
- [ ] Dates localized properly
- [ ] Currency symbols shown
- [ ] Empty states handled

---

## ✨ Polish Details to Verify

### Micro-interactions
- [ ] Button press has scale(0.98) feedback
- [ ] Inputs have focus ring
- [ ] Checkboxes animate on toggle
- [ ] Tooltips appear on hover (if applicable)

### Loading States
- [ ] Skeleton loaders while fetching
- [ ] Spinners for actions
- [ ] Disabled states clear
- [ ] Progress indicators accurate

### Transitions
- [ ] Page changes smooth
- [ ] Modal open/close clean
- [ ] Tab switches instant
- [ ] Scroll smooth (if smooth scroll enabled)

---

## 📊 Final Sign-Off Checklist

Before declaring complete:

### Visual
- [ ] All 8 core views tested
- [ ] Responsive on 3 screen sizes
- [ ] RTL mode tested (if applicable)
- [ ] Dark mode tested (if applicable)
- [ ] Print styles checked (if applicable)

### Functional
- [ ] All interactions work
- [ ] Forms validate properly
- [ ] Navigation works
- [ ] Data persists correctly
- [ ] Error handling graceful

### Performance
- [ ] Lighthouse score > 90
- [ ] No console errors
- [ ] Animations smooth
- [ ] Load time acceptable

### Accessibility
- [ ] WCAG AA compliance
- [ ] Keyboard navigation works
- [ ] Screen reader tested
- [ ] Reduced motion respected

---

## 🎬 Demo Recording Checklist

If recording a demo video:

1. **Setup**: Clean browser, no extensions visible
2. **Resolution**: 1920x1080 or 1280x720
3. **Pacing**: Slow enough to see animations
4. **Narration**: Explain what you're showing
5. **Highlights**: Focus on premium features

**Suggested Flow**:
1. Dashboard → show KPI animation
2. Services → table hover + modal
3. Price List → simulator + sticky bar
4. Settings → nav scroll
5. Consumables → grid toggle
6. Subscription → status card
7. Case Tracker → metrics update
8. Chair Cost → full cinematic sequence

---

**Total Testing Time**: ~30-45 minutes for thorough check  
**Quick Check**: ~10 minutes for critical paths only

Good luck! 🚀
