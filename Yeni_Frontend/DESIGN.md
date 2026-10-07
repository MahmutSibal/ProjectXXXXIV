---
name: Emerald & Brass Enterprise
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#404943'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#717973'
  outline-variant: '#c0c9c1'
  surface-tint: '#356850'
  primary: '#002819'
  on-primary: '#ffffff'
  primary-container: '#06402b'
  on-primary-container: '#77ac90'
  inverse-primary: '#9cd2b5'
  secondary: '#735c00'
  on-secondary: '#ffffff'
  secondary-container: '#fed65b'
  on-secondary-container: '#745c00'
  tertiary: '#222222'
  on-tertiary: '#ffffff'
  tertiary-container: '#383737'
  on-tertiary-container: '#a2a0a0'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b8efd0'
  primary-fixed-dim: '#9cd2b5'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#1b503a'
  secondary-fixed: '#ffe088'
  secondary-fixed-dim: '#e9c349'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474746'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  headline-xl:
    fontFamily: Montserrat
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Montserrat
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 14px
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

The design system is a premium, enterprise-grade framework tailored for high-end restaurant automation. It balances the hospitality industry's warmth with the precision of a robust SaaS platform. The aesthetic is **Corporate Modern with Minimalist influences**, emphasizing organizational clarity, prestige, and efficiency.

The visual narrative centers on "Quiet Luxury"—avoiding excessive ornamentation in favor of perfect alignment, generous white space, and a high-contrast palette. It aims to evoke an emotional response of total control and professional reliability, ensuring that restaurant operators feel supported by a world-class institutional tool.

## Colors

This design system utilizes a high-contrast, prestigious palette derived from classical hospitality motifs.

- **Primary (Emerald):** Used for primary actions, sidebar backgrounds, and key brand moments. It represents stability and growth.
- **Secondary (Brass):** Reserved for accentuation—specialized status badges, active states in navigation, and subtle borders. It should be used sparingly to maintain its premium impact.
- **Neutrals:** A hierarchy of grays facilitates deep information density without clutter. The off-white background (#F8F9FA) reduces eye strain, while the pure white surfaces (#FFFFFF) define the functional "cards" of the interface.
- **Semantic Colors:** Success (Emerald-adjacent), Warning (Amber), and Error (Deep Red) should follow standard accessibility ratios while maintaining the desaturated, professional tone of the system.

## Typography

The typography strategy pairs **Montserrat** for headings and **Inter** for UI and body text. Montserrat provides a geometric, confident architectural feel, while Inter ensures maximum legibility for complex data tables and automation settings.

- **Headlines:** Use Montserrat for all titles. Large titles should use tighter letter-spacing to feel more "editorial."
- **Data & Body:** Use Inter for its high X-height and neutral character. It is the workhorse of the dashboard.
- **Labels:** Small labels and "Overlines" should use Inter SemiBold with a slight increase in letter spacing for clear categorization.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. The sidebar remains fixed at 280px, while the main content area utilizes a fluid 12-column grid to maximize the visibility of data visualizations and restaurant floor plans.

- **Grid:** 12 columns with 24px gutters.
- **Breathing Room:** This system prioritizes generous padding (Minimum 24px for card containers) to prevent the "data-heavy" feel common in legacy enterprise software.
- **Vertical Rhythm:** Elements are spaced in multiples of 8px. Use 40px or 64px gaps between major sections to maintain a sense of calm and hierarchy.

## Elevation & Depth

Hierarchy is established through **Ambient Shadows** and **Tonal Layering**. 

The background is a flat light gray (#F8F9FA). Functional units (cards) are pure white (#FFFFFF) with a very soft, diffused shadow: `0px 4px 20px rgba(0, 0, 0, 0.05)`. 

For overlays like modals or dropdowns, the shadow depth increases to `0px 12px 32px rgba(0, 0, 0, 0.1)`, creating a clear physical separation from the base dashboard layer. Avoid heavy borders; instead, use a subtle 1px border (#E9ECEF) to define edges when white-on-white surfaces meet.

## Shapes

The design system employs a **Rounded** shape language to soften the corporate aesthetic and make the application feel modern and approachable.

- **Components:** Buttons, input fields, and small chips use a 0.5rem (8px) radius.
- **Containers:** Dashboard cards and modal windows use 1rem (16px) to emphasize their role as structural anchors.
- **Interactive Elements:** Active indicators (e.g., the selection bar in the sidebar) should use a fully rounded "pill" on one side to indicate direction and focus.

## Components

### Buttons
- **Primary:** Solid Emerald (#06402B) with White text. Bold, 8px corners.
- **Secondary/Outline:** 1px Brass (#D4AF37) border with Brass text. Used for secondary actions.
- **Ghost:** No background, Emerald text. Used for tertiary actions or "Cancel" buttons.

### Input Fields
- White background with a 1px #E9ECEF border. On focus, the border transitions to a 2px Emerald stroke with a soft green outer glow.

### Cards
- Pure white, 16px corner radius, subtle shadow. Cards should always have a 24px internal padding.

### Lists & Tables
- Table headers use `label-md` style with a light gray background. Rows should have a subtle hover state (#F1F3F5) and a thin bottom border to maintain horizontal scanning.

### Chips & Status Indicators
- Use the Secondary Brass (#D4AF37) for "Premium" or "Active" statuses. Use Emerald for "Completed" or "Healthy" metrics. Chips should have a 4px corner radius.