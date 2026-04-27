# Distribution Guide

The production build is a static ESM package. It does not require the dev server.

## Build

```bash
bun manager/cli.ts build mi-novela
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

## Official Runtime Strategy

The framework uses `esm-vendor-importmap` for production:

- Game and framework TypeScript are transpiled to ESM JavaScript.
- React and React DOM are copied to `framework/vendor/`.
- `index.html` contains an import map for vendor modules.
- Story and data are precompiled to JSON.
- Asset, story and data paths are relative, so the folder can run under a subpath.

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
