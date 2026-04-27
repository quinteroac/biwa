# Customizing Framework Components

This guide explains how to replace or extend any visual component in the framework **without modifying framework source files**. The principle is always the same: **replace the orchestrator, reuse the pieces**.

---

## Two levels of customization

| Level | Mechanism | Touches framework? |
|---|---|---|
| Colors, fonts, spacing | CSS variables in `game.config.ts → theme.cssVars` | No |
| Layout, UX, full replacement | Pass component overrides to `mountVnApp` or `VnStage` | No |

Start at the first level. Only drop to the second when CSS variables are not enough.

---

## Level 1 — Theming via CSS variables

Every framework component reads its styles from CSS custom properties. Override any of them in `game.config.ts`:

```ts
// games/my-novel/game.config.ts
const config: GameConfig = {
  // ...
  theme: {
    font:     '"Cinzel", serif',
    accent:   '#f59e0b',
    dialogBg: 'rgba(20, 10, 0, 0.9)',
    cssVars: {
      '--vn-menu-bg':      'linear-gradient(160deg, #1a0a00 0%, #3d1a00 100%)',
      '--vn-choice-hover': 'rgba(245, 158, 11, 0.15)',
      '--vn-name-color':   '#fef3c7',
    }
  },
}
```

`GameEngine.applyTheme()` sets all variables on `document.documentElement` before the first render. See the [full list of available CSS variables in PROJECT_CONTEXT.md](../../.agents/PROJECT_CONTEXT.md).

---

## Level 2 — Component Overrides

When you need a different layout, additional screens, or behaviour that CSS cannot express, pass replacement components through `mountVnApp`.

### Replace app-level screens

```tsx
// games/my-novel/index.html inline module can import this component,
// or you can move the boot code to main.tsx.
import { GameEngine } from '../../framework/engine/GameEngine.ts'
import { mountVnApp } from '../../framework/components/VnApp.tsx'
import type { VnStartMenuProps } from '../../framework/components/VnStartMenu.tsx'
import config from './game.config.ts'

function MyStartMenu({ title, onStart, hasSaves, onContinue }: VnStartMenuProps) {
  return (
    <main>
      <h1>{title}</h1>
      <button onClick={onStart}>New Game</button>
      {hasSaves && <button onClick={onContinue}>Continue</button>}
    </main>
  )
}

const engine = await GameEngine.init(config)
mountVnApp(engine, document.getElementById('root')!, {
  components: {
    StartMenu: MyStartMenu,
  },
})
```

### Replace stage internals

`VnStage` accepts a `components` map. Omit anything you want the framework to keep rendering.

```tsx
import { forwardRef, useImperativeHandle } from 'react'
import { GameEngine } from '../../framework/engine/GameEngine.ts'
import { mountVnApp } from '../../framework/components/VnApp.tsx'
import type { VnDialogHandle, VnDialogProps } from '../../framework/components/VnDialog.tsx'
import config from './game.config.ts'

const MyDialog = forwardRef<VnDialogHandle, VnDialogProps>(function MyDialog({ dialog, onComplete }, ref) {
  useImperativeHandle(ref, () => ({
    get isTyping() { return false },
    skip() {},
  }), [])

  if (!dialog) return null
  return (
    <section onAnimationEnd={() => onComplete(dialog.advanceMode)}>
      {dialog.speaker && <strong>{dialog.speaker}</strong>}
      <p>{dialog.text}</p>
    </section>
  )
})

const engine = await GameEngine.init(config)
mountVnApp(engine, document.getElementById('root')!, {
  components: {
    stageComponents: {
      Dialog: MyDialog,
    },
  },
})
```

---

## Which components can be replaced this way?

Any component under `framework/components/` is a candidate. The most common replacements:

| Component | What to replace it with |
|---|---|
| `VnStartMenu` | Your own start/title screen |
| `VnEndScreen` | Credits, gallery unlocks, replay UI |
| `VnStage` | A fully custom stage orchestrator |
| `VnBackground` | Custom background renderer shell |
| `VnCharacter` | Custom character renderer |
| `VnDialog` | Custom dialog box UI |
| `VnChoices` | Custom choice UI |
| `VnSaveMenu` / `SaveControlsBar` | Custom save UI |
| `VnVolumeControl` | Custom audio settings UI |
| `VnTransition` | Custom transitions |

For components that `VnStage` renders internally, prefer `stageComponents` before writing a full replacement stage.

## Renderer Plugins

For reusable visual systems, prefer a plugin renderer over replacing the whole component. Plugins can register renderers for background, character and transition `type` values while keeping `VnStage` and the default UI shell intact.

See `framework/docs/plugins.md` for the renderer registry contract.

---

## Reusing engine logic without any React layer

You can use `GameEngine`, `ScriptRunner`, `SaveManager`, and `EventBus` independently of any UI component:

```ts
import { GameEngine } from '../../framework/engine/GameEngine.ts'
import config from './game.config.ts'

const engine = await GameEngine.init(config)
engine.start()

engine.bus.on('engine:dialog', (payload) => {
  // Drive your own UI with raw engine events
})
```

The engine layer has no React dependency. All visual components are optional.

---

## Quick-reference decision tree

```
Need different colors / fonts?
  └─ Yes → Use theme.cssVars in game.config.ts (Level 1)

Need different layout or behaviour for the start menu?
  └─ Yes → Pass components.StartMenu to mountVnApp

Need to add a screen that doesn't exist (e.g. credits, gallery)?
  └─ Yes → Pass components.Stage or write your own app shell

Need to replace VnDialog?
  └─ Try CSS variables first. If not enough → pass components.stageComponents.Dialog
```
