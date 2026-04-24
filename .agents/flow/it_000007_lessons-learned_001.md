# Lessons Learned — Iteration 000007

## US-001 — Present Pre-Choice Dialog Normally

**Summary:** Dialog lines with `advanceMode: 'choices'` now use the standard typewriter reveal path instead of being revealed instantly. Completing or skipping those lines does not emit the completion callback, so the engine's existing pending-choice flow waits for the player to advance once more.

**Key Decisions:** Extracted the reveal plan and completion-mode rule into `framework/components/DialogReveal.ts` so choice-preface behavior can be tested without introducing a DOM test dependency. Kept `advanceMode: 'none'` and `advanceMode: 'next'` completion behavior unchanged.

**Pitfalls Encountered:** The full project test suite and default `tsc --noEmit` path currently expose unrelated baseline failures. A targeted typecheck needs `--allowImportingTsExtensions` because the project convention requires explicit `.ts`/`.tsx` local imports.

**Useful Context for Future Agents:** `GameEngine.advance()` already holds `#pendingChoices` and emits `engine:choices` only on a later player advance, so `VnDialog` should not auto-complete `choices` lines. The dev server can be visually checked at `http://localhost:3000/`; the first screenshot may be blank if captured before React finishes booting, so wait briefly before capture.
