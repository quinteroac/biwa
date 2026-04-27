# Contributing

## Setup

```bash
bun install
bun run verify
```

## Development Loop

Use the lightweight fixture for fast pipeline checks:

```bash
bun manager/cli.ts doctor smoke-fixture
bun manager/cli.ts build smoke-fixture
```

Use the richer demo when changing user-facing behavior:

```bash
bun manager/cli.ts dev mi-novela
bun manager/cli.ts doctor mi-novela
bun manager/cli.ts build mi-novela
```

## Quality Gate

Every PR should pass:

```bash
bun run verify
```

This runs:

- `bun test`
- `tsc`
- `doctor smoke-fixture`
- `build smoke-fixture`

## Code Guidelines

- Prefer existing framework patterns over new abstractions.
- Keep local imports explicit with `.ts` or `.tsx` in source.
- Keep public contracts typed and exported when games are expected to consume them.
- Do not edit generated `dist/` output by hand.
- Add focused tests for engine, parser, save/load, CLI or component contract changes.

## Documentation

Update docs when changing public behavior:

- `README.md` for project-level workflows.
- `framework/docs/*.md` for creator-facing docs.
- `CHANGELOG.md` for notable public changes.
- `FEATURE_MAP.md` for roadmap phase status.
