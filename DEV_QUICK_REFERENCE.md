# 🎨 Developer Quick Reference - Premium Design System

## 🎯 Quick Copy-Paste Components

### PageHeader
```vue
<PageHeader
  :title="isAr ? 'العنوان' : 'Title'"
  :subtitle="isAr ? 'وصف' : 'Description'"
  icon="Icon Name"
  :gradient="false"
>
  <template #actions>
    <DpcBtn variant="teal">Action</DpcBtn>
    <LangSwitch />
  </template>
</PageHeader>
```

### AlertBanner
```vue
<AlertBanner
  variant="success"
  :title="isAr ? 'نجح!' : 'Success!'"
  :message="isAr ? 'تم الحفظ' : 'Saved successfully'"
  :dismissible="true"
  @dismiss="showAlert = false"
/>
```
**Variants**: `info` | `success` | `warning` | `danger`

### SectionCard (dpc-panel)
```vue
<div class="dpc-panel">
  <div class="mini-eyebrow">
    <DpcIcon name="Settings" :size="11" :stroke-width="2" />
    {{ isAr ? 'عنوان' : 'Title' }}
  </div>
  <!-- Content -->
</div>
```

### Buttons
```vue
<!-- Primary Teal -->
<DpcBtn variant="teal" icon="Plus" @click="handleClick">
  {{ isAr ? 'إضافة' : 'Add New' }}
</DpcBtn>

<!-- Outline -->
<DpcBtn variant="outline" icon="Edit">
  {{ isAr ? 'تعديل' : 'Edit' }}
</DpcBtn>

<!-- Ghost -->
<DpcBtn variant="ghost" icon="X" size="sm" square />

<!-- Danger -->
<DpcBtn variant="danger" icon="Trash2">
  {{ isAr ? 'حذف' : 'Delete' }}
</DpcBtn>

<!-- Loading State -->
<DpcBtn variant="teal" :disabled="saving">
  <DpcIcon v-if="saving" name="Loader" class="animate-spin" />
  {{ saving ? 'Saving...' : 'Save' }}
</DpcBtn>
```

---

## 🎨 CSS Class Utilities

### Animations
```html
<!-- Fade in with upward motion -->
<div class="animate-fade-in-up" style="animation-delay: var(--stagger-1)">
  Content
</div>

<!-- Scale entrance -->
<div class="animate-scale-in" style="animation-delay: var(--stagger-2)">
  Card
</div>

<!-- Slide from left -->
<div class="animate-slide-in">
  Panel
</div>

<!-- Hover lift effect -->
<div class="hover-lift">
  Hoverable Card
</div>
```

### Stagger Delays
```css
--stagger-1: 0.1s
--stagger-2: 0.2s
--stagger-3: 0.3s
--stagger-4: 0.4s
--stagger-5: 0.5s
```

### Typography
```html
<!-- Numeric values (tabular monospace) -->
<span class="dpc-num">1,234.56</span>

<!-- Eyebrow label -->
<div class="mini-eyebrow">
  <DpcIcon name="Info" :size="11" />
  Label Text
</div>

<!-- Gradient text -->
<h1 class="text-gradient-teal">Premium Title</h1>
```

---

## 🎨 Design Tokens

### Colors
```css
/* Primary */
--teal-50:  #f0fdfa
--teal-100: #ccfbf1
--teal-600: #0d9488  /* Primary CTA */
--teal-700: #0f766e
--teal-800: #115e59

/* Neutral */
--ink-400:  #a8a29e
--ink-500:  #78716c
--ink-600:  #57534e
--ink-700:  #44403c
--ink-900:  #1a1714  /* Primary text */

/* Surfaces */
--paper:    #fefdfb  /* Main background */
--surface:  #faf9f7  /* Card background */
--paper-2:  #f5f4f2  /* Hover states */
--line:     #e7e5e4  /* Borders */

/* Status */
--success-600: #16a34a
--warning-600: #d97706
--danger-600:  #dc2626
```

### Spacing
```css
--space-xs:  4px
--space-sm:  8px
--space-md:  12px
--space-lg:  16px
--space-xl:  24px
--space-2xl: 32px
```

### Radius
```css
--radius-sm:   6px
--radius-md:   10px
--radius-lg:   14px
--radius-full: 999px
```

### Shadows
```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05)
--shadow-md: 0 4px 12px rgba(0,0,0,0.08)
--shadow-lg: 0 12px 32px rgba(0,0,0,0.12)
```

### Easing
```css
--ease-out-expo:  cubic-bezier(0.16, 1, 0.3, 1)
--ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1)
--ease-in-out-expo: cubic-bezier(0.87, 0, 0.13, 1)
```

---

## 📊 Common Patterns

### Metric Card
```vue
<div class="metric-card">
  <div class="metric-label">{{ isAr ? 'الإجمالي' : 'Total' }}</div>
  <div class="dpc-num metric-value">{{ fmt(totalValue) }}</div>
  <div class="metric-change metric-positive">
    <DpcIcon name="TrendingUp" :size="12" />
    +12%
  </div>
</div>
```

```css
.metric-card {
  padding: 16px;
  border-radius: var(--radius-md);
  background: var(--surface);
  box-shadow: inset 0 0 0 1px var(--line);
  transition: all 0.2s var(--ease-out-expo);
}
.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: inset 0 0 0 1px var(--line), 0 4px 12px rgba(0,0,0,0.06);
}
.metric-label {
  font-size: 11px;
  text-transform: uppercase;
  color: var(--ink-500);
  margin-bottom: 4px;
}
.metric-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--ink-900);
}
```

### Loading Skeleton
```html
<div class="skeleton" style="width: 200px; height: 20px; margin-bottom: 8px"></div>
<div class="skeleton" style="width: 150px; height: 20px;"></div>
```

### Empty State
```vue
<div class="empty-state">
  <DpcIcon :name="icon" :size="48" class="empty-icon" />
  <h3 class="empty-title">{{ isAr ? 'لا توجد بيانات' : 'No data yet' }}</h3>
  <p class="empty-text">{{ isAr ? 'ابدأ بإضافة عنصر' : 'Start by adding an item' }}</p>
  <DpcBtn variant="teal" icon="Plus" @click="openAddModal">
    {{ isAr ? 'إضافة' : 'Add New' }}
  </DpcBtn>
</div>
```

```css
.empty-state {
  text-align: center;
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.empty-icon {
  color: var(--ink-300);
  opacity: 0.5;
}
.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--ink-700);
}
.empty-text {
  font-size: 14px;
  color: var(--ink-500);
  max-width: 300px;
}
```

### Modal
```vue
<div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
  <div class="modal-box animate-scale-in">
    <div class="modal-header">
      <h2 class="modal-title">{{ isAr ? 'عنوان' : 'Title' }}</h2>
      <DpcBtn variant="ghost" size="xs" square icon="X" @click="showModal = false" />
    </div>
    <div class="modal-body">
      <!-- Content -->
    </div>
    <div class="modal-footer">
      <DpcBtn variant="outline" @click="showModal = false">
        {{ isAr ? 'إلغاء' : 'Cancel' }}
      </DpcBtn>
      <DpcBtn variant="teal" @click="handleSave">
        {{ isAr ? 'حفظ' : 'Save' }}
      </DpcBtn>
    </div>
  </div>
</div>
```

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  z-index: 100;
}
.modal-box {
  background: var(--surface);
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.modal-header {
  padding: 20px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--line);
}
.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}
.modal-footer {
  padding: 16px 24px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  border-top: 1px solid var(--line);
}
```

### Toast Notification
```javascript
// Using a toast library (example)
toast.success('Settings saved!', { duration: 3000 })
toast.error('Failed to save', { duration: 5000 })
toast.info('New update available')
```

---

## 🎯 Form Patterns

### Form Field
```vue
<div class="form-group">
  <label class="form-label" :for="fieldId">
    {{ isAr ? 'العنوان' : 'Label' }}
    <span v-if="required" class="text-danger">*</span>
  </label>
  <input
    :id="fieldId"
    v-model="value"
    type="text"
    class="form-input"
    :class="{ 'input-error': hasError }"
    :placeholder="isAr ? 'أدخل القيمة' : 'Enter value'"
  />
  <span v-if="hasError" class="form-error">
    {{ errorMessage }}
  </span>
</div>
```

```css
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}
.form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-700);
}
.form-input {
  height: 40px;
  padding: 0 12px;
  border-radius: var(--radius-md);
  background: var(--surface);
  border: 1px solid var(--line);
  font-size: 14px;
  transition: all 0.2s var(--ease-out-expo);
}
.form-input:focus {
  outline: none;
  border-color: var(--teal-600);
  box-shadow: 0 0 0 3px var(--teal-100);
}
.input-error {
  border-color: var(--danger-600);
}
.input-error:focus {
  box-shadow: 0 0 0 3px var(--danger-100);
}
.form-error {
  font-size: 12px;
  color: var(--danger-700);
}
```

### Select Dropdown
```vue
<select v-model="selected" class="form-select">
  <option value="">{{ isAr ? 'اختر' : 'Select' }}</option>
  <option v-for="option in options" :key="option.value" :value="option.value">
    {{ isAr ? option.labelAr : option.label }}
  </option>
</select>
```

### Checkbox
```vue
<label class="checkbox-label">
  <input type="checkbox" v-model="checked" class="checkbox-input" />
  <span class="checkbox-text">{{ isAr ? 'موافق' : 'I agree' }}</span>
</label>
```

---

## 📱 Responsive Utilities

### Breakpoints
```css
/* Mobile first approach */
@media (min-width: 640px) {  /* sm */}
@media (min-width: 768px) {  /* md */}
@media (min-width: 1024px) { /* lg */}
@media (min-width: 1280px) { /* xl */}
```

### Grid Layouts
```css
/* Responsive card grid */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 18px;
}

/* 2-column to 1-column */
.two-col-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
@media (max-width: 768px) {
  .two-col-grid {
    grid-template-columns: 1fr;
  }
}
```

---

## ♿ Accessibility Helpers

### Focus States
```css
/* Use focus-visible for better UX */
.interactive-element:focus-visible {
  outline: 2px solid var(--teal-600);
  outline-offset: 2px;
}
```

### ARIA Labels
```vue
<!-- Icon button -->
<DpcBtn
  variant="ghost"
  square
  icon="Trash2"
  :aria-label="isAr ? 'حذف' : 'Delete'"
  @click="handleDelete"
/>

<!-- Status badge -->
<span :aria-label="isAr ? 'نشط' : 'Active'" class="status-badge">
  <DpcIcon name="CheckCircle" />
</span>
```

### Screen Reader Only
```html
<span class="sr-only">Additional context for screen readers</span>
```

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
  border: 0;
}
```

---

## 🔧 JavaScript Helpers

### Format Number
```javascript
function fmt(n) {
  return Number(n || 0).toLocaleString('en-US', {
    maximumFractionDigits: 2
  })
}
```

### Format Currency
```javascript
function fmtCurrency(n, currency = 'EGP') {
  return Number(n || 0).toLocaleString('en-US', {
    maximumFractionDigits: 0
  }) + ' ' + currency
}
```

### Debounce
```javascript
function debounce(fn, delay = 300) {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  }
}
```

### Count Up Animation
```javascript
import { ref } from 'vue'

function useCountUp(target, duration = 1200) {
  const displayValue = ref(0)
  
  function start() {
    const startTime = Date.now()
    const startValue = 0
    const endValue = target.value
    
    function update() {
      const now = Date.now()
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function
      const eased = 1 - Math.pow(1 - progress, 3)
      
      displayValue.value = Math.floor(startValue + (endValue - startValue) * eased)
      
      if (progress < 1) {
        requestAnimationFrame(update)
      }
    }
    
    requestAnimationFrame(update)
  }
  
  return { displayValue, start }
}
```

---

## 📋 Checklist Before Committing

### Code Quality
- [ ] No console.log statements
- [ ] No hardcoded strings (use i18n)
- [ ] No hardcoded colors (use CSS vars)
- [ ] Components properly typed (if using TypeScript)
- [ ] Props validated

### Accessibility
- [ ] Keyboard navigation works
- [ ] Focus states visible
- [ ] ARIA labels on icons
- [ ] Color contrast checked
- [ ] Screen reader tested (if critical feature)

### Performance
- [ ] No unnecessary re-renders
- [ ] Large lists virtualized (if applicable)
- [ ] Images optimized
- [ ] Animations use transform/opacity only

### Responsive
- [ ] Tested on mobile (375px)
- [ ] Tested on tablet (768px)
- [ ] Tested on desktop (1440px)
- [ ] No horizontal scroll

### Browser
- [ ] Tested in Chrome
- [ ] Tested in Firefox
- [ ] Tested in Safari (if available)

---

## 🎨 Design Review Checklist

Before marking a view as "complete":

- [ ] Uses PageHeader component
- [ ] Has proper animations (fade-in-up with stagger)
- [ ] All buttons have hover states
- [ ] Loading states implemented
- [ ] Empty states handled
- [ ] Error states handled
- [ ] RTL support works
- [ ] Mobile responsive
- [ ] Keyboard accessible
- [ ] Matches design system colors/spacing
- [ ] No layout shift on load
- [ ] Smooth scrolling (if applicable)

---

## 📚 Resources

- **Component Reference**: `/frontend/src/components/`
- **Design Tokens**: `/static/css/tokens.css`
- **Global Styles**: `/static/css/style.css`
- **Icons**: Lucide React (https://lucide.dev)
- **Fonts**: Inter (headings), IBM Plex Mono (numbers)

---

## 💡 Pro Tips

1. **Always use design tokens** - Never hardcode colors
2. **Stagger entrance animations** - Creates polish
3. **Hover states everywhere** - Feedback is key
4. **Loading states** - Prevent user confusion
5. **Empty states** - Guide users what to do next
6. **Error handling** - Show clear messages
7. **Keyboard shortcuts** - Power users love them
8. **RTL support** - Test both directions
9. **Mobile first** - Design for small screens
10. **Performance** - 60fps animations, fast loads

---

**Quick Help**: For questions, check the full design demo at `PREMIUM_DESIGN_DEMO.md`
