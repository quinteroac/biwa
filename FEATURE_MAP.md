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

No hay pendientes priorizados en este mapa despues del cierre de Packaging Futuro.

Para abrir el siguiente ciclo, hacer un nuevo recorrido del framework y crear un mapa con foco en:

- estabilidad de APIs publicas.
- pulido de plugins oficiales.
- ergonomia de autor en CLI/devtools.
- calidad visual de componentes prebuilt.
- preparacion real de publicacion si ya se decide salir del modo local.

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
