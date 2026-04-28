# Framework Roadmap

Roadmap de soporte del runtime/framework para que el Studio pueda crecer sin contaminar el nucleo.

## Principio De Separacion

El framework es la fuente de verdad para ejecucion, contratos, validacion y distribucion. El Studio es un cliente de esos contratos.

El framework debe seguir funcionando por CLI y codigo aunque el Studio no exista.

## Responsabilidades Del Framework

- Ejecutar VN en runtime.
- Definir y documentar contratos de datos.
- Validar proyectos con `doctor`.
- Construir distribuciones con `build`.
- Servir preview con `preview`.
- Exponer plugins, renderers y tags declarativos.
- Mantener entrypoints publicos tipo paquete.
- Generar diagnosticos consumibles por maquinas.

## Responsabilidades Del Studio

- Crear y editar proyectos.
- Presentar UI para story, assets, personajes, escenas y plugins.
- Invocar manager/CLI o APIs equivalentes.
- Mostrar diagnosticos.
- Previsualizar usando el runtime.
- Escribir archivos compatibles con el framework.

## Soporte Necesario Para El Studio

### Manager API

- Exponer funciones estables para:
  - listar proyectos.
  - leer metadata de proyecto.
  - correr doctor.
  - correr build.
  - iniciar preview.
  - listar plugins oficiales.
  - crear assets/atlas.
- Retornar JSON estructurado en vez de depender de stdout.
- Mantener el servidor local del Studio en Elysia como cliente del manager, no como reemplazo de la CLI.

### Schemas Y Contratos

- Mantener schemas documentados para:
  - `game.config.ts`.
  - characters.
  - scenes.
  - audio.
  - gallery/music/replay.
  - atlas Aseprite/GameAssetsMaker.
  - plugin manifests.
- Generar metadata suficiente para formularios del Studio.

### Ink Tooling

- Reusar `TagParser` y `TagRegistry`.
- Exponer lista de tags core.
- Exponer tags declarados por plugins instalados.
- Permitir preview textual sin arrancar UI completa.
- Reportar referencias rotas con path/line cuando sea posible.

### Asset Tooling

- Validar rutas y formatos.
- Leer thumbnails/posters.
- Parsear atlas.
- Normalizar metadata generada por el Studio.

### Plugin Tooling

- Catalogo oficial consultable por API.
- Compatibilidad por `pluginApi`.
- Declaraciones de renderers/tags/capabilities.
- Config examples parseables por UI.

### Preview Tooling

- Arrancar preview desde API.
- Permitir deep-link a proyecto, locale y punto narrativo cuando exista soporte.
- Exponer snapshots de runtime para paneles del Studio.

## Fuera Del Framework

- UI compleja de autoria.
- Monaco.
- Generacion de imagenes.
- Persistencia de preferencias del Studio.
- Marketplace remoto.
- Edicion colaborativa.
- Dependencias visuales pesadas que no necesita el runtime.

## Fases De Soporte

### Fase A - Manager Consumible Por UI

- Endpoints/funciones JSON para proyectos, doctor, build y plugins.
- Tests sin shell para los casos principales.

### Fase B - Metadata Para Formularios

- Schemas mas completos.
- Defaults y ejemplos exportables.
- Validadores reutilizables.

### Fase C - Preview Programatico

- API de preview local.
- Runtime snapshots.
- Deep links basicos.

### Fase D - Tooling Narrativo

- Tags, variables y knots expuestos para editor.
- Diagnosticos con ubicacion mas precisa.
- Soporte para coverage/branch testing.
