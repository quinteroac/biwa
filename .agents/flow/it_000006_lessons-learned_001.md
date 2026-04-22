# Lessons Learned — Iteration 000006

## US-001 — Developer can control BGM via Ink tags

**Summary:** Implemented `BgmController` in `framework/engine/BgmController.ts` that subscribes to `engine:bgm` EventBus events emitted by `GameEngine`. Handles `play`, `stop`, and `volume` commands using `HTMLAudioElement`. Wired the controller into `GameEngine` constructor. Tests cover all acceptance criteria using a stubbed `globalThis.Audio`.

**Key Decisions:**
- `GameEngine` already had `case 'bgm': this.#bus.emit('engine:bgm', tag)` in `#processTags`, so tag routing was already in place — only a consumer was needed.
- Used `HTMLAudioElement` directly (no Web Audio API) for simplicity and browser compatibility.
- The `destroy()` method both stops audio and unsubscribes the EventBus listener, preventing memory leaks.
- Volume is clamped to `[0, 1]` and parsed via `parseFloat(String(...))` to handle both string and boolean values from the tag parser.

**Pitfalls Encountered:**
- `globalThis.Audio` must be replaced with a constructor function (not a class) in the Bun test environment since Bun's test runtime has no DOM. The stub must be installed before constructing `BgmController` so the controller captures new stubs on each `play` command.
- `bun test` correctly identifies the pre-existing `tsc` error in `ScriptRunner.ts:189` as out-of-scope — confirmed by stashing changes and re-running `tsc`.

**Useful Context for Future Agents:**
- The `TagParser` (and the identical inline parser in `ScriptRunner`) converts `# bgm: play, src:audio/theme.mp3, loop:true, volume:0.8` into `{ type: 'bgm', id: 'play', src: 'audio/theme.mp3', loop: 'true', volume: '0.8' }` — all values are strings.
- The first positional token after the type colon becomes `id`; subsequent `key:value` tokens become direct properties on the command.
- `GameEngine` already emits `engine:sfx` and `engine:ambience` events the same way — a `SfxController` and `AmbienceController` can follow the exact same pattern as `BgmController`.
