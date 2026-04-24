# Lessons Learned — Iteration 000007

## US-001 — Present Pre-Choice Dialog Normally

**Summary:** Dialog lines with `advanceMode: 'choices'` now use the standard typewriter reveal path instead of being revealed instantly. Completing or skipping those lines does not emit the completion callback, so the engine's existing pending-choice flow waits for the player to advance once more.

**Key Decisions:** Extracted the reveal plan and completion-mode rule into `framework/components/DialogReveal.ts` so choice-preface behavior can be tested without introducing a DOM test dependency. Kept `advanceMode: 'none'` and `advanceMode: 'next'` completion behavior unchanged.

**Pitfalls Encountered:** The full project test suite and default `tsc --noEmit` path currently expose unrelated baseline failures. A targeted typecheck needs `--allowImportingTsExtensions` because the project convention requires explicit `.ts`/`.tsx` local imports.

**Useful Context for Future Agents:** `GameEngine.advance()` already holds `#pendingChoices` and emits `engine:choices` only on a later player advance, so `VnDialog` should not auto-complete `choices` lines. The dev server can be visually checked at `http://localhost:3000/`; the first screenshot may be blank if captured before React finishes booting, so wait briefly before capture.

## US-002 — Show Choices Only After Player Confirmation

**Summary:** Choice-preface dialog now keeps choices buffered in the engine until a separate player advance after text reveal, and stage-level click/key handling uses an explicit action helper for reveal versus advance behavior.

**Key Decisions:** Copied pending choices with `slice()` when storing them to avoid sharing a mutable choices array, kept `choices` completion callbacks ignored in `VnStage`, and added `VnStageAdvance.ts` as a small pure helper for testing accepted key and click behavior without a DOM dependency.

**Pitfalls Encountered:** The first manual browser script expected choices one input too early; the actual contract requires one input to reveal typing text and a later input to emit choices. Full `bun test` and broad `tsc --noEmit` still expose unrelated baseline failures in older UI tests and strict typing issues outside this story.

**Useful Context for Future Agents:** Visual verification used the Spanish default story: after starting the game, Space reveals the first line, Enter advances to `Kai mira la entrada sin moverse.`, ArrowRight reveals that line, and a later click shows `Entrar al café` / `Seguir caminando`.

## US-003 — Guard Against Duplicate Advances

**Summary:** `GameEngine` now routes public advancement requests through a single in-flight guard so rapid clicks, key presses, auto-advance callbacks, transitions, and minigames cannot process concurrent story steps.

**Key Decisions:** Kept duplicate requests as ignored rather than queued because the existing UI contract treats each completed dialog line as requiring a separate player action. Internal tag-only recursion still calls the private advance method directly so empty/tag-only Ink steps continue to collapse into the next visible result.

**Pitfalls Encountered:** Minigame test fixtures should return `{}` unless the compiled Ink story declares variables for result keys; otherwise `ScriptRunner.setVariable()` throws when exporting undeclared result fields. Headless Firefox screenshots can capture a blank frame if taken before React mounts, so a delayed wrapper page was useful for browser verification.

**Useful Context for Future Agents:** Dynamic imports with query strings give each engine test a fresh `GameEngine` singleton. The new `framework/types/inkjs-compiler.d.ts` declaration covers the existing `inkjs/compiler/*` runtime imports used by manager commands and the engine test fixture compiler.
