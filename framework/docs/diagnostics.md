# Diagnostics

`doctor` validates a game project before development or build:

```bash
bun manager/cli.ts doctor smoke-fixture
bun manager/cli.ts doctor smoke-fixture --json
```

The default output is human-readable. `--json` emits a stable report for editor integrations, CI parsers and external tools:

```json
{
  "gameId": "smoke-fixture",
  "summary": { "error": 0, "warning": 0, "info": 0, "suppressed": 0 },
  "issues": []
}
```

## Severity

| Severity | Build impact | Meaning |
|---|---:|---|
| `error` | Fails build | Required config, data or references are invalid. |
| `warning` | Does not fail build | Content can run, but an asset or optional contract looks incomplete. |
| `info` | Does not fail build | Informational issue, including suppressed warnings. |

## Current Codes

| Code | Meaning | Typical fix |
|---|---|---|
| `asset_missing` | A referenced local asset file was not found. | Add the file under `assets/` or update the path in data. |
| `id_filename_mismatch` | A data file name does not match its frontmatter `id`. | Rename the file or update `id`. |
| `character_no_renderer` | A character has no `animation` and no `layers`. | Add a renderer definition or suppress if intentional. |
| `minigame_entry_missing` | A minigame entry file does not exist. | Create the entry file or update `entry`. |
| `invalid_distribution_mode` | `distribution.mode` is not supported. | Use `standalone`, `portal`, `static` or `embedded`. |
| `config_schema_invalid` | `game.config.ts` does not match the JSON schema. | Align the config with `framework/schemas/game.config.schema.json`. |
| `frontmatter_missing` | A data file has no YAML frontmatter block. | Add a `---` delimited block at the top. |
| `frontmatter_invalid` | YAML frontmatter is not an object. | Use key/value YAML. |
| `frontmatter_invalid_yaml` | YAML parsing failed. | Fix indentation, quotes or list syntax. |
| `data_id_missing` | A data file has no string `id`. | Add `id: <file-name>`. |
| `data_id_duplicate` | Two data files declare the same `id`. | Rename one id. |
| `data_directory_missing` | A configured data directory does not exist. | Create it or update `game.config.ts`. |
| `scene_background_missing` | A scene has no required `background` object. | Add a supported background config. |
| `minigame_results_missing` | A minigame lacks a `results` object. | Declare result fields consumed by Ink. |
| `story_minigame_unknown` | Ink launches an unknown minigame id. | Create the matching minigame data file or update Ink. |
| `story_reference_unknown` | An Ink tag references an unknown id. | Create matching data or change the tag. |
| `config_id_missing` | `game.config.ts` has no `id`. | Set a lowercase slug. |
| `config_title_missing` | `game.config.ts` has no `title`. | Set the player-facing title. |
| `config_default_locale_missing` | `story.defaultLocale` is missing. | Set it to one of `story.locales` keys. |
| `story_locale_path_missing` | A configured story locale path does not exist. | Create the `.ink` file or update the path. |
| `story_default_locale_unmapped` | The default locale has no matching story path. | Make `defaultLocale` match a key in `story.locales`. |
| `atlas_json_invalid` | A character spritesheet atlas is not valid JSON. | Regenerate it with `bun manager/cli.ts assets character-atlas` or fix the syntax. |
| `atlas_version_unsupported` | A ComfyUI Game Assets Maker atlas uses an unsupported version. | Regenerate the atlas with the current CLI/custom node contract. |
| `atlas_image_missing` | Atlas `meta.image` is missing. | Add the future spritesheet filename to `meta.image`. |
| `atlas_size_missing` | Atlas `meta.size` is missing or invalid. | Regenerate the atlas or add numeric `w`/`h`. |
| `atlas_frames_empty` | Atlas contains no frames. | Regenerate the atlas with at least one frame. |
| `atlas_frame_out_of_bounds` | A frame rectangle exceeds `meta.size`. | Fix the rectangle or regenerate the atlas. |
| `atlas_frame_tags_missing` | An animation atlas has no frame tags. | Add `meta.frameTags`. |
| `atlas_frame_tag_invalid` | A frame tag points outside the atlas frame range. | Fix `from`/`to`. |
| `atlas_frame_tag_direction_invalid` | A frame tag direction is not supported. | Use `forward`, `reverse` or `pingpong`. |

## Suppressions

Warnings can be downgraded to `info` when the project intentionally accepts them:

```ts
diagnostics: {
  suppress: [
    {
      code: 'asset_missing',
      path: 'data/characters/placeholder.md',
      reason: 'Placeholder character while art is pending.',
    },
  ],
}
```

Suppression entries can match by `code`, `path` or `message`. Errors are never suppressed.
