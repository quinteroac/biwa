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
