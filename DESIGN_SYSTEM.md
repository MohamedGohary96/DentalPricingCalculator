# Dental Pricing Calculator - Design System v2.0

## Overview

This design system provides a comprehensive set of design tokens, components, and guidelines for building consistent, accessible, and performant user interfaces.

---

## Typography

### Font Families

| Token | Value | Usage |
|-------|-------|-------|
| `--font-sans` | Rubik, IBM Plex Sans Arabic | Body text |
| `--font-heading` | Poppins, IBM Plex Sans Arabic | Headings |
| `--font-mono` | IBM Plex Mono | Numbers, code |
| `--font-arabic` | IBM Plex Sans Arabic | Arabic text |

### Font Scale (Modular Scale 1.25)

| Token | Size | Pixels | Usage |
|-------|------|--------|-------|
| `--text-xs` | 0.75rem | 12px | Captions, badges |
| `--text-sm` | 0.875rem | 14px | Secondary text, labels |
| `--text-base` | 1rem | 16px | Body text |
| `--text-md` | 1.125rem | 18px | Emphasized body |
| `--text-lg` | 1.25rem | 20px | Subheadings |
| `--text-xl` | 1.5rem | 24px | Section headings |
| `--text-2xl` | 1.875rem | 30px | Page titles |
| `--text-3xl` | 2.25rem | 36px | Hero headings |
| `--text-4xl` | 3rem | 48px | Display text |

### Font Weights

| Token | Value |
|-------|-------|
| `--font-normal` | 400 |
| `--font-medium` | 500 |
| `--font-semibold` | 600 |
| `--font-bold` | 700 |

### Line Heights

| Token | Value | Usage |
|-------|-------|-------|
| `--leading-none` | 1 | Display text |
| `--leading-tight` | 1.25 | Headings |
| `--leading-snug` | 1.375 | Subheadings |
| `--leading-normal` | 1.5 | Body text |
| `--leading-relaxed` | 1.625 | Long-form text |
| `--leading-loose` | 1.75 | Spacious text |

---

## Spacing

Based on an 8px grid system with 4px increments.

| Token | Size | Pixels | Usage |
|-------|------|--------|-------|
| `--space-1` | 0.25rem | 4px | Tight spacing |
| `--space-2` | 0.5rem | 8px | Default spacing |
| `--space-3` | 0.75rem | 12px | Medium spacing |
| `--space-4` | 1rem | 16px | Standard spacing |
| `--space-5` | 1.25rem | 20px | Large spacing |
| `--space-6` | 1.5rem | 24px | Section spacing |
| `--space-8` | 2rem | 32px | Container padding |
| `--space-10` | 2.5rem | 40px | Large gaps |
| `--space-12` | 3rem | 48px | Section breaks |
| `--space-16` | 4rem | 64px | Major sections |
| `--space-20` | 5rem | 80px | Hero spacing |
| `--space-24` | 6rem | 96px | Maximum spacing |

---

## Icons

Standardized to three sizes only for consistency:

| Token | Size | Pixels | Usage |
|-------|------|--------|-------|
| `--icon-sm` | 1rem | 16px | Inline icons, small buttons |
| `--icon-md` | 1.25rem | 20px | Default icons, nav items |
| `--icon-lg` | 1.5rem | 24px | Large icons, headers |
| `--icon-xl` | 2rem | 32px | Feature icons |

### Icon Guidelines

- Use consistent stroke width (2px recommended)
- Ensure optical alignment in buttons
- Mirror directional icons for RTL
- Always include `aria-label` for icon-only buttons

---

## Colors

### Primary (Medical Teal)

```css
--primary-50: #ECFEFF;
--primary-100: #CFFAFE;
--primary-200: #A5F3FC;
--primary-300: #67E8F9;
--primary-400: #22D3EE;
--primary-500: #06B6D4;  /* Main brand color */
--primary-600: #0891B2;
--primary-700: #0E7490;
--primary-800: #155E75;
--primary-900: #164E63;
```

### Semantic Colors

| Token | Color | WCAG AA |
|-------|-------|---------|
| `--success-500` | #10B981 | 4.5:1 on white |
| `--warning-500` | #F59E0B | 3.0:1 on white (use 600 for text) |
| `--danger-500` | #EF4444 | 4.5:1 on white |
| `--info-500` | #3B82F6 | 4.5:1 on white |

### Gray Scale

```css
--gray-50: #F8FAFC;   /* Background */
--gray-100: #F1F5F9;  /* Card background */
--gray-200: #E2E8F0;  /* Borders */
--gray-300: #CBD5E1;  /* Disabled borders */
--gray-400: #94A3B8;  /* Placeholder text */
--gray-500: #64748B;  /* Secondary text */
--gray-600: #475569;  /* Body text */
--gray-700: #334155;  /* Labels */
--gray-800: #1E293B;  /* Headings */
--gray-900: #0F172A;  /* High contrast text */
```

---

## Shadows

| Token | Usage |
|-------|-------|
| `--shadow-xs` | Subtle elevation |
| `--shadow-sm` | Card hover |
| `--shadow` | Default cards |
| `--shadow-md` | Active states |
| `--shadow-lg` | Modals |
| `--shadow-xl` | Dropdowns |
| `--shadow-2xl` | Popovers |
| `--shadow-inner` | Input pressed state |

---

## Border Radius

| Token | Size | Usage |
|-------|------|-------|
| `--radius-sm` | 4px | Small elements |
| `--radius` | 8px | Default |
| `--radius-lg` | 12px | Cards |
| `--radius-xl` | 16px | Modals |
| `--radius-2xl` | 24px | Large containers |
| `--radius-full` | 9999px | Pills, avatars |

---

## Transitions

| Token | Duration | Usage |
|-------|----------|-------|
| `--transition-fast` | 150ms | Hover states |
| `--transition-base` | 200ms | Default |
| `--transition-slow` | 300ms | Page transitions |
| `--transition-slower` | 500ms | Complex animations |

---

## Touch Targets

Following WCAG 2.1 guidelines:

| Token | Size | Usage |
|-------|------|-------|
| `--touch-target-min` | 44px | Minimum clickable area |
| `--touch-target-comfortable` | 48px | Comfortable touch area |

---

## Z-Index Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--z-dropdown` | 1000 | Dropdown menus |
| `--z-sticky` | 1020 | Sticky elements |
| `--z-fixed` | 1030 | Fixed headers |
| `--z-modal-backdrop` | 1040 | Modal overlay |
| `--z-modal` | 1050 | Modal dialogs |
| `--z-popover` | 1060 | Popovers |
| `--z-tooltip` | 1070 | Tooltips |
| `--z-toast` | 1080 | Toast notifications |

---

## RTL Support

### Navigation

In RTL mode, nav items display with:
- Text on the LEFT
- Icons on the RIGHT

```css
html[dir="rtl"] .nav-link {
    flex-direction: row-reverse;
}
```

### Form Elements

- Labels: Right-aligned
- Number inputs: Maintain LTR for numerals
- Currency: Symbol after number

---

## Accessibility Checklist

- [x] Keyboard navigation for all interactive elements
- [x] Focus visible indicators (`--focus-ring`)
- [x] Skip links for main content
- [x] ARIA labels on icon-only buttons
- [x] Form field labels properly associated
- [x] Error messages linked to inputs
- [x] Color not sole indicator of state
- [x] Sufficient color contrast (WCAG AA)
- [x] `prefers-reduced-motion` support
- [x] Minimum 44px touch targets

---

## Animation Classes

```css
.animate-fadeIn      /* Fade in */
.animate-fadeInUp    /* Fade in from bottom */
.animate-fadeInDown  /* Fade in from top */
.animate-slideInRight
.animate-slideInLeft
.animate-scaleIn     /* Scale from 95% */
.animate-bounce      /* Bouncing effect */
.animate-pulse       /* Pulsing opacity */
.animate-spin        /* Loading spinner */
```

### Staggered Delays

```css
.animate-delay-1  /* 50ms */
.animate-delay-2  /* 100ms */
.animate-delay-3  /* 150ms */
.animate-delay-4  /* 200ms */
.animate-delay-5  /* 250ms */
```

---

## Utility Classes

### Text
- `.text-xs` through `.text-3xl`
- `.font-normal`, `.font-medium`, `.font-semibold`, `.font-bold`
- `.text-center`, `.text-left`, `.text-right`
- `.text-primary`, `.text-success`, `.text-warning`, `.text-danger`, `.text-muted`

### Layout
- `.flex`, `.inline-flex`, `.grid`, `.hidden`, `.block`
- `.items-center`, `.justify-center`, `.justify-between`
- `.gap-2`, `.gap-4`

### Spacing
- `.m-0`, `.p-0`, `.mt-2`, `.mt-4`, `.mb-2`, `.mb-4`

### Width
- `.w-full`, `.max-w-sm`, `.max-w-md`, `.max-w-lg`, `.max-w-xl`

### Accessibility
- `.sr-only` - Screen reader only
- `.focus-ring` - Enhanced focus styling
- `.truncate` - Text truncation

---

## Best Practices

1. **Use design tokens** - Never hardcode colors or sizes
2. **8px grid** - Align all spacing to the 8px grid
3. **Touch targets** - Minimum 44px for all clickable elements
4. **Progressive enhancement** - Core functionality works without JS
5. **RTL first** - Test Arabic layout alongside English
6. **Performance** - Use `font-display: swap` for web fonts
7. **Animations** - Respect `prefers-reduced-motion`

---

## Version History

- **v2.0** - Complete design system overhaul with 8px grid, standardized icons, accessibility improvements
- **v1.0** - Initial styles
