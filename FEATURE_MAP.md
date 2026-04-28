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

### P1 - Devtools Y Diagnostico En Runtime

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

### P2 - Assets Y Generacion Asistida

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

### P3 - Packaging Futuro

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
