# Feature Map

Roadmap vivo del framework. Este documento contiene solo trabajo pendiente o no cerrado.

El historial de lo ya implementado vive en `CHANGELOG.md`. Si una tarea se completa, debe salir de este mapa y entrar al changelog.

## Norte Actual

El framework ya tiene una base tecnica estable para runtime, UI de jugador, datos, build y distribucion. El siguiente norte es convertirlo en una plataforma extensible donde juegos y terceros puedan agregar comportamiento visual sin forkar el nucleo:

- Plugins declarativos con manifiesto, lifecycle y validacion.
- Renderers externos para backgrounds, characters, transitions, overlays y extras.
- Contratos estables entre engine, data, UI React y build output.
- Tooling CLI para crear, validar, listar y empaquetar plugins.
- Seguridad basica para evitar carga accidental de codigo no declarado.
- Tests en fixtures tecnicos, sin depender de completar `mi-novela`.
- Documentacion que explique contratos de runtime, UI, datos y distribucion.

## Pendientes

### P0 - Contrato Base De Plugins

Objetivo: definir la unidad minima de plugin que el framework puede descubrir, validar y cargar sin acoplarse a una novela concreta.

Estado: completado. El detalle vive en `CHANGELOG.md` y `framework/docs/plugins.md`.

Alcance cerrado:

- Definir `vn-plugin.json` o `plugin.config.ts` con `id`, `name`, `version`, `type`, `entry`, `capabilities` y `compatibility`.
- Tipar `VnPluginManifest`, `VnPluginModule`, `VnPluginContext` y errores publicos.
- Crear `PluginRegistry` en framework para registrar plugins por id.
- Resolver plugins desde `game.config.ts` sin ejecutar codigo no declarado.
- Agregar lifecycle minimo: `setup(context)`, `dispose()`.
- Exponer contexto limitado: `engine`, `eventBus`, `assetBase`, `gameId`, `logger`.
- Tests de manifest valido/invalido, registro duplicado y lifecycle.

Criterios de salida:

- Un juego puede declarar plugins en config.
- El framework valida manifiestos antes de cargar entrypoints.
- Plugins duplicados o incompatibles fallan con diagnosticos claros.
- `bun run verify` sigue pasando con fixture sin plugins.

### P1 - Renderers Externos

Objetivo: permitir que plugins registren renderers visuales reemplazables sin tocar `VnStage`.

Alcance:

- Crear contratos para:
  - `backgroundRenderer`
  - `characterRenderer`
  - `transitionRenderer`
  - `overlayRenderer`
  - `extrasRenderer`
- Crear `RendererRegistry` con lookup por `type`.
- Hacer que `VnBackground`, `VnCharacter` y `VnTransition` consulten el registry antes de caer a renderers internos.
- Definir props estables para cada renderer externo.
- Soportar fallback explicito si un renderer no existe o falla.
- Tests SSR/unitarios para dispatch, fallback y errores.

Criterios de salida:

- Un plugin puede registrar un renderer `background.type = custom-id`.
- Un renderer externo puede renderizar sin modificar componentes core.
- Si falta el renderer, `doctor` y runtime muestran una causa accionable.

### P2 - Tooling CLI Y Doctor

Objetivo: que desarrollar plugins sea un flujo soportado por la suite de manager.

Alcance:

- `manager plugins list <gameId>` para ver plugins declarados, cargables e incompatibles.
- `manager plugins scaffold <pluginId>` para crear estructura base.
- `manager plugins validate <path|gameId>` para validar manifiesto, entry y capabilities.
- `doctor` valida:
  - plugin declarado pero no encontrado.
  - entry inexistente.
  - capability desconocida.
  - renderer usado por data pero no declarado.
  - version incompatible del framework.
- Build copia/transpila plugins al `dist` con rutas relativas.
- Manifest de build incluye plugins y renderers registrados.

Criterios de salida:

- Un plugin scaffold pasa validacion desde cero.
- `doctor` detecta errores comunes antes de runtime.
- `build smoke-fixture` mantiene salida limpia sin plugins.

### P3 - Distribucion Y Seguridad

Objetivo: poder distribuir juegos con plugins sin romper el modo standalone/static/portal/embedded.

Alcance:

- Politica de carga: solo plugins declarados en config.
- Aislar nombres de plugins y evitar ids reservados por framework.
- Documentar limites: los plugins son codigo de confianza del juego, no sandbox fuerte.
- Compatibilidad con import map y rutas relativas en build.
- Estrategia de versionado para contratos de plugin.
- Hooks de migracion si un contrato cambia.
- Fixture con plugin real de ejemplo en CI.

Criterios de salida:

- El build standalone puede cargar un plugin local.
- El manifest de distribucion describe plugins y capabilities.
- Docs explican que se puede considerar estable y que es experimental.

### P4 - Ecosistema Y DX

Objetivo: hacer que crear renderers y plugins sea ergonomico para autores.

Alcance:

- Docs completas:
  - crear primer plugin.
  - crear renderer de background.
  - crear renderer de character.
  - empaquetar plugin local.
  - diagnosticar errores.
- Templates de plugin con tests.
- Ejemplo de renderer externo no trivial.
- Guia de compatibilidad semver.
- Recetas para integrar librerias externas como Three.js, Pixi.js o Spine cuando existan dependencias.

Criterios de salida:

- Un autor puede crear un plugin siguiendo docs sin leer codigo interno.
- Templates tienen tests y pasan `bun run verify`.

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
