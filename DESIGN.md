---
name: Framer Void Studio
colors:
  background: '#000000'
  on-background: '#ffffff'
  surface: '#000000'
  surface-dim: '#000000'
  surface-bright: '#090909'
  surface-container-lowest: '#000000'
  surface-container-low: '#050505'
  surface-container: '#090909'
  surface-container-high: '#101010'
  surface-container-highest: '#161616'
  on-surface: '#ffffff'
  on-surface-variant: '#a6a6a6'
  muted: '#a6a6a6'
  tertiary-text: 'rgba(255, 255, 255, 0.6)'
  outline: 'rgba(255, 255, 255, 0.14)'
  outline-variant: 'rgba(255, 255, 255, 0.08)'
  frosted: 'rgba(255, 255, 255, 0.1)'
  frosted-hover: 'rgba(255, 255, 255, 0.5)'
  primary: '#0099ff'
  on-primary: '#ffffff'
  primary-glow: 'rgba(0, 153, 255, 0.15)'
  error: '#ffb4ab'
  on-error: '#000000'
typography:
  display:
    fontFamily: '"GT Walsheim Framer Medium", "GT Walsheim Medium", Inter, system-ui, sans-serif'
    fontSize: 72px
    fontWeight: '500'
    lineHeight: '0.9'
    letterSpacing: -0.055em
  h1:
    fontFamily: '"GT Walsheim Framer Medium", "GT Walsheim Medium", Inter, system-ui, sans-serif'
    fontSize: 42px
    fontWeight: '500'
    lineHeight: '0.98'
    letterSpacing: -0.045em
  h2:
    fontFamily: Inter, -apple-system, system-ui, sans-serif
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  body:
    fontFamily: Inter, -apple-system, system-ui, sans-serif
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.35'
    letterSpacing: -0.01em
  body-readable:
    fontFamily: Inter, -apple-system, system-ui, sans-serif
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0
  label:
    fontFamily: Inter, -apple-system, system-ui, sans-serif
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0
  micro:
    fontFamily: '"Azeret Mono", "SFMono-Regular", Consolas, monospace'
    fontSize: 11px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0
spacing:
  unit: 8px
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  xxl: 64px
  safe-margin: 32px
radius:
  micro: 6px
  card: 12px
  container: 16px
  pill: 999px
---

# Design System Inspired by Framer

This design system adapts Framer's cinematic dark product language to the VN Studio. The Studio is not a marketing page, but it should feel like a tool made by people who care deeply about craft: pure black canvas, product UI as the hero, precise typography, pill-shaped interaction, and one cold electric accent.

The framework and runtime remain the source of truth. The Studio UI should make Ink files, character sheets, scene metadata, plugins and build outputs feel like full-fidelity product surfaces floating in a pure black void.

## 1. Visual Theme & Atmosphere

The primary canvas is pure black (`#000000`). Avoid charcoal, warm grays and brown-tinted dark surfaces. UI panels should feel suspended in space through low-contrast rings, small white edge highlights and occasional Framer Blue focus glows.

The tool itself is the visual centerpiece. Story previews, Monaco, sprite previews, scene thumbnails, plugin cards and build artifacts should read as product screenshots and live demos, not as decorative cards.

**Key Characteristics**

- Pure black (`#000000`) void canvas.
- Framer Blue (`#0099ff`) as the only accent color.
- White primary text and muted silver secondary text.
- Pill-shaped interactive elements with 40px+ radius.
- Frosted controls using `rgba(255, 255, 255, 0.1)` on black.
- Blue ring shadows for focus and active containment.
- Product-forward panels: editor, preview and metadata are the hero art.
- No decorative illustrations, gradient blobs or ornamental imagery.

## 2. Color Palette & Roles

### Primary

- **Void Black** (`#000000`): App background and main canvas.
- **Pure White** (`#ffffff`): Primary text, strong labels, solid button backgrounds.
- **Framer Blue** (`#0099ff`): Focus rings, links, active borders and interactive highlights.

### Secondary

- **Muted Silver** (`#a6a6a6`): Body text, captions, secondary metadata.
- **Ghost White** (`rgba(255, 255, 255, 0.6)`): Placeholder text and tertiary details.
- **Near Black** (`#090909`): Elevated panels and tool surfaces.

### Surfaces

- **Frosted White** (`rgba(255, 255, 255, 0.1)`): Secondary button and toolbar surfaces.
- **Frosted Hover** (`rgba(255, 255, 255, 0.5)`): Hover emphasis, used sparingly.
- **Blue Glow** (`rgba(0, 153, 255, 0.15)`): Ring shadows and focus halos.
- **Hairline** (`rgba(255, 255, 255, 0.14)`): Subtle structure on black.

### Rules

- Do not introduce additional accent colors. Semantic errors may use `#ffb4ab`, but should not become a visual theme.
- Do not use light section backgrounds.
- Do not use large decorative gradients. A very subtle blue radial aura behind a preview is allowed only when it supports focus.

## 3. Typography Rules

### Font Family

- **Display**: `GT Walsheim Framer Medium`, `GT Walsheim Medium`, fallback `Inter`, `system-ui`.
- **Body/UI**: `Inter Variable`, `Inter`, fallback `-apple-system`, `system-ui`.
- **Monospace**: `Azeret Mono`, fallback `SFMono-Regular`, `Consolas`, monospace.

If GT Walsheim or Azeret Mono are not available locally, use the fallback stack without changing spacing rules.

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Use |
| --- | --- | --- | --- | --- | --- | --- |
| Product Display | GT Walsheim | 72px | 500 | 0.9 | -0.055em | Rare top-level Studio identity moments |
| Page Heading | GT Walsheim | 42px | 500 | 0.98 | -0.045em | Project title, major workspace heading |
| Section Heading | GT Walsheim | 32px | 500 | 1.05 | -0.035em | Primary panels and feature sections |
| Card Title | Inter | 24px | 500 | 1.2 | -0.02em | Plugin, project and asset cards |
| UI Heading | Inter | 18px | 600 | 1.2 | -0.02em | Dense tool headings |
| Body | Inter | 15px | 400 | 1.35 | -0.01em | Standard UI copy |
| Body Readable | Inter | 14px | 400 | 1.6 | 0 | Long descriptions and docs preview |
| Label | Inter | 12px | 500 | 1.4 | 0 | Form labels and metadata |
| Micro Code | Azeret Mono | 11px | 400 | 1.6 | 0 | Paths, tags, ids and diagnostics |

### Principles

- Display type should feel compressed and kinetic through negative tracking.
- GT Walsheim stays medium weight (`500`). Do not use bold GT Walsheim.
- Inter should feel refined and precise. Use OpenType features when practical: `cv01`, `cv05`, `cv09`, `cv11`, `ss03`, `ss07`.
- Avoid all-caps letter-spaced labels as the default. Use clean readable labels; reserve uppercase micro text for status or tiny tags.
- Monaco/code areas can keep monospace density, but surrounding UI should follow Inter.

## 4. Component Styling

### Buttons

All interactive buttons are pill-shaped. Avoid squared, sharp or slightly rounded buttons.

- **Solid White Pill**: White background, black text, 999px radius, 40px minimum height.
- **Frosted Pill**: `rgba(255,255,255,0.1)` background, white text, 999px radius.
- **Blue Accent Pill**: Black or near-black fill with Framer Blue border/ring. Use for active filters or primary tool actions.
- **Ghost Pill**: Transparent background, white or muted silver text, hover reveals frosted surface.

Button transitions should be short and tactile: opacity, transform or background color over 120ms-180ms. Press states may scale to `0.98`, not dramatically.

### Cards & Containers

- Studio panels use `#090909` or pure black with a blue-tinted ring: `0 0 0 1px rgba(0,153,255,0.15)`.
- Standard cards use 10px-15px radius. Do not use full pills for cards.
- Elevated cards may use a subtle top highlight plus ambient shadow:
  - `rgba(255,255,255,0.1) 0 0.5px 0 0.5px`
  - `rgba(0,0,0,0.25) 0 10px 30px`
- Avoid cards inside cards. Use full workspace bands and direct panel composition.

### Inputs & Forms

- Inputs use dark backgrounds, white text and subtle hairline borders.
- Focus state uses Framer Blue border/ring.
- Placeholder text uses `rgba(255,255,255,0.4)`.
- Selects, segmented controls and filters should be pill-based when compact.
- Textareas and Monaco frames may keep rectangular containers, but with 12px radius and blue focus treatment.

### Navigation

- The Studio shell uses a dark fixed or persistent navigation area.
- Nav items use Inter at 14px-15px, white or muted silver.
- Active navigation receives a subtle frosted pill or blue ring, not a large color block.
- The current project identity should appear product-forward, with the project title visible in the first viewport.

### Product Previews

- Monaco editor, story preview, sprite preview, scene preview, plugin declarations and build manifests are the visual content.
- Previews should be large enough to inspect. Avoid tiny decorative thumbnails when the user needs to evaluate output.
- Product screenshots/previews use 8px-12px radius and dark-on-dark containment.
- Do not crop important tool content just to create a dramatic composition.

## 5. Layout Principles

### Studio Layout

The Studio is an operational tool, not a landing page. The interface should prioritize scanning, editing and repeated actions.

- Use dense but organized workspaces.
- Keep sidebars predictable and persistent.
- Put editor and preview panes side-by-side on desktop.
- Prefer split panes, toolbars, inspector panels and scrollable lists.
- Avoid hero sections inside the working app.

### Spacing

- Base unit: 8px.
- Common gaps: 8px, 12px, 16px, 24px, 40px.
- Workspace padding: 24px-40px on desktop.
- Section spacing: 40px-64px inside dashboards, not marketing-scale 120px gaps.
- Dense inside panels, spacious between major work areas.

### Grid

- Desktop workspaces may use 3 columns: list, editor, preview/inspector.
- Keep preview panels wide enough for actual inspection.
- Avoid floating cards as page sections.
- Long panels must scroll internally rather than pushing critical controls off-screen.

## 6. Depth & Elevation

| Level | Treatment | Use |
| --- | --- | --- |
| Level 0 | Pure black, no border | App background |
| Level 1 | Blue ring `0 0 0 1px rgba(0,153,255,0.15)` | Panels, cards, active tools |
| Level 2 | Near-black surface plus hairline | Editors, inspectors, modals |
| Level 3 | Top white highlight and ambient shadow | Floating menus, dialogs, dropdowns |

Depth should be subtle. The Studio should feel crisp and precise, not glossy or over-lit.

## 7. Do's And Don'ts

### Do

- Use pure black as the global canvas.
- Use Framer Blue only for interactive accent, focus and active states.
- Make buttons and filter controls pill-shaped.
- Let the product UI be the visual centerpiece.
- Use negative letter-spacing for display headings.
- Keep cards and preview containers softly rounded, not pill-shaped.
- Use blue ring shadows for focus and selected states.
- Keep the Studio ergonomic and tool-like.

### Don't

- Do not use warm dark palettes, beige, brown, slate-blue themes or purple gradients.
- Do not add decorative illustrations, blobs, orbs or marketing art.
- Do not use squared buttons.
- Do not use heavy shadows or bright glows.
- Do not introduce additional accent colors.
- Do not make landing-page heroes inside the Studio app.
- Do not hide real tool output behind tiny thumbnails or atmospheric crops.
- Do not create a proprietary visual format separate from framework contracts.

## 8. Responsive Behavior

### Breakpoints

| Name | Width | Behavior |
| --- | --- | --- |
| Mobile | <809px | Single-column tool stack, persistent project controls, full-width pills |
| Tablet | 809px-1199px | Two-column workspaces where possible, inspectors collapse below |
| Desktop | >1199px | Full list/editor/preview layouts |

### Rules

- Mobile keeps all actions reachable with 40px+ touch targets.
- Toolbars wrap into pill rows instead of shrinking text.
- Editor and preview panes stack vertically on mobile.
- Product previews preserve aspect ratio and remain inspectable.
- Avoid viewport-width font scaling. Define fixed responsive type steps.

## 9. VN Studio Application Rules

### Story

- Monaco is the primary artifact. It should feel like a product screenshot on the black canvas.
- Text preview should be scrollable, inspectable and visually quieter than the editor.
- Ink tags use small pill chips, with active/focus states in Framer Blue.

### Characters

- Sprite preview must show the resolved frame/expression, not the whole spritesheet when an atlas exists.
- Character sheet fields should feel like an inspector, with compact labels and strong grouping.
- Scale and offset controls should be ergonomic and visible near the preview.

### Scenes And Assets

- Scene previews are functional visual artifacts. Do not over-darken, blur or crop them beyond recognition.
- Asset lists use compact rows and larger preview cards only when needed for inspection.

### Plugins

- Plugin cards show capabilities, renderers, Ink tags and compatibility clearly.
- Install/remove actions are pill buttons.
- Official plugins can use config snippets, but the main view should prioritize status and capability scanning.

### Build And Preview

- Build output, manifest data and diagnostics should look like precise product panels.
- Preview iframe/window is the hero artifact of that workspace.

## 10. Agent Prompt Guide

### Quick Reference

- Background: `#000000`
- Text: `#ffffff`
- Secondary text: `#a6a6a6`
- Accent: `#0099ff`
- Frosted surface: `rgba(255,255,255,0.1)`
- Ring: `0 0 0 1px rgba(0,153,255,0.15)`
- Button radius: `999px`
- Card radius: `10px-15px`

### Implementation Guidance

When redesigning a Studio screen:

1. Start from the actual workflow: list, editor, preview, inspector.
2. Put the real product artifact in the largest visual area.
3. Use black as the canvas and a restrained blue ring for focus.
4. Convert rectangular buttons and filters into pills.
5. Keep cards shallow, precise and content-forward.
6. Verify text fits on desktop and mobile.
7. Preserve framework contracts: `game.config.ts`, Ink, data files and assets remain the source of truth.
