# Feature Map

Roadmap vivo del framework. Este documento contiene solo trabajo pendiente o no cerrado.

El historial de lo ya implementado vive en `CHANGELOG.md`. Si una tarea se completa, debe salir de este mapa y entrar al changelog.

## Norte Actual

El framework ya tiene una base tecnica estable para runtime, UI de jugador, datos, build y distribucion. El siguiente norte es convertir los plugins prebuilt en una libreria oficial de capacidades reutilizables que los juegos puedan activar explicitamente sin forkar el nucleo:

- Plugins oficiales importables desde `framework/plugins/prebuilt`.
- Renderers visuales listos para backgrounds, characters y transitions.
- Plugins de efectos visuales para pantalla, atmosfera y momentos narrativos.
- Tags Ink extensibles por plugins sin contaminar el parser core.
- Plugins de experiencia de jugador para features comunes de VN.
- Plugins de tooling/dev que ayuden a depurar estado, escenas y variables.
- Contratos de datos documentados para que cada plugin sea opt-in y validable.
- Tests en fixtures tecnicos, sin depender de completar `mi-novela`.
- Documentacion con ejemplos de uso real en `game.config.ts` y datos del juego.

## Pendientes

### P0 - Tag Registry Para Plugins

Objetivo: permitir que plugins declarados agreguen comandos Ink propios sin modificar el `TagParser` core.

Alcance:

- `TagRegistry` del framework:
  - registro de tags por nombre.
  - handler runtime por plugin.
  - metadata para doctor/build.
  - colisiones prohibidas con tags core y tags ya registrados.
- API en `PluginContext`:
  - `context.tags.register('effect', handler)`.
  - acceso controlado al engine/eventBus desde handlers.
  - soporte para handlers sync/async.
- Integracion con engine:
  - tags core siguen funcionando como hoy.
  - tags desconocidos se consultan en `TagRegistry`.
  - errores de handler se reportan con contexto de tag.
- Integracion con `doctor`:
  - valida tags Ink contra tags core + tags declarados por plugins.
  - diagnostico para tag desconocido con sugerencia de declarar plugin.
  - build manifest lista tags provistos por plugins.
- Contrato recomendado:
  - tags genericos por dominio, por ejemplo `# effect: shake, intensity: 0.4`.
  - evitar que cada plugin reserve muchos tags globales.

Criterios de salida:

- Un plugin puede registrar un tag Ink y reaccionar durante runtime.
- `doctor` reconoce tags registrados por plugins declarados.
- No se permite sobrescribir tags core.
- Tests cubren registro, colision, dispatch y validacion.

### P1 - Renderers Visuales Oficiales

Objetivo: cubrir los renderers visuales mas utiles para una VN sin dependencias externas pesadas.

Alcance:

- Mejorar `officialPlugins.inkWashBackground()`:
  - soporte completo de variantes.
  - overlays configurables.
  - docs con schema informal de opciones.
- Nuevo `officialPlugins.layeredBackground()`:
  - capas estaticas.
  - parallax opcional.
  - tint/blur por capa.
- Nuevo `officialPlugins.spriteCharacter()`:
  - renderer de character explicitamente documentado para atlas Aseprite.
  - controles de scale, anchor, offset y fps.
- Nuevo `officialPlugins.simpleTransitions()`:
  - fade, fade-color, slide, iris o wipe como renderer externo oficial.

Criterios de salida:

- `smoke-fixture` cubre al menos un plugin visual oficial.
- Docs muestran ejemplos YAML/Markdown para cada renderer.
- `bun run verify` pasa.

### P2 - Plugins De Efectos Visuales

Objetivo: ofrecer efectos narrativos reutilizables sin que cada juego implemente overlays, timers y limpieza manualmente.

Alcance:

- Contrato de efectos sobre `TagRegistry`:
  - efectos disparados por Ink: `# effect: shake, intensity: 0.4, duration: 0.3`.
  - efectos persistentes por escena: `effects:` en scene data.
  - stacking: multiples efectos simultaneos con orden estable.
  - limpieza automatica por duracion, cambio de escena o fin de efecto.
- `officialPlugins.screenEffects()`:
  - shake.
  - flash.
  - vignette.
  - blur/desaturate.
  - pulse/heartbeat.
- `officialPlugins.atmosphereEffects()`:
  - rain overlay.
  - snow.
  - fog.
  - dust/light particles simples.
- Docs con recetas:
  - susto/golpe.
  - memoria/sueno.
  - lluvia persistente en escena.
  - peligro/tension.
- Tests de runtime:
  - efecto temporal se monta y desmonta.
  - efecto persistente se restaura al cambiar escena.
  - multiples efectos no bloquean el avance del dialogo.

Criterios de salida:

- Un autor puede declarar efectos desde Ink y scene data sin tocar React.
- Los efectos funcionan como plugins oficiales opt-in.
- `doctor` valida tipos de efectos desconocidos cuando el plugin no esta declarado.

### P3 - Plugins De Experiencia De Jugador

Objetivo: mover features comunes de VN hacia plugins oficiales opt-in cuando no deban vivir obligatoriamente en el core.

Alcance:

- `officialPlugins.backlogEnhancer()`:
  - busqueda simple.
  - filtros por speaker.
  - replay de linea cuando exista voice.
- `officialPlugins.galleryUnlocks()`:
  - UI de gallery basada en extras existentes.
  - contratos para thumbnails/locked state.
- `officialPlugins.musicRoom()`:
  - UI de music room basada en extras existentes.
  - preview, loop y metadata.
- `officialPlugins.preferencesPanel()`:
  - panel extendido para accesibilidad y preferencias.

Criterios de salida:

- Las features siguen disponibles para juegos simples, pero quedan activables como plugins oficiales cuando sea razonable.
- No se rompen los overrides actuales de `VnStage`.

### P4 - Devtools Y Diagnostico En Runtime

Objetivo: ofrecer herramientas oficiales para autores mientras desarrollan.

Alcance:

- `officialPlugins.devtools()`:
  - inspector de escena actual.
  - variables Ink/runtime.
  - personajes activos.
  - audio activo.
  - plugins y renderers registrados.
- Modo dev-only recomendado:
  - docs para activarlo solo en desarrollo.
  - advertencia si se incluye en build de produccion.
- Eventos de diagnostico estables para plugins.

Criterios de salida:

- Un autor puede depurar una escena sin abrir internals del engine.
- `doctor` o build advierte si devtools se empaqueta accidentalmente.

### P5 - Assets Y Generacion Asistida

Objetivo: conectar el flujo de assets que ya existe con plugins oficiales de render.

Alcance:

- `officialPlugins.asepriteCharacterAtlas()`:
  - renderer/documentacion especifica para atlas generados por la CLI.
  - validaciones de frameTags y expresiones.
- Recetas para el flujo:
  - `assets character-atlas`.
  - editar/generar spritesheet.
  - declarar character.
  - renderizar con plugin oficial.
- Preparar contrato para futura generacion via API de imagenes sin implementarla todavia.

Criterios de salida:

- El formato ComfyUI/GameAssetsMaker queda como contrato documentado del framework.
- El motor, doctor y plugin oficial aceptan el mismo formato.

### P6 - Packaging Futuro

Objetivo: preparar publicacion sin implementarla antes de cerrar versionado.

Alcance:

- Diseno de nombres de paquete:
  - core framework.
  - plugins oficiales.
  - templates.
- Politica semver de plugins oficiales.
- Estrategia de changelog por plugin.
- Plan de migraciones cuando `pluginApi` cambie.

Criterios de salida:

- Hay una decision documentada para pasar de imports locales a paquetes publicables.
- No se implementa marketplace remoto en esta fase.

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
