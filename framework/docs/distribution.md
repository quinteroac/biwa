# Distribution Guide

The production build is a static ESM package. It does not require the dev server.

## Build

```bash
bun manager/cli.ts build mi-novela
bun manager/cli.ts build mi-novela --mode static
bun manager/cli.ts build mi-novela --mode portal
bun manager/cli.ts build mi-novela --mode embedded
```

The command writes:

```text
dist/mi-novela/
  index.html
  game.config.js
  manifest.json
  story/
  data/
  assets/
  minigames/
  framework/
```

## Preview

Use `preview` to serve the exact static build output locally:

```bash
bun manager/cli.ts preview mi-novela
```

If the build does not exist yet, build and serve in one command:

```bash
bun manager/cli.ts preview mi-novela --build
```

The command prints the local URL and serves `dist/<gameId>/` as a static site. Use `--port <port>` when the default port is occupied.

## Official Runtime Strategy

The framework uses `esm-vendor-importmap` for production:

- Game and framework TypeScript are transpiled to ESM JavaScript.
- React and React DOM are copied to `framework/vendor/`.
- `index.html` contains an import map for vendor modules.
- Story and data are precompiled to JSON.
- Asset, story and data paths are relative, so the folder can run under a subpath.

## Distribution Modes

All modes currently share the same static ESM output. The mode changes the manifest and, for host-oriented modes, adds a wrapper contract:

| Mode | Output | Use |
|---|---|---|
| `standalone` | `index.html` + static files | Default full-page game site. |
| `static` | Same static files, manifest mode `static` | Explicit static-hosting profile. |
| `portal` | Adds `portal.json` | Shared launcher or catalog host that reads metadata before mounting. |
| `embedded` | Adds `embed.html` | Iframe-friendly wrapper for external pages. |

`manifest.json` always records the effective `distribution.mode`, `basePath`, runtime strategy, entry file and wrapper files.

## Smoke Checks

`build` validates the output before finishing:

- Required entry files exist.
- Every configured story locale was compiled.
- `index.html` has no root-absolute asset URLs.
- Import map targets exist.
- Relative JavaScript imports resolve inside `dist/<gameId>/`.

If any check fails, the build exits with an error.

## Size Report

Each build prints a size report and writes the same data to `manifest.json`:

```json
{
  "distribution": {
    "strategy": "esm-vendor-importmap",
    "entry": "index.html"
  },
  "sizes": {
    "framework": 1449295,
    "assets": 267950795,
    "story": 12297,
    "data": 12450,
    "total": 269429226
  }
}
```

## Static Hosting

Serve the parent `dist/` directory when hosting multiple games:

```text
https://example.com/mi-novela/
```

Serve `dist/mi-novela/` directly when hosting one game at the site root:

```text
https://example.com/
```

Because runtime paths are relative, both layouts work.

## Future Package Publishing

The current build copies local framework source into `dist/<gameId>/`. Future npm-style publishing is planned but not implemented in this phase.

The packaging decision lives in [packaging-roadmap.md](./packaging-roadmap.md), including package names, semver policy, official plugin changelogs and `pluginApi` migration steps.
