# Studio Roadmap

Roadmap del frontend de autoria para crear novelas visuales compatibles con el framework.

## Principio De Producto

El Studio es una herramienta de autoria. No reemplaza al framework, no reemplaza la CLI y no introduce un formato paralelo.

El Studio debe escribir y leer los mismos contratos que ya usa el runtime:

- `game.config.ts`
- archivos `.ink`
- `data/**/*.md` o JSON generado desde esos datos
- `assets/**`
- plugins declarados en config
- atlas JSON compatibles con Aseprite/GameAssetsMaker

## Stack Decidido

- Backend local: Elysia sobre Bun.
- Frontend: React 19 + TypeScript.
- Dev/build frontend: Vite.
- Data fetching: TanStack Query.
- Rutas futuras: TanStack Router.
- Editor futuro de Ink: Monaco.
- Visual design: CSS propio basado en `DESIGN.md`, sin UI kit pesado.

El backend Elysia coordina lectura, validacion y acciones del manager. El frontend muestra y edita; no debe duplicar la logica de validacion del framework.

## Usuarios Objetivo

- Autores que quieren crear una VN sin editar cada archivo a mano.
- Desarrolladores que quieren acelerar setup, validacion y preview.
- Artistas/narradores que necesitan ver personajes, fondos y dialogos en contexto.
- Autores de plugins que quieren validar integracion en proyectos reales.

## Experiencia Base

El Studio debe sentirse como una app de trabajo, no como landing page:

- sidebar de proyectos y secciones.
- panel principal denso y escaneable.
- inspector contextual.
- acciones claras: crear, editar, validar, preview, build.
- errores del framework visibles y accionables.

## Modulos

### 1. Project Manager

- Listar proyectos en `games/`.
- Crear proyecto desde template.
- Abrir proyecto.
- Duplicar proyecto.
- Mostrar estado: valido, warnings, errores.
- Acceso rapido a preview/build.

### 2. Project Overview

- Metadata principal.
- Locales.
- Story entrypoints.
- Conteo de personajes, escenas, audio, plugins y assets.
- Resumen de diagnosticos.
- Acciones recomendadas.

### 3. Story Editor

- Monaco editor para Ink.
- Explorador por locale/archivo.
- Preview textual de dialogos y choices.
- Insercion asistida de tags core y tags de plugins.
- Lint en vivo usando contratos del framework.
- Panel de variables y knots cuando el parser lo permita.

### 4. Scene Designer

- Crear/editar escenas.
- Preview de fondo.
- Variantes por hora/clima/mood.
- Fit, position, poster y thumbnail.
- Composicion simple con personajes activos.
- Prompt base para generacion futura.

### 5. Character Designer

- Ficha narrativa de personaje.
- Metadata runtime del personaje.
- Expresiones, outfits y variantes.
- Preview de sprites.
- Atlas JSON Aseprite/GameAssetsMaker.
- Ajustes de escala, offset y eje Y.
- Prompt base para generacion futura.

### 6. Asset Library

- Navegacion por tipo de asset.
- Importar archivos.
- Detectar rutas rotas.
- Ver thumbnails/previews.
- Validar formatos esperados.
- Relacionar assets con escenas/personajes/audio.

### 7. Plugin Manager

- Catalogo de plugins oficiales.
- Instalar/remover plugins del proyecto.
- Mostrar capacidades y compatibilidad.
- Configuracion visual basica.
- Tags/renderers disponibles para el editor Ink.
- Validacion con `doctor`.

### 8. Preview And Build

- Preview jugable embebido.
- Preview desde inicio, escena o knot.
- Panel de runtime: variables, escena, personajes, audio, plugins.
- Ejecutar build.
- Ver manifest y diagnosticos.
- Historial local de builds.

### 9. Quality Tools

- Busqueda global.
- Grafo de knots/choices.
- Branch testing.
- Coverage narrativa.
- Reporte de assets no usados.
- Reporte de referencias rotas.

### 10. Assisted Generation

Esta capa llega despues de tener el Studio base.

- Prompts versionados para personajes.
- Prompts versionados para escenarios.
- Export de prompt packs.
- Integracion futura con API de imagenes.
- Revision manual antes de escribir assets finales.

## Fases Recomendadas

### Fase 0 - Arquitectura Del Studio

- Codigo del Studio en `studio/`.
- API local Elysia en `studio/server`.
- Frontend React/Vite en `studio/app`.
- Definir persistencia de preferencias del Studio.
- Definir como arrancar preview/build desde UI.

### Fase 1 - Project Manager

- App shell.
- Listado de proyectos.
- Overview de proyecto.
- Doctor integrado.

### Fase 2 - Story Editor

- Monaco.
- Abrir/guardar Ink.
- Preview textual.
- Insercion de tags.

### Fase 3 - Assets Y Escenas

- Asset library.
- Editor de escenas.
- Preview visual basico.

### Fase 4 - Personajes

- Character sheets.
- Metadata de personajes.
- Atlas JSON.
- Preview de sprites.

### Fase 5 - Plugins

- Catalogo oficial.
- Instalacion/configuracion.
- Tags/renderers disponibles para Story Editor.

### Fase 6 - Preview/Build

- Preview jugable embebido.
- Build desde UI.
- Manifest y diagnosticos.

### Fase 7 - QA Narrativo

- Grafo.
- Branch testing.
- Coverage.

### Fase 8 - Generacion Asistida

- Prompts.
- Integracion opcional con servicios externos.
- Cola y revision de assets generados.

## Riesgos

- Duplicar logica de validacion en el frontend.
- Crear un formato visual que no pueda correr sin Studio.
- Mezclar runtime con tooling.
- Subestimar edicion segura de `game.config.ts`.
- Introducir dependencias pesadas en el framework en vez del Studio.

## Decisiones Pendientes

- Edicion estructurada de `game.config.ts`: AST vs plantilla controlada.
- Persistencia de estado del Studio.
- Estrategia de tests visuales del Studio.
- Si build/preview usaran HTTP streaming, SSE o WebSocket para logs en vivo.
