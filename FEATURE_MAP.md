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

No hay pendientes activos en este mapa. El siguiente roadmap debe abrirse aqui cuando definamos el proximo foco del framework.

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
