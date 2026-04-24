---
name: Ethereal Overlay
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c4c7c8'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c6c6c7'
  primary: '#ffffff'
  on-primary: '#2f3131'
  primary-container: '#e2e2e2'
  on-primary-container: '#636565'
  inverse-primary: '#5d5f5f'
  secondary: '#c7c6c6'
  on-secondary: '#2f3131'
  secondary-container: '#484949'
  on-secondary-container: '#b8b8b8'
  tertiary: '#ffffff'
  on-tertiary: '#313030'
  tertiary-container: '#e5e2e1'
  on-tertiary-container: '#656464'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c7'
  on-primary-fixed: '#1a1c1c'
  on-primary-fixed-variant: '#454747'
  secondary-fixed: '#e3e2e2'
  secondary-fixed-dim: '#c7c6c6'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#464747'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474746'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display:
    fontFamily: Manrope
    fontSize: 42px
    fontWeight: '200'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h1:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '300'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  dialogue:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '300'
    lineHeight: '1.8'
    letterSpacing: 0.01em
  body-sm:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0.02em
  label-caps:
    fontFamily: Manrope
    fontSize: 11px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.2em
spacing:
  unit: 4px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  safe-margin: 64px
---

## Brand & Style

This design system is built on the philosophy of "The Invisible Interface." It serves as a sophisticated, hyper-minimalist framework designed specifically for visual novels where the narrative and artwork must remain the focal points. The personality is quiet, intellectual, and clinical, removing all unnecessary visual noise to create a sense of calm and focus.

The style draws heavily from extreme minimalism and Swiss International Style, utilizing high-precision alignment and intentional whitespace. It rejects the "gamified" aesthetics of traditional visual novels—such as heavy bevels, glowing buttons, and ornate frames—in favor of a utilitarian elegance. The UI acts as a thin, translucent veil between the reader and the story, appearing only when needed and receding into the background during moments of immersion.

## Colors

The palette is strictly achromatic to ensure absolute neutrality against varying background art. The primary focus is on deep blacks and a range of functional grays.

- **Backgrounds:** Use a near-pure black (#050505) for high-contrast moments or solid menus.
- **Surfaces:** UI panels use semi-transparent layers. These should not use heavy blurs; instead, they rely on low-opacity fills to suggest a physical presence without obscuring the artwork entirely.
- **Accents:** White is used exclusively for active states and critical text. Soft grays are used for secondary information and inactive elements.
- **Lines:** All structural divisions use a faint gray (#FFFFFF at 10-15% opacity) to maintain a "hairline" aesthetic.

## Typography

Typography is the primary structural element of this design system. We use **Manrope** for its balanced, modern geometric forms and excellent legibility at light weights.

The hierarchy is strictly controlled. Dialogue text uses a light weight (300) with generous line height (1.8) to ensure readability and a "literary" feel. UI labels and navigation elements are often set in small-caps with increased letter spacing to differentiate them from the narrative prose. Avoid bold weights entirely; hierarchy should be established through scale, spacing, and opacity rather than thickness.

## Layout & Spacing

The layout follows a fluid model with extreme "safe-area" margins. Content is rarely pushed to the edges of the screen, creating a focused central column or specific anchored zones that feel intentional.

- **Margins:** A minimum safe margin of 64px (or 5% of screen width) is maintained on all sides.
- **Rhythm:** A 4px baseline grid governs all vertical spacing.
- **Dialogue Placement:** The dialogue box should not be a "box" in the traditional sense, but a floating zone defined by its alignment to the bottom or side margins.
- **Whitespace:** Use whitespace aggressively to separate UI controls from the narrative. Elements should feel like they have room to "breathe" on top of the background art.

## Elevation & Depth

This design system avoids all traditional depth markers like drop shadows or inner glows. Depth is communicated through:

1.  **Opacity Stacking:** Surfaces are created by layering semi-transparent fills. A secondary panel is slightly more opaque than the primary background.
2.  **Hairline Borders:** 0.5px or 1px lines define the boundaries of interactive zones. These lines should be low-contrast (e.g., white at 15% opacity).
3.  **Backdrop Filtering:** While heavy blurring is discouraged, a very subtle saturation or brightness shift can be applied to the background behind an active UI overlay to ensure text remains legible without creating a "frosted glass" look.

## Shapes

The shape language is strictly architectural and sharp. We use **0px corner radius** (Sharp) for all elements. 

The use of right angles reinforces the "framework" feel of the interface, making it look like a precise technical overlay. This sharpness provides a clean contrast to the organic shapes typically found in character illustrations. Interactive elements are defined by rectangular outlines or simple underlines rather than rounded buttons.

## Components

### Dialogue Interface
The dialogue container is a full-width or centered-width overlay with no top or side borders. It is defined only by a single 0.5px horizontal line at the top and a subtle 20% black wash behind the text. The character name is placed above the text in `label-caps`.

### Buttons & Inputs
Interactive elements are "Ghost" style. They consist of text only or text contained within a 1px border.
- **Normal:** Text in silver/gray.
- **Hover/Active:** Text shifts to pure white; the hairline border (if present) increases in opacity. 
- **Transitions:** All state changes must be instant or use a very fast (100ms) linear fade.

### Navigation / Menus
Menus should feel like an architectural blueprint. Use vertical lists with generous padding (`24px` per item). Separate items with full-width 0.5px lines.

### Choice Elements
In-game choices are presented as centered vertical stacks. Each choice is separated by significant whitespace (`16px` to `24px`) and uses a simple hairline box that only appears on hover.

### Progress Indicators
Save slots and progress bars use simple, thin horizontal lines. A "Save Slot" is a simple rectangle with a 1px border, containing a timestamp in `label-caps` and a low-opacity thumbnail.