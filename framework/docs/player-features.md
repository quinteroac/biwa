# Player Features

The framework includes baseline visual novel player controls for dialog review and assisted reading.

## Backlog

`GameEngine` records displayed dialog lines as backlog entries:

- `index`
- `text`
- `speaker`
- `nameColor`
- `timestamp`

Use the engine API:

```ts
engine.getBacklog()
engine.clearBacklog()
```

The stage emits and listens to `engine:backlog` updates. Save snapshots include the current backlog under `visual.backlog`, so loading a save restores the expected dialog history.

`VnStage` shows the default `VnBacklog` overlay through the `Log` button or the `B` key. Hosts can replace it through `components.Backlog`.

## Auto Mode

Auto mode advances completed dialog lines after a delay based on text length. It waits for text reveal to finish and pauses while choices, transitions, save/load, audio controls or backlog overlays are active.

Default control:

- `Auto` button
- `A` key

The on/off preference is stored per game id.

## Skip Mode

Skip mode reveals and advances lines quickly.

The default policy is read-only skip: previously seen lines can be skipped, but unseen dialog stops skip mode before advancing. The `Read` button toggles read-only behavior.

Default controls:

- `Skip` button
- `S` key
- `Read` button for read-only skip policy

Skip pauses on choices, transitions, minigames and overlays.
Skip on/off and read-only policy are stored per game id.

## Player Preferences

`VnStage` uses `PlayerPreferences` to persist reading settings per game id under:

```txt
vn:{gameId}:player:preferences
```

The stored preferences include:

- text reveal speed.
- auto-mode base delay and per-character delay.
- auto/skip mode state.
- read-only skip policy.
- text scale.
- high-contrast dialog.
- reduced-motion dialog reveal.

The default `Settings` button opens `VnSettings`, where these values can be edited or reset. Hosts can replace the panel through `components.Settings`.

## Input Map

`VnStage` accepts an `inputMap` prop for keyboard overrides. Any omitted action keeps the framework default.

```tsx
<VnStage
  engine={engine}
  inputMap={{
    auto: ['F8'],
    skip: ['F9'],
    settings: ['F10'],
  }}
/>
```

Default keyboard actions:

- advance: `Space`, `Enter`, `ArrowRight`.
- backlog: `B`.
- auto: `A`.
- skip: `S`.
- save/load: `Escape`.
- settings: `M`.
- gallery: `G`.
- music room / replay: `R`.

Mouse/touch click on the stage still advances or reveals dialog. Buttons remain available for touch-first players.

## Save UX

The default save/load menu shows slot name, scene name, timestamp, playtime and thumbnails when save metadata includes `thumbnail`.

Occupied slots support:

- load.
- overwrite confirmation.
- delete confirmation.

Autosave remains visually distinguished as the `Auto Save` slot.

## Player Extras

`VnStage` also exposes default `Gallery` and `Music` entries from the top-right gear menu for unlocked extras. See `framework/docs/player-extras.md` for the data schema, Ink tags and component override contracts.
