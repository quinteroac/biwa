# Feature Map

Roadmap vivo del framework. Este documento contiene solo trabajo pendiente o no cerrado.

El historial de lo ya implementado vive en `CHANGELOG.md`. Si una tarea se completa, debe salir de este mapa y entrar al changelog.

## Norte Actual

El framework ya tiene una base tecnica estable. El siguiente norte es que la experiencia del jugador se sienta completa, comoda y propia de una visual novel robusta:

- Lectura fluida con controles esperados por jugadores de VN.
- Estado de jugador persistente mas alla de save/load basico.
- Menus y overlays que puedan personalizarse igual que el stage.
- Features testeadas en fixtures tecnicos, sin depender de completar `mi-novela`.
- Documentacion que explique contratos de runtime, UI y datos.

## Pendientes

No hay pendientes activos despues del cierre del bloque de features de jugador. El siguiente roadmap debe salir de un nuevo recorrido tecnico y de producto.

## Fuera De Alcance Actual

- Optimizar o completar assets de `mi-novela`.
- Sistema completo de plugins/renderers externos.
- Publicacion real como paquete npm hasta cerrar la politica de versionado.

## Verificacion Base

```bash
bun run verify
bun manager/cli.ts doctor smoke-fixture
bun manager/cli.ts build smoke-fixture
bun run e2e
```
