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
