# Feature Map

Roadmap vivo del framework. Este documento contiene solo trabajo pendiente o no cerrado.

El historial de lo ya implementado vive en `CHANGELOG.md`. Si una tarea se completa, debe salir de este mapa y entrar al changelog.

## Norte Actual

El framework ya tiene una base tecnica estable para runtime, UI de jugador, datos, build y distribucion. El siguiente norte es convertir los plugins prebuilt en una libreria oficial de capacidades reutilizables que los juegos puedan activar explicitamente sin forkar el nucleo:

- Plugins oficiales importables desde `framework/plugins.ts`.
- Renderers visuales listos para backgrounds, characters y transitions.
- Plugins de efectos visuales para pantalla, atmosfera y momentos narrativos.
- Tags Ink extensibles por plugins sin contaminar el parser core.
- Plugins de experiencia de jugador para features comunes de VN.
- Plugins de tooling/dev que ayuden a depurar estado, escenas y variables.
- Contratos de datos documentados para que cada plugin sea opt-in y validable.
- Tests en fixtures tecnicos, sin depender de completar `mi-novela`.
- Documentacion con ejemplos de uso real en `game.config.ts` y datos del juego.

## Pendientes

### P1 - Pulido De Plugins Oficiales

Objetivo: elevar los plugins oficiales de "experimental funcional" a una libreria coherente y testeable.

Hallazgos:

- Hay 9 plugins oficiales en catalogo, todos `experimental`.
- Varios plugins de experiencia de jugador son perfiles documentales sobre UI core, no extension points reales todavia.
- `overlay` y `extras` estan declarados como renderer kinds, pero la documentacion indica que siguen reservados.
- Los plugins oficiales no tienen fixtures por plugin, solo pruebas unitarias del catalogo.

Alcance:

- Definir criterio para promover un plugin de `experimental` a `stable`.
- Crear fixtures minimos por categoria:
  - renderer: `inkWashBackground`, `asepriteCharacterAtlas`.
  - effects: `screenEffects`, `atmosphereEffects`.
  - player: backlog/gallery/music/preferences.
  - devtools: inspector activo.
- Separar plugins "perfil declarativo" vs plugins que registran runtime real.
- Decidir si `backlogEnhancer`, `galleryUnlocks`, `musicRoom` y `preferencesPanel` deben registrar extension points propios o renombrarse como presets/perfiles.
- Completar dispatch real para `overlay`/`extras` o sacarlos del alcance de plugins publicos.

Criterios de salida:

- Cada plugin oficial tiene prueba/fixture que demuestre su uso recomendado.
- El catalogo comunica claramente si un plugin registra runtime, declara contrato o ambas cosas.
- Al menos los plugins maduros pueden pasar a `stable` con criterios escritos.

### P2 - Ergonomia De Autor En CLI Y Devtools

Objetivo: reducir friccion para autores al crear, diagnosticar y probar juegos/plugins.

Hallazgos:

- `doctor smoke-fixture` esta limpio.
- `mi-novela` reporta solo warnings conocidos, incluyendo `devtools_plugin_enabled` porque se habilito para pruebas.
- `plugins official` lista el catalogo, pero no muestra ejemplos completos ni estado de estabilidad con detalle.
- Devtools funciona como dock, pero es lectura basica y no tiene atajos, filtros ni export de snapshot.

Alcance:

- Mejorar `plugins official`:
  - `--json`
  - `--example <pluginId>`
  - filtros combinables con salida mas compacta.
- Mejorar `doctor` para autores:
  - resumen por categoria.
  - sugerencia de comando siguiente cuando falten assets o plugins.
  - modo `--strict` para tratar warnings como errores en CI.
- Mejorar devtools:
  - atajo de teclado para abrir/cerrar.
  - busqueda de variables.
  - seccion de eventos recientes.
  - copiar/exportar snapshot JSON.
- Documentar flujo "diagnosticar una escena" usando doctor + devtools.

Criterios de salida:

- Un autor puede descubrir, activar y verificar un plugin oficial sin leer codigo fuente.
- Devtools permite depurar una escena de forma practica durante `dev`.
- Los comandos nuevos tienen pruebas CLI.

### P3 - Calidad Visual De Componentes Prebuilt

Objetivo: hacer que las UIs incluidas se sientan como componentes de framework listos para usar, no solo placeholders funcionales.

Hallazgos:

- Save/load y controles de jugador ya tienen una direccion visual mas consistente.
- Backlog, gallery, music room, settings y devtools usan estilos separados y no comparten tokens/componentes.
- Algunos controles usan texto donde convendria iconografia o controles mas especificos.
- No hay pruebas visuales dedicadas para modales/overlays salvo humo general.

Alcance:

- Crear tokens compartidos para overlays:
  - panel, header, button, input, select, list row.
- Unificar backlog/settings/gallery/music/devtools sobre esos tokens.
- Revisar accesibilidad:
  - foco inicial.
  - Escape consistente.
  - labels visibles/aria.
  - contraste.
- Agregar Playwright visual smoke para:
  - save/load.
  - backlog con filtros.
  - devtools abierto.
  - gallery/music vacios y con datos.
- Revisar responsive en viewport movil.

Criterios de salida:

- Los overlays prebuilt comparten lenguaje visual y comportamiento de teclado.
- Hay screenshots de humo para componentes clave.
- No hay regresiones de layout obvias en desktop/mobile.

### P4 - Preparacion Real De Publicacion Local

Objetivo: acercar el roadmap de packaging a una prueba real sin publicar npm ni marketplace.

Hallazgos:

- `packaging-roadmap.md` define nombres y migracion, pero falta validar una build estilo paquete.
- `package.json` sigue siendo privado y monolitico.
- No hay export maps ni smoke tests que simulen consumir `@vn-experiment/core` o `@vn-experiment/plugins`.

Alcance:

- Crear un paquete local simulado o export map interno para validar imports:
  - core.
  - react.
  - plugins.
  - manager.
- Generar un fixture que use alias estilo paquete mediante import map/local path.
- Registrar version del framework/plugins en `manifest.json`.
- Documentar peer dependencies esperadas.
- Definir que queda fuera hasta publicacion real.

Criterios de salida:

- Una prueba demuestra que el framework puede consumirse por entrypoints tipo paquete.
- El build manifest incluye version del framework y plugin API.
- No se publica nada a npm en esta fase.

## Fuera De Alcance Actual

- Optimizar o completar assets de `mi-novela`.
- Publicacion real como paquete npm hasta cerrar la politica de versionado.
- Marketplace remoto o instalacion desde internet.
- Sandbox fuerte para codigo de terceros no confiable.
- ABI estable para binarios nativos o WebAssembly externo.

## Verificacion Base

```bash
bun run verify
bun manager/cli.ts doctor smoke-fixture
bun manager/cli.ts build smoke-fixture
bun run e2e
```
