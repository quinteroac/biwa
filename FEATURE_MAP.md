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

## Pendientes P0

### Suite CLI Automatizada

Objetivo: probar el CLI como producto, no solo las piezas internas.

Alcance:

- Crear harness de tests para comandos CLI.
- Ejecutar comandos sobre proyectos temporales o fixtures aislados.
- Cubrir `new`, `doctor`, `build` y `list`.
- Cubrir los subcomandos de assets/atlas JSON.
- Verificar exit codes y mensajes clave.
- Validar que `new` genera un proyecto que pasa `doctor` y `build`.
- Validar errores comunes:
  - game id invalido.
  - game inexistente.
  - story locale faltante.
  - asset faltante.
  - minigame mal configurado.
- Usar `doctor --json` para assertions estables.

Criterios de salida:

- Los tests CLI corren dentro de `bun run test` o un script incluido en `bun run verify`.
- Los tests no dejan carpetas temporales ni basura en `dist/`.
- Hay al menos un test de exito y uno de fallo para los comandos principales.

### Fades Y Restauracion De Audio

Objetivo: hacer que el audio persistente sea suave y consistente.

Alcance:

- Soportar `fade` o `duration` para BGM y ambience.
- Definir comportamiento para:
  - play nueva pista con fade.
  - stop con fade.
  - reemplazo/crossfade.
  - restore desde save sin transicion innecesaria.
- Alinear `framework/docs/audio.schema.md` con lo implementado.
- Agregar tests de mezcla efectiva `master * channel * source`.

Criterios de salida:

- BGM y ambience soportan fade basico.
- Restore desde save no duplica fuentes ni reinicia SFX momentaneos.
- Docs de audio no prometen capacidades que el runtime no soporte.

## Pendientes P1

### Build Preview

Objetivo: que el creador pueda probar exactamente lo que va a publicar.

Alcance:

- Agregar comando `bun manager/cli.ts preview <game>`.
- Servir `dist/<game>` con servidor estatico local.
- Si `dist/<game>` no existe, sugerir `build`.
- Soportar `bun manager/cli.ts preview <game> --build`.
- Mostrar URL y modo de distribucion.

Criterios de salida:

- `preview smoke-fixture --build` sirve una build navegable.
- Playwright puede apuntar al preview o reutilizar la misma logica.
- Errores de puerto ocupado tienen mensaje accionable.

### Dev Server Watch Mode

Objetivo: que `dev` comunique cambios y errores en tiempo real.

Alcance:

- Watcher explicito para:
  - story `.ink`.
  - data `.md`.
  - assets.
  - `game.config.ts`.
  - framework source durante desarrollo local.
- Logs claros por archivo cambiado.
- Revalidacion ligera al cambiar data/config.
- Mensajes de recuperacion cuando un error se corrige.
- Mantener compilacion bajo demanda para no sobrecomplicar cache.

Criterios de salida:

- Al editar story/data/config, la consola muestra evento y resultado.
- Un error de Ink o TypeScript aparece con path y sugerencia.
- Al corregir el error, el servidor reporta estado recuperado.
- `dev` sigue arrancando con el mismo comando actual.

### Politica De Instancias Del Engine

Objetivo: hacer explicito cuando usar singleton y cuando crear instancias aisladas.

Alcance:

- Documentar politica oficial:
  - `GameEngine.init(config)` para apps.
  - `new GameEngine(config)` para tests, previews y hosts aislados.
- Evaluar si hace falta un metodo publico `boot()` o factory no-singleton.
- Agregar tests para evitar contaminacion entre instancias.
- Revisar si `GameEngine.instance` debe exponerse como readonly legacy.

Criterios de salida:

- Docs no dejan ambiguedad sobre singleton.
- Tests cubren dos instancias aisladas.
- No se rompe `mountVnApp`.

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
