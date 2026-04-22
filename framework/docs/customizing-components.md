# Customizing Framework Components

This guide explains how to replace or extend any visual component in the framework **without modifying framework source files**. The principle is always the same: **replace the orchestrator, reuse the pieces**.

---

## Two levels of customization

| Level | Mechanism | Touches framework? |
|---|---|---|
| Colors, fonts, spacing | CSS variables in `game.config.ts → theme.cssVars` | No |
| Layout, UX, full replacement | Write your own component, skip `mountVnApp` | No |

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

## Level 2 — Full component replacement

When you need a different layout, additional screens, or behaviour that CSS cannot express, you bypass `mountVnApp` and mount your own React tree.

### Step 1 — Create a `main.tsx` entry point in your game

```
games/my-novel/
  main.tsx          ← new file, your app shell
  components/
    MyStartMenu.tsx ← your custom component
  game.config.ts
  index.html
```

### Step 2 — Write your app shell

Import only the framework pieces you need. `VnStage` is the full game rendering layer; everything above it is yours to define.

```tsx
// games/my-novel/main.tsx
import { useState } from '../../../framework/vendor/react-jsx-runtime.js'
import { createRoot } from '../../../framework/vendor/react-dom-client.js'
import { GameEngine } from '../../framework/engine/GameEngine.ts'
import { VnStage } from '../../framework/components/VnStage.tsx'
import MyStartMenu from './components/MyStartMenu.tsx'
import config from './game.config.ts'

const engine = new GameEngine(config)

function App() {
  const [started, setStarted] = useState(false)

  if (!started) {
    return <MyStartMenu onStart={() => setStarted(true)} />
  }

  return <VnStage engine={engine} />
}

createRoot(document.getElementById('app')!).render(<App />)
```

### Step 3 — Write your custom component

Importing `VnStartMenuProps` from the framework gives you the same prop contract, making the component a drop-in replacement if you ever want to switch back.

```tsx
// games/my-novel/components/MyStartMenu.tsx
import type { VnStartMenuProps } from '../../../framework/components/VnStartMenu.tsx'

export default function MyStartMenu({ onStart, hasSaves, onContinue }: VnStartMenuProps) {
  return (
    <div style={{ background: 'url(./assets/ui/cover.jpg) center/cover' }}>
      <h1>My Novel</h1>
      <button onClick={onStart}>New Game</button>
      {hasSaves && <button onClick={onContinue}>Continue</button>}
    </div>
  )
}
```

### Step 4 — Point `index.html` to the new entry point

```html
<!-- games/my-novel/index.html -->
<script type="module" src="./main.tsx"></script>
```

---

## Which components can be replaced this way?

Any component under `framework/components/` is a candidate. The most common replacements:

| Component | What to replace it with |
|---|---|
| `VnStartMenu` | Your own start/title screen |
| `VnStage` | Unusual if you need fine-grained control over the whole stage |
| `VnDialog` | Custom dialog box UI (pass as prop once `VnStage` exposes it) |
| `SaveLoadMenu` / `SaveControlsBar` | Custom save UI |

For components that `VnStage` renders internally (like `VnDialog`), the path is: either keep using `VnStage` and override visuals via CSS variables, or compose your own stage from the smaller pieces.

---

## Reusing engine logic without any React layer

You can use `GameEngine`, `ScriptRunner`, `SaveManager`, and `EventBus` independently of any UI component:

```ts
import { GameEngine } from '../../framework/engine/GameEngine.ts'
import config from './game.config.ts'

const engine = new GameEngine(config)
await engine.init()
engine.start()

engine.eventBus.on('dialog', (payload) => {
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
  └─ Yes → Create main.tsx + MyStartMenu.tsx (Level 2)

Need to add a screen that doesn't exist (e.g. credits, gallery)?
  └─ Yes → Add it in your main.tsx shell, between VnStartMenu and VnStage

Need to replace VnDialog?
  └─ Try CSS variables first. If not enough → compose your own stage.
```
