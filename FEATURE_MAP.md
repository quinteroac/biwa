# Feature Map

Roadmap vivo del framework. Este documento contiene solo trabajo pendiente o no cerrado.

El historial de lo ya implementado vive en `CHANGELOG.md`. Si una tarea se completa, debe salir de este mapa y entrar al changelog.

## Norte Actual

El framework ya tiene una base tecnica estable para runtime, UI de jugador, datos, build y distribucion. El siguiente norte es convertir los plugins prebuilt en una libreria oficial de capacidades reutilizables que los juegos puedan activar explicitamente sin forkar el nucleo:

- Mantener los entrypoints publicos y aliases tipo paquete alineados con el roadmap de publicacion.
- Ampliar plugins oficiales solo cuando tengan contrato, fixture y documentacion.
- Mantener tests en fixtures tecnicos, sin depender de completar `mi-novela`.
- Registrar en `CHANGELOG.md` cada capacidad cerrada antes de limpiar este mapa.

## Pendientes

No hay pendientes priorizados en este mapa. La siguiente pasada debe definir un nuevo bloque de trabajo antes de implementar.

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
