# Feature Map

Roadmap vivo del framework. Este documento contiene solo trabajo pendiente o no cerrado.

El historial de lo ya implementado vive en `CHANGELOG.md`. Si una tarea se completa, debe salir de este mapa y entrar al changelog.

## Norte Actual

El framework debe sentirse confiable por dentro y amable por fuera:

- Runtime predecible, desacoplado y testeable.
- Tooling de creador con errores accionables.
- Builds estaticos verificables.
- Documentacion que no prometa features inexistentes.
- Fixtures tecnicos pequenos para validar el framework sin depender de una novela demo.

## Pendientes P2

### Schema Validation Y Build Flags

Objetivo: acercar docs, schema y runtime; preparar perfiles de distribucion.

Alcance:

- Validar `game.config.ts` contra `framework/schemas/game.config.schema.json`.
- Reportar errores de schema como diagnostics con codigo.
- Parsear flags en `build`:
  - `--mode standalone`
  - `--mode static`
  - `--mode portal`
  - `--mode embedded`
- Escribir el modo efectivo en `manifest.json`.
- Mantener salida actual para todos los modos en este ciclo.
- Dejar warnings informativos para modos sin wrapper especializado.

Criterios de salida:

- `doctor` detecta errores de schema antes de validaciones profundas.
- `build smoke-fixture --mode static` produce manifest con modo `static`.
- `build smoke-fixture --mode nope` falla con diagnostic claro.

### Portal Y Embedded Wrappers

Objetivo: producir salidas especializadas para hosts externos.

Alcance:

- Definir contrato de wrapper `portal`.
- Definir contrato de wrapper `embedded`.
- Documentar base path, assets y manifest requerido por cada modo.
- Agregar smoke tests para cada salida.

Criterios de salida:

- Cada modo genera artefactos distinguibles.
- `manifest.json` describe el modo y archivos esperados.
- La salida actual `static` permanece compatible.

### Coverage Formal

Objetivo: medir cobertura minima en piezas criticas.

Alcance:

- Definir herramienta de coverage compatible con Bun o un script alterno.
- Medir parser, engine, save/load, diagnostics y CLI.
- Agregar umbral minimo solo cuando sea estable.

Criterios de salida:

- Hay comando documentado para coverage.
- El reporte cubre al menos las areas criticas del framework.
- `verify` no se vuelve fragil por detalles irrelevantes de coverage.

## Fuera De Alcance Actual

- Optimizar o completar assets de `mi-novela`.
- Sistema completo de plugins/renderers externos.
- Features de jugador como backlog, skip mode, auto mode o galeria.
- Publicacion real como paquete npm hasta cerrar la politica de versionado.

## Verificacion Base

```bash
bun run verify
bun manager/cli.ts doctor smoke-fixture
bun manager/cli.ts build smoke-fixture
bun run e2e
```
