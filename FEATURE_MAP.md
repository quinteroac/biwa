# Feature Map

Roadmap vivo del framework y tooling de autoria. Este documento contiene solo trabajo pendiente o no cerrado.

El historial de lo ya implementado vive en `CHANGELOG.md`. Si una tarea se completa, debe salir de este mapa y entrar al changelog.

## Norte Actual

El framework se mantiene como runtime, contrato de datos, CLI y sistema de plugins. El nuevo rumbo es construir un Studio de autoria encima del framework para generar, editar, validar y previsualizar novelas visuales sin crear un formato paralelo.

Regla principal:

> Todo lo que el Studio produzca debe poder correr con el framework y la CLI sin abrir el Studio.

Roadmaps de referencia:

- `STUDIO_ROADMAP.md`: producto de autoria visual para crear VN.
- `FRAMEWORK_ROADMAP.md`: limites y soporte que el framework debe exponer para el Studio.

## Pendientes

### P6 - Herramientas Avanzadas De Autoria

Objetivo: mejorar productividad narrativa y control de calidad.

Alcance:

- Grafo de knots/choices.
- Busqueda global por dialogo, speaker, tag, variable y asset.
- Coverage narrativa de rutas alcanzables.
- Simulacion de branches.
- Notas/comentarios de guion.
- Panel de saves/debug state.
- Preparacion para localizacion.

Criterios de salida:

- El Studio ayuda a encontrar rutas rotas y contenido no usado.
- Las herramientas siguen leyendo/escribiendo contratos del framework.

### P7 - Generacion Asistida De Assets

Objetivo: preparar la integracion futura con modelos de imagen sin bloquear el Studio base.

Alcance:

- Prompts versionados para personajes y escenarios.
- Export de prompt packs.
- Integracion futura con API de imagenes.
- Cola de generacion y revision manual.
- Asociacion de resultados generados a atlas/fondos existentes.

Criterios de salida:

- La generacion asistida es opcional.
- El Studio puede operar completamente sin servicios externos.

## Fuera De Alcance Actual

- Reemplazar el framework o la CLI.
- Crear un formato propietario alternativo a `game.config.ts`, Ink y data files.
- Completar assets de `mi-novela`.
- Publicacion npm real.
- Marketplace remoto.
- Edicion colaborativa en tiempo real.
- Generacion de imagenes por API en la primera etapa del Studio.
- Sandbox fuerte para codigo de plugins de terceros no confiables.

## Verificacion Base

```bash
bun run verify
bun manager/cli.ts doctor smoke-fixture
bun manager/cli.ts build smoke-fixture
bun run e2e
```
