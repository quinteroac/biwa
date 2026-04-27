# Feature Map

Plan de trabajo para llevar el visual novel framework desde una alfa funcional hasta un framework robusto, mantenible y agradable para crear juegos.

## Estado actual

El proyecto ya tiene una base útil:

- Motor narrativo con Ink mediante `ScriptRunner`.
- `GameEngine` con estados, avance, elecciones, transiciones, fin de juego y minijuegos.
- UI React con start menu, stage, dialogo, elecciones, transiciones, save/load, quick save, end screen y controles de volumen.
- CLI para `dev`, `build`, `new` y `list`.
- Schemas y documentacion para config, escenas, personajes, audio, minijuegos y estructura de proyecto.
- Juego demo en `games/mi-novela`.
- Suite de tests amplia para varias piezas criticas.

El framework ya tiene un baseline tecnico verde en este corte, pero todavia no esta listo como producto robusto porque:

- `bun run check` pasa, pero aun falta ampliar la cobertura hacia contratos publicos, build final, data pipeline y escenarios end-to-end.
- Hay desfase entre documentacion y runtime. Algunos docs prometen capacidades que aun son parciales o no existen en implementacion.
- Parte de la arquitectura sigue acoplada a `VnStage`, especialmente audio.
- El pipeline de contenido carga solo parte de los datos declarados en `game.config.ts`.

## Principios de producto

- El framework debe ser confiable antes de ser grande.
- Cada feature documentada debe estar implementada, validada y probada, o marcada como experimental.
- La experiencia del creador importa tanto como la experiencia del jugador.
- El motor debe ser usable sin React; React debe ser una capa por encima, no el centro de la logica.
- El juego demo debe actuar como fixture real: todo lo que se promete debe poder verse ahi.

## Fase 0: Baseline verde

Objetivo: tener una base verificable antes de crecer.

Estado: completada en el primer corte de implementacion.

### Features

- Script `test` en `package.json`.
- Script `typecheck` en `package.json`.
- Script `check` que ejecute test + typecheck.
- Suite `bun test` completamente verde.
- `bunx tsc --noEmit` verde o reemplazado por un typecheck oficial equivalente.
- Estado del worktree documentado antes de cada iteracion.

### Tareas clave

- Decidir estrategia de imports TypeScript:
  - habilitar `allowImportingTsExtensions`, o
  - remover extensiones `.ts/.tsx` de imports fuente y ajustar bundling.
- Corregir tests fallidos en:
  - `VnStartMenu`
  - `VnEndScreen`
  - `SaveLoadMenu`
- Corregir errores de `exactOptionalPropertyTypes`.
- Corregir paths de minijuegos demo hacia `framework/minigames/MinigameBase.ts`.
- Revisar tipos de `Bun.build` y `globalThis.jsYaml`.

### Criterios de salida

- `bun test` pasa sin fallos.
- `bun run typecheck` pasa sin fallos.
- `bun run check` existe y pasa.
- No hay tests que dependan de estilos obsoletos.

### Resultado del corte

- Agregados scripts `test`, `typecheck` y `check`.
- Configurado TypeScript para imports locales con extension y no-emision.
- Corregidos fallos de tests en start menu, end screen, save/load y quick save.
- Corregidos errores estrictos en props opcionales, watchers, spritesheet indexing, Bun build config y paths de minijuegos demo.
- Verificacion final: `bun run check` pasa.

## Fase 1: Contrato publico del framework

Objetivo: definir con precision que API ofrece el framework.

Estado: iniciada.

### Features

- Referencia oficial de tags Ink soportados.
- Eventos del engine tipados y documentados.
- API publica de `GameEngine` documentada.
- Contrato de save/load versionado.
- Contrato de minijuegos versionado.
- Una sola fuente de verdad para parseo de tags.

### Tareas clave

- Unificar `TagParser` y el parser interno de `ScriptRunner`.
- Crear tipos para eventos como `engine:dialog`, `engine:choices`, `engine:scene`, `engine:bgm`, `engine:minigame:start`.
- Revisar si `GameEngine.init()` singleton debe convivir con `new GameEngine(config)` para tests, previews y portales.
- Documentar comandos de runtime:
  - `start`
  - `advance`
  - `choose`
  - `getState`
  - `restoreState`

### Criterios de salida

- No hay parsing duplicado de tags.
- Los eventos principales estan tipados desde engine hasta UI.
- La documentacion de API coincide con la implementacion.
- Se puede instanciar el engine de forma confiable en tests sin contaminacion global.

### Resultado del primer corte

- `ScriptRunner` ahora usa `TagParser` como unica fuente de parseo de tags.
- `TagCommand` se reexporta desde `ScriptRunner` para preservar imports existentes.
- Quedan pendientes el mapa tipado de eventos, la referencia publica de tags y la documentacion formal de API.

## Fase 2: Pipeline de contenido

Objetivo: hacer que los datos del juego sean consistentes, validables y previsibles.

Estado: iniciada.

### Features

- Carga runtime de `characters`, `scenes`, `audio` y `minigames`.
- Generacion de `index.json` durante build.
- Validacion de frontmatter contra schemas.
- Verificacion de assets referenciados.
- Comando `doctor`.

### Tareas clave

- Extender `GameEngine` para cargar datos de audio y minijuegos.
- Crear loader compartido para directorios de datos.
- Validar existencia de:
  - story locale
  - imagenes de backgrounds
  - sprites
  - atlas de spritesheet
  - audio files
  - entries de minijuegos
- Convertir warnings silenciosos en errores accionables para `doctor` y `build`.
- Mantener tolerancia en `dev` cuando convenga, pero mostrar diagnosticos claros.

### Criterios de salida

- `bun manager/cli.ts doctor mi-novela` existe.
- `doctor` detecta data invalida y assets faltantes.
- `build` produce un paquete con indices de data completos.
- El demo pasa `doctor`.

### Resultado del primer corte

- `GameEngine` carga `characters`, `scenes`, `audio` y `minigames`.
- Tags de audio enriquecen sus eventos con metadata de `data/audio` cuando existe.
- Minijuegos reciben config por defecto desde `data/minigames` mezclada con overrides del tag.
- `dev` sirve `index.json` recursivos para carpetas de data anidadas.
- `build` genera `index.json` para `data/` y subdirectorios.
- Agregado comando `doctor` y script `bun run doctor`.
- `doctor mi-novela` termina con 0 errores y warnings accionables de assets faltantes.

## Fase 3: Audio robusto

Objetivo: convertir audio en un subsistema centralizado y confiable.

Estado: iniciada.

### Features

- `VolumeController` como fuente unica de volumen.
- Canales: `master`, `bgm`, `sfx`, `voice`, y decision explicita para `ambience`.
- Mute persistente.
- Volumen persistente por canal.
- BGM con play, stop, fade in, fade out.
- SFX one-shot con multiples instancias.
- Voice line con reemplazo controlado.
- Ambience independiente de BGM.

### Tareas clave

- Extraer `AudioManager` fuera de `VnStage`.
- Eliminar duplicacion entre controladores de engine y audio en UI.
- Resolver si los tags de audio usan:
  - `# bgm: theme`
  - `# bgm: play, src: ...`
  - ambos con compatibilidad.
- Implementar soporte de metadata desde `data/audio`.
- Agregar tests de mezcla efectiva: `master * channel * trackVolume`.

### Criterios de salida

- Todo audio pasa por un subsistema unico.
- Cambiar volumen afecta fuentes activas y futuras.
- Stop/fade funcionan para BGM y ambience.
- La UI de volumen refleja estado real y persistido.

### Resultado del primer corte

- `VolumeController` persiste volumen por canal en `localStorage`.
- `VolumeController` soporta mute persistente sin destruir los valores de canal.
- Las fuentes registradas ahora tienen volumen base propio antes de la mezcla `master * channel`.
- `VnStage` delega mezcla, persistencia y actualizacion de fuentes activas a `VolumeController`.
- SFX registra multiples instancias y las desregistra al terminar.
- BGM, ambience y voice se desregistran correctamente al detenerse o reemplazarse.
- Tags con id `stop` detienen BGM, ambience o voice desde el audio manager del stage.
- Decision actual: ambience comparte canal `bgm` hasta que exista un quinto canal dedicado.
- Verificacion final: `bun run check` pasa con 283 tests.

## Fase 4: Renderers visuales

Objetivo: alinear lo que el framework promete con lo que renderiza.

Estado: iniciada.

### Features base

- Background static con `image`, `variants`, `fit` y `position`.
- Background parallax con layers, variants e intensidad consistente.
- Background video con `file`, `poster` y `fit`.
- Character sprites.
- Character spritesheet.
- Character layers.
- Posicionamiento con `defaultPosition`, `scale` y `offset`.

### Features experimentales o plugin

- Spine characters.
- Rive characters.
- Spine backgrounds.
- Canvas backgrounds.
- Three.js backgrounds.

### Tareas clave

- Marcar como `experimental` lo que no este listo.
- Crear interfaz de renderer para backgrounds.
- Crear interfaz de renderer para personajes.
- Evitar que data demo use features no soportadas sin fallback visible.
- Agregar fallback de renderer con mensaje de diagnostico en dev.

### Criterios de salida

- Cada tipo documentado esta implementado o marcado experimental.
- El demo no queda en blanco si falta un renderer.
- Hay tests para seleccion de renderer y fallback.

### Resultado del primer corte

- `VnBackground` respeta `fit`, `position`, `poster` y variants para backgrounds static/video.
- `VnBackground` soporta variants de parallax con layers e intensidad propias.
- `GameEngine` conserva metadata del tag de escena, incluyendo `variant`, al emitir `engine:scene`.
- `VnStage` pasa `variant` a `VnBackground`.
- `VnStage` usa `defaultPosition` y `defaultExpression` de `characters.md` cuando el tag no los especifica.
- `VnCharacter` aplica `scale` y `offset` desde character data.
- `VnBackground` y `VnCharacter` muestran fallback visible para renderers no soportados.
- Agregados tests de helpers de background y fallback/posicionamiento de personaje.
- Verificacion final: `bun run check` pasa con 288 tests.

## Fase 5: Save/load serio

Objetivo: guardar y restaurar una partida completa, no solo el estado de Ink.

### Features

- Snapshot de story state.
- Snapshot de variables.
- Snapshot de escena actual.
- Snapshot de personajes visibles.
- Snapshot de audio actual.
- Snapshot de locale.
- Metadata de slot con escena, fecha, playtime y thumbnail opcional.
- Migraciones por version de save y version del juego.

### Tareas clave

- Definir `GameSaveState` completo.
- Hacer que `GameEngine.getState()` no use placeholders como `playtime: 0`.
- Restaurar visuales sin depender de avanzar el script.
- Agregar thumbnails de escena si existen.
- Revisar auto-save para que use config por juego y no claves globales ambiguas.

### Criterios de salida

- Cargar una partida restaura lo que el jugador ve y oye.
- Las migraciones tienen tests.
- Save/load funciona despues de cambiar de escena y con personajes activos.

### Estado fase 5

- `GameSaveState` ahora incluye `visual` con escena, personajes visibles, audio persistente y locale.
- `SaveMeta` soporta `thumbnail` opcional y `playtime` ya se calcula desde tiempo real/restaurado.
- `SaveManager` persiste y carga snapshots visuales sin romper saves antiguos.
- `GameEngine.getState()` captura story state, variables, escena actual, personajes visibles, audio persistente y locale.
- `GameEngine.restoreState()` reemite escena/personajes/audio desde el snapshot visual antes de avanzar el script.
- `GameEngine` mantiene internamente estado visual al procesar tags `scene`, `character`, `bgm`, `ambience` y `voice`.
- Agregados tests de persistencia visual en `SaveManager` y de snapshot/restore visual en `GameEngine`.
- Verificacion final: `bun run check` pasa con 291 tests.

### Pendientes fase 5

- La UI de slots todavia no muestra thumbnails aunque el dato ya se guarda.
- Las migraciones existen en `SaveManager`, pero falta una migracion real documentada para un cambio futuro de schema.
- Auto-save sigue teniendo toggle UI global (`vn:autoSave`) aunque el storage de slots ya usa `gameId`.

## Fase 6: Tooling para creadores

Objetivo: que crear una novela sea directo y con errores comprensibles.

### Features

- `new` genera un proyecto que pasa `doctor`, `build` y `check`.
- `dev` muestra errores legibles de Ink/data/assets.
- `build` falla cuando la salida seria rota.
- Watch mode para Ink y data.
- Guia de primer juego.
- Guia de tags Ink.
- Guia de data files.

### Tareas clave

- Actualizar template de `new` a TypeScript actual.
- Alinear docs que dicen `game.config.js` con la realidad `game.config.ts`.
- Agregar mensajes de error con ruta, campo y sugerencia.
- Incluir ejemplos minimos por feature.

### Criterios de salida

- Un usuario puede crear un juego nuevo y verlo en menos de 5 minutos.
- Errores comunes tienen mensajes accionables.
- La documentacion coincide con el template generado.

### Estado fase 6

- `new` valida `gameId`, usa instrucciones CLI actuales y genera un starter completo con `game.config.ts`, historia, escena default y asset SVG.
- El proyecto generado por `new` pasa `doctor` y `build` sin errores ni warnings.
- `doctor` ahora expone `validateGame()` reutilizable y agrega sugerencias accionables por issue.
- `build` ejecuta validacion de contenido antes de producir salida y falla si `doctor` encuentra errores.
- `build` compila solo los story entrypoints declarados en `game.config.ts`, dejando que Ink resuelva `INCLUDE` sin intentar compilar chapters sueltos como entradas independientes.
- `dev` muestra diagnosticos con sugerencias para errores de transpile, Ink y data, y comunica que recompila story/data/assets bajo demanda.
- Documentacion actualizada de `game.config.ts`, estructura de proyecto y minijuegos TypeScript.
- Agregadas guias `framework/docs/first-game.md` e `framework/docs/ink-tags.md`.
- Smoke temporal: `new phase6-smoke`, `doctor phase6-smoke` y `build phase6-smoke` pasaron; el proyecto temporal fue eliminado.
- Verificacion final: `bun run check`, `doctor mi-novela` y `build mi-novela` pasan.

### Pendientes fase 6

- Watch mode formal con eventos de consola por archivo cambiado; el dev server ya recompila bajo demanda, pero no tiene watcher visible por archivo.
- Falta una suite automatizada dedicada para CLI `new/doctor/build`; hoy se verifico con smoke manual.
- Los warnings de assets del demo siguen vivos como deuda de contenido, no de tooling.

## Fase 7: Customizacion y extension

Objetivo: permitir juegos distintos sin modificar `framework/`.

### Features

- API estable para reemplazar start menu.
- API estable para reemplazar dialog UI.
- API estable para reemplazar save UI.
- Slots o props para componentes internos de `VnStage`.
- Sistema de plugins para renderers.
- Sistema de plugins para minijuegos.

### Tareas clave

- Convertir `VnStage` en composable o aceptar overrides.
- Publicar contratos de props para componentes reemplazables.
- Separar componentes presentacionales de orquestacion.
- Crear ejemplo de UI custom en `games/`.

### Criterios de salida

- Un juego puede personalizar UI sin editar framework.
- Los overrides estan tipados.
- Hay ejemplo funcional de custom shell.

### Estado fase 7

- `VnStage` acepta `components` con overrides tipados para background, character, dialog, choices, transition, save menu, save controls y volume control.
- `mountVnApp` acepta `components` para reemplazar start menu, end screen, stage completo o `stageComponents` internos.
- Exportados contratos de props para componentes reemplazables: `VnBackgroundProps`, `VnCharacterProps`, `VnDialogProps`, `VnChoicesProps`, `VnTransitionProps`, `VnEndScreenProps`, `VnStageProps`, `VnStageComponents`, `VnAppOptions`.
- Los defaults actuales siguen intactos cuando no se pasan overrides.
- Agregados tests estructurales y SSR para overrides de `VnStage` y opciones custom de `mountVnApp`.
- Actualizada `framework/docs/customizing-components.md` con el flujo recomendado de slots y ejemplos de `StartMenu`/`Dialog` custom.
- Verificacion final: `bun run check` pasa con 294 tests; `doctor mi-novela` y `build mi-novela` pasan.

### Pendientes fase 7

- Falta un ejemplo funcional dentro de `games/` con UI custom real; por ahora el ejemplo vive en docs y tests.
- El sistema de plugins para renderers externos queda modelado como slots React, pero no hay registry declarativo por `game.config.ts`.
- El sistema de plugins de minijuegos sigue usando el map lazy `config.minigames`; falta una capa de plugin metadata/versionado.

## Fase 8: Distribucion

Objetivo: poder publicar juegos de forma confiable.

### Features

- Build standalone.
- Build portal.
- Build embedded.
- Base path consistente para assets.
- Reporte de tamaño de bundle.
- Import maps o bundling definidos como estrategia oficial.

### Tareas clave

- Decidir si runtime final usa vendor files, bundle unico o ambos.
- Probar build en servidor estatico.
- Validar rutas relativas y `basePath`.
- Incluir smoke test post-build.

### Criterios de salida

- `bun run build mi-novela` produce una carpeta navegable.
- El build funciona fuera del dev server.
- Assets, story y data cargan bajo subpath.

### Estado fase 8

- `build` ahora limpia `dist/<gameId>` antes de escribir, evitando artefactos viejos.
- Estrategia oficial definida: `esm-vendor-importmap`.
- El framework y los modulos del juego se transpilan de TS/TSX a ESM `.js`.
- `index.html` final usa imports relativos y vendor import map para React/React DOM.
- Minijuegos TS se transpilan a JS con imports relativos corregidos dentro de `dist`.
- `build` ejecuta smoke post-build: archivos requeridos, story locales, import map, URLs no absolutas e imports JS relativos dentro de `dist`.
- `build` escribe `manifest.json` con modo de distribucion, estrategia, entrypoint, warnings y tamaños.
- `build` imprime reporte de tamaño por framework, assets, story, data y total.
- Verificado servidor estatico bajo subpath `/mi-novela/` sirviendo `dist/`: `index.html`, `game.config.js`, `framework/engine/GameEngine.js`, `story/es/main.json`, `data/index.json` y `manifest.json` responden correctamente.
- Agregada guia `framework/docs/distribution.md`.
- Verificacion final: `bun run check` pasa con 294 tests y `bun manager/cli.ts build mi-novela` pasa.

### Pendientes fase 8

- Los modos `portal`, `embedded` y `static` comparten salida relativa funcional, pero aun no generan wrappers/manifests especificos por portal.
- Falta smoke de navegador real con Playwright para confirmar render/hidratacion, no solo resolucion estatica de archivos.
- Assets del demo pesan mucho; conviene una fase de optimizacion o fixtures livianos para CI.

## Fase 9: Calidad de producto

Objetivo: hacer que el framework se sienta estable y mantenible a largo plazo.

### Features

- CI con test, typecheck y build demo.
- Coverage minimo para engine, save/load, parser y CLI.
- Changelog.
- Versionado semantico.
- Guia de contribucion.
- Matriz de compatibilidad de features.

### Tareas clave

- Crear `README.md` publico.
- Crear `CHANGELOG.md`.
- Crear `CONTRIBUTING.md`.
- Agregar fixtures de juegos pequenos para tests.
- Agregar pruebas end-to-end basicas si se adopta Playwright.

### Criterios de salida

- Cada PR puede verificar que no rompe el framework.
- Los cambios publicos quedan documentados.
- El roadmap se puede ejecutar por iteraciones pequenas.

## Matriz de prioridad

| Prioridad | Area | Motivo |
|---|---|---|
| P0 | Tests y typecheck verdes | Sin baseline no hay confianza para crecer. |
| P0 | Parser unico de tags | Evita bugs sutiles entre Ink, tests y docs. |
| P0 | Docs vs runtime | Reduce expectativas falsas y deuda de producto. |
| P1 | Doctor CLI | Acelera desarrollo y detecta data rota. |
| P1 | Save/load completo | Feature central para cualquier VN seria. |
| P1 | Audio centralizado | El audio actual esta duplicado y aun incompleto. |
| P2 | Renderer plugins | Necesario para crecer sin inflar el core. |
| P2 | Distribucion portal/embedded | Importante, pero despues de estabilizar core. |

## Proximo corte recomendado

La siguiente iteracion deberia ser:

1. Poner verde `bun test`.
2. Poner verde `typecheck`.
3. Crear `bun run check`.
4. Unificar el parser de tags.
5. Marcar en docs las features no implementadas como experimentales.

Ese corte convierte la base actual en un punto de partida confiable para ejecutar las fases siguientes.
