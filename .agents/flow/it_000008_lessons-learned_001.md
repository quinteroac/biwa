# Lessons Learned — Iteration 000008

## US-001 — VolumeController Module

**Summary:** Implemented a `VolumeController` class in `framework/engine/VolumeController.ts` that manages per-channel volume levels for master, bgm, sfx, and voice channels. Supports set/get volume with 0.0–1.0 normalization, register/unregister of active audio sources, and automatic volume application to all tracked sources when a channel volume changes. Master volume cascades to all channels.

**Key Decisions:**
- Designed VolumeController as a standalone class (no EventBus dependency) — individual audio controllers (BgmController, SfxController, etc.) can call `registerSource`/`unregisterSource` when creating/destroying audio elements.
- Used `HTMLAudioElement` directly for source tracking (not a wrapper), keeping the API simple and framework-compatible.
- Master volume multiplies with channel volume (e.g., master=0.5 × bgm=0.8 = effective 0.4), rather than overriding individual channels.
- Private fields via `#field` syntax, consistent with project conventions.
- Used `Object.freeze` for the channels array constant.

**Pitfalls Encountered:**
- None. Implementation was straightforward following existing controller patterns.

**Useful Context for Future Agents:**
- The existing audio controllers (BgmController, SfxController, VoiceController, AmbienceController) currently manage volume independently via EventBus events. To integrate VolumeController, future agents should modify these controllers to call `registerSource`/`unregisterSource` on the VolumeController instance when creating/destroying audio elements, and respond to volume events via VolumeController's effective volume.
- The `AudioChannel` type is exported from VolumeController.ts — future code can import it from there rather than duplicating.
- Test file uses the same Audio mock pattern as other controller tests (`framework/__tests__/VolumeController.test.ts`).
