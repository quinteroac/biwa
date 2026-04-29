---
name: Manga Editor’s Sketchbook
colors:
  surface: '#F2EFE8'
  surface-dim: '#dbdad5'
  surface-bright: '#F2EFE8'
  surface-container-lowest: '#F2EFE8'
  surface-container-low: '#f5f3ee'
  surface-container: '#f0eee9'
  surface-container-high: '#eae8e3'
  surface-container-highest: '#e4e2dd'
  on-surface: '#1b1c19'
  on-surface-variant: '#444748'
  inverse-surface: '#30312e'
  inverse-on-surface: '#f2f1ec'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#F2EFE8'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#346288'
  on-secondary: '#F2EFE8'
  secondary-container: '#a7d3fe'
  on-secondary-container: '#2d5c81'
  tertiary: '#000000'
  on-tertiary: '#F2EFE8'
  tertiary-container: '#410005'
  on-tertiary-container: '#ec4849'
  error: '#ba1a1a'
  on-error: '#F2EFE8'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474746'
  secondary-fixed: '#cde5ff'
  secondary-fixed-dim: '#9fcbf6'
  on-secondary-fixed: '#001d32'
  on-secondary-fixed-variant: '#184a6e'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ae'
  on-tertiary-fixed: '#410005'
  on-tertiary-fixed-variant: '#930015'
  background: '#F2EFE8'
  on-background: '#1b1c19'
  surface-variant: '#e4e2dd'
  story-explorer-active: '#346288'
  story-explorer-active-soft: '#cde5ff'
  story-explorer-hover: '#eae8e3'
  story-explorer-status: '#b7b9b9'
  story-explorer-menu-shadow: '#c4c7c7'
typography:
  headline-xl:
    fontFamily: Newsreader
    fontSize: 50px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Newsreader
    fontSize: 38px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Newsreader
    fontSize: 29px
    fontWeight: '600'
    lineHeight: '1.2'
  body-lg:
    fontFamily: Newsreader
    fontSize: 22px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Newsreader
    fontSize: 19px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 17px
    fontWeight: '500'
    lineHeight: '1.4'
  note-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.4'
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 24px
  margin: 32px
storyExplorer:
  headerHeight: 64px
  rowHeight: 44px
  activeRailWidth: 3px
  actionSize: 36px
  statusDotSize: 10px
  countBadgeMinWidth: 28px
---

## Brand & Style

This design system is built to feel like an extension of the creator's desk—a tactile, organic space where the digital and physical intersect. It targets creators who view their work through the lens of traditional manga production, prioritizing a sense of craft over clinical digital efficiency.

The visual style is a hybrid of **Tactile/Skeuomorphism** and **Brutalism**. It avoids the polished gradients and perfect circles of modern SaaS, instead embracing the "wabi-sabi" of an editor's proofs: irregular ink lines, paper tooth, and the occasional stamp of a red editorial seal. The goal is to evoke the excitement of a new sketchbook—inviting, non-intimidating, and deeply creative.

## Colors

The palette is rooted in the materials of the trade. The foundation is "Background Paper," a warm, slightly off-white that reduces eye strain compared to pure digital white. "Ink Black" is the primary driver for all structural elements, text, and borders, mimicking various weights of fineliners and G-pens.

Accent colors are used sparingly as "functional annotations":
- **Pencil Blue:** Used for non-destructive actions, helpful hints, and drafting states (e.g., active tab indicators or hover states).
- **Editorial Red:** Reserved for critical errors, alerts, and destructive actions—mimicking an editor's red pen corrections.
- **Washes:** Light grey washes are used for secondary button fills, resembling diluted ink or marker shading.

## Typography

This design system uses a dual-type approach. **Newsreader** provides the "Editorial" voice—used for headings and main body content to evoke the feel of a printed tankobon volume. It feels authoritative yet literary.

**Plus Jakarta Sans** serves as the "Functional" voice. Its clean, modern curves provide a necessary digital contrast, used for labels, navigation, and technical metadata. While a true handwritten font is reserved for specific decorative "notes," the clean sans-serif handles the heavy lifting of legibility in complex studio interfaces. Headlines should utilize tighter letter-spacing to feel like tight-set book titles.

## Layout & Spacing

The layout philosophy follows a **Fixed Grid** model reminiscent of a comic page layout. Content is organized into "Panels" rather than standard cards. 

The vertical rhythm is tight, but the system allows for significant "White Space" (or "Paper Space") between major sections to let the design breathe. Gutters should be generous to allow the "hand-drawn" borders of panels to vary slightly without overlapping. Containers should feel grounded, often aligned to a sturdy 12-column grid but with internal margins that feel slightly asymmetrical, mimicking a person working on a physical page.

## Elevation & Depth

Depth is conveyed through **Tonal Layering** and physical metaphors rather than soft shadows.
- **The Desk (Level 0):** The base background, featuring the subtle paper grain texture.
- **The Sheet (Level 1):** Main content areas, defined by a 1px "Ink Line" border.
- **Stickers and Post-its (Level 2):** Floating elements like popovers or tooltips. Instead of shadows, these use a thicker "Ink Stroke" on the bottom-right edge to simulate a "hard shadow" or a stacked paper effect.

Avoid using blur or transparency. If an element needs to stand out, use a "Screentone" pattern (dot-matrix) fill or a subtle wash of "Pencil Blue" to highlight the active area.

## Shapes

The shape language is strictly **Sharp (0px roundedness)** to mimic cut paper and ruled lines. However, to maintain the organic feel, the *lines themselves* should not be perfectly straight. 

Apply a `path-mask` or `border-image` to all standard containers to create a slightly "jittered" or "wobbly" ink line effect. Buttons follow the same rule, appearing as hand-drawn rectangles or circles that don't quite close perfectly. Icons must be stroke-based, appearing as if sketched with a 0.5mm technical pen.

## Components

- **Buttons:** Designed to look like "Ink Stamps." Primary buttons have a solid Ink Black fill with knocked-out Paper White text. Secondary buttons are outlined with a hand-drawn stroke. Hover states involve a slight "offset" of the background color, mimicking an imperfect double-stamp.
- **Panels (Cards):** These are the building blocks of the UI. Each panel is enclosed in a slightly irregular ink border. Header areas within panels are separated by a "Hand-drawn Divider"—a line that looks like it was drawn with a ruler but has slight pressure variations.
- **Inputs:** Simple bottom-borders (underline style) rather than full boxes, resembling a blank line in a form. Labels sit above in the Note-sm typography style.
- **Screentone Chips:** Status indicators or tags use "Manga Screentone" (half-tone dots) as a background fill instead of solid colors.
- **Editorial Seals:** Large "Red Stamp" components for status like "APPROVED" or "DRAFT," placed at an angle over content.
- **Sketch Icons:** All icons must have a "rough" quality. No perfect circles or perfectly parallel lines.

## Studio Story Explorer

The Story file explorer follows the same paper-panel language as the Studio while prioritizing fast authoring. It uses a compact header with direct file and folder creation, a ruled search field with a visible filter affordance, collapsible locale folders, inline `ink` type labels, and small status dots for active or modified files.

Folder counts use small outlined badges so creators can scan localization coverage quickly. Active files use a Pencil Blue rail and dot; modified files use the neutral status dot. Contextual actions live behind a three-dot control and render as a Level 2 paper popover with hard-edged depth rather than blur.
