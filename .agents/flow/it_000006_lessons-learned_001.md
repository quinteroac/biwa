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

## US-002 — Developer can control SFX via Ink tags

**Summary:** Implemented `SfxController` in `framework/engine/SfxController.ts` that subscribes to `engine:sfx` EventBus events. Handles `play`, `stop`, and `volume` commands using `HTMLAudioElement`. Wired into `GameEngine` constructor alongside `BgmController`. Tests cover all acceptance criteria using the same `globalThis.Audio` stub pattern from US-001.

**Key Decisions:**
- `SfxController` is a direct structural copy of `BgmController` — same private fields, same three command handlers, same `destroy()` pattern. Only the event channel (`engine:sfx`) and log prefix (`[SfxController]`) differ.
- `loop` defaults to `false` when the `loop` param is omitted (AC02), consistent with standard `HTMLAudioElement` behaviour.
- `GameEngine` already routed `engine:sfx` events — only the consumer class was needed.

**Pitfalls Encountered:**
- None — the BgmController pattern transferred cleanly. Reusing the same test stub setup worked without modification.

**Useful Context for Future Agents:**
- An `AmbienceController` can be created with the exact same pattern targeting `engine:ambience`.
- SFX `play` stops any previously playing SFX before starting the new one (single-channel behaviour). If multi-channel SFX is required in future, the architecture would need to change.
- All tag values arrive as strings from the TagParser; `parseFloat(String(...))` handles both string and boolean coercions safely.

## US-003 — Developer can control Ambience via Ink tags

**Summary:** Implemented `AmbienceController` in `framework/engine/AmbienceController.ts` that subscribes to `engine:ambience` EventBus events. Handles `play`, `stop`, and `volume` commands using `HTMLAudioElement`. Wired into `GameEngine` constructor alongside `BgmController` and `SfxController`. Tests cover all acceptance criteria using the same `globalThis.Audio` stub pattern.

**Key Decisions:**
- Direct structural copy of `BgmController`/`SfxController` pattern — only the event channel (`engine:ambience`) and log prefix (`[AmbienceController]`) differ.
- `GameEngine` already routed `engine:ambience` events (line 248-249) — only the consumer class was needed.
- `loop` defaults to `false` when omitted, consistent with `HTMLAudioElement` defaults.

**Pitfalls Encountered:**
- None — the BgmController/SfxController pattern transferred cleanly.

**Useful Context for Future Agents:**
- All three audio controllers (BGM, SFX, Ambience) follow the same pattern. Any new audio channel can be added the same way.
- The `GameEngine` already has `case 'voice':` routing — a `VoiceController` would follow the exact same pattern targeting `engine:voice`.
- `GameEngine` does not have a top-level `destroy()` that cleans up controllers; they currently live for the engine's lifetime.

## US-004 — Developer can control Voice via Ink tags

**Summary:** Implemented `VoiceController` in `framework/engine/VoiceController.ts` that subscribes to `engine:voice` EventBus events. Handles `play`, `stop`, and `volume` commands using `HTMLAudioElement`. Wired into `GameEngine` constructor alongside the other audio controllers. Also added `case 'voice':` routing in `GameEngine.#processTags`. Tests cover all acceptance criteria using the same `globalThis.Audio` stub pattern.

**Key Decisions:**
- `VoiceController` is a structural copy of `BgmController`/`SfxController`/`AmbienceController` — only the event channel (`engine:voice`) and log prefix (`[VoiceController]`) differ.
- `loop` is always hardcoded to `false` (voice lines play once). The `loop` parameter is intentionally not read from the tag command per the user story spec.
- `GameEngine` did NOT already have `case 'voice':` routing — it had to be added to `#processTags` alongside the EventBus emit.

**Pitfalls Encountered:**
- None — the established audio controller pattern transferred cleanly.

**Useful Context for Future Agents:**
- All four audio controllers (BGM, SFX, Ambience, Voice) now follow the same pattern. Any new audio channel can be added by: (1) create a new `XxxController.ts` following the same structure, (2) add `case 'xxx':` + `this.#bus.emit('engine:xxx', tag)` in `GameEngine.#processTags`, (3) add a field, import, and constructor call in `GameEngine`.
- Voice-specific: the tag syntax omits `loop` — it is always `false`. Volume defaults to `1.0` when omitted.
