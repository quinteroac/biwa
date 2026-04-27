# Feature Map Next

Roadmap posterior al cierre de las fases 0-9. Este mapa reemplaza la lista inicial de estabilizacion como guia de trabajo futuro, pero deja `FEATURE_MAP.md` como registro historico de lo ya construido.

## Baseline actual

El framework ya tiene una base funcional y verificable:

- `bun run verify` quedo verde en el ultimo corte completo: tests, typecheck, `doctor smoke-fixture` y build del fixture.
- `games/smoke-fixture` pasa `doctor` con 0 errores y 0 warnings.
- El build estatico ESM genera `dist/<game>/`, `manifest.json`, import map y smoke checks de archivos.
- La UI React ya cubre start menu, stage, dialogo, elecciones, quick save, save/load, end screen y volumen.
- El engine ya persiste estado narrativo, variables, escena visual, personajes, audio y locale.
- La documentacion principal existe: first game, tags Ink, estructura, componentes, schemas y distribucion.

## Hallazgos del escaneo

### Deuda P0

- Hay desfases entre docs, tipos y schema:
  - `framework/docs/game.config.schema.md` documenta `distribution.mode: "standalone"`, pero `framework/schemas/game.config.schema.json` solo enumera `portal`, `static` y `embedded`.
  - El schema describe que `version` invalida saves por major version, pero el runtime actual versiona el schema de save, no la version del juego.
- Los eventos del engine siguen sin un mapa tipado publico de extremo a extremo.
- Falta documentacion formal de la API publica de `GameEngine`.
- `GameEngine.init()` singleton y `new GameEngine(config)` conviven, pero la politica publica aun no esta definida.

### Deuda P1

- La UI de slots guarda `thumbnail`, pero todavia no lo muestra.
- `autosave` usa una preferencia global y no una preferencia namespaced por juego.
- `ambience` funciona, pero aun comparte canal efectivo con `bgm` en la UI de volumen.
- Falta un contrato formal para severidad de diagnostics, assets opcionales y warnings intencionales.

### Deuda P2

- Falta smoke E2E real en navegador con Playwright.
- Falta una suite automatizada dedicada para CLI (`new`, `doctor`, `build`, rutas invalidas, errores de schema).
- El dev server recompila bajo demanda, pero no tiene watch mode formal con eventos visibles por archivo.
- Portal, embedded y static comparten estrategia de salida; faltan wrappers/manifests especificos.
- Falta versionado/publicacion real si el framework se extrae como paquete.

## Prioridades

| Prioridad | Tema | Motivo |
|---|---|---|
| P0 | Contratos publicos y verdad documental | Evita que creadores construyan sobre promesas falsas o incompletas. |
| P0 | Schema/docs/runtime alineados | La robustez empieza por configuraciones que significan lo mismo en todos lados. |
| P1 | Diagnostics de contenido | `doctor` y `build` deben distinguir errores, warnings e intenciones del creador. |
| P1 | Save/load pulido | Es una feature central para visual novels y ya esta cerca de sentirse producto. |
| P1 | Audio v2 | Ambience, BGM y volumen necesitan contrato independiente y testeable. |
| P2 | E2E browser y coverage | Sube confianza en builds reales, hidratacion y regresiones de UI. |
| P2 | Plugins y distribucion | Importante para escalar, pero despues de cerrar los contratos base. |

## FM2-0: Contratos publicos y coherencia

Objetivo: que docs, runtime, tipos y schemas digan lo mismo.

### Alcance

- Crear mapa tipado de eventos del engine:
  - `engine:dialog`
  - `engine:choices`
  - `engine:scene`
  - `engine:character`
  - `engine:bgm`
  - `engine:sfx`
  - `engine:ambience`
  - `engine:voice`
  - `engine:minigame:start`
  - `engine:end`
- Exportar tipos publicos para listeners de `EventBus`.
- Documentar API publica de `GameEngine`:
  - constructor
  - `init`
  - `start`
  - `advance`
  - `choose`
  - `getState`
  - `captureSaveState`
  - `restoreSaveState`
  - `setLocale`
- Definir politica oficial para singleton vs instancias multiples.
- Corregir `distribution.mode` para que docs, schema y tipos coincidan.
- Corregir la promesa de invalidacion de saves por version de juego:
  - implementar invalidacion/migracion por `game.version`, o
  - documentar que hoy solo existe version de schema de save.

### Criterios de salida

- `framework/schemas/game.config.schema.json`, `framework/types/game-config.d.ts` y docs coinciden.
- Eventos principales estan tipados sin `any` en el contrato publico.
- La API de `GameEngine` tiene una pagina de referencia.
- Los tests cubren al menos un listener tipado y la politica de instanciacion.
- `bun run verify` pasa.

## FM2-1: Diagnostics y contratos de contenido

Objetivo: hacer que `doctor` y `build` sean confiables para cualquier juego, sin acoplar el roadmap a la novela ejemplo.

### Alcance

- Definir politica de severidad para diagnostics:
  - error bloqueante.
  - warning accionable.
  - warning intencional/suprimible.
  - info.
- Agregar mecanismo para declarar assets opcionales de forma explicita.
- Permitir supresiones controladas por archivo o config, con razon obligatoria.
- Documentar que warnings no deben esconder inconsistencias de contrato.
- Hacer que `build` incluya resumen estructurado de diagnostics en `manifest.json`.
- Mantener `smoke-fixture` como fixture minimo del framework, no como showcase de contenido.

### Criterios de salida

- `doctor` permite diferenciar errores, warnings accionables y warnings intencionales.
- Las supresiones requieren razon y quedan visibles en consola/build manifest.
- Los docs explican cuando un asset es requerido, opcional o experimental.
- `smoke-fixture` sigue pasando `doctor` sin warnings.

## FM2-2: Save/load producto

Objetivo: que guardar/cargar se sienta completo para jugadores y mantenible para creadores.

### Alcance

- Mostrar thumbnails en la UI de slots.
- Mostrar playtime y escena de forma consistente.
- Namespacing de autosave por juego: por ejemplo `vn:<gameId>:autoSave`.
- Save compatibility por version de juego:
  - registrar `gameId` y `gameVersion` en cada save.
  - definir regla para major incompatible.
  - permitir migraciones por juego si aplica.
- Documentar contrato de migraciones con ejemplos.
- Agregar tests de migracion/incompatibilidad.

### Criterios de salida

- Slots muestran thumbnail cuando existe.
- Autosave de un juego no afecta a otro.
- Saves incompatibles fallan con mensaje claro y no rompen la UI.
- Docs de save/load coinciden con `SaveManager`.

## FM2-3: Audio v2

Objetivo: separar audio como subsistema estable, independiente de `VnStage`.

### Alcance

- Extraer un `AudioManager` o facade equivalente fuera de `VnStage`.
- Mantener `VolumeController` como fuente de mezcla.
- Agregar canal efectivo `ambience` separado de `bgm`.
- Soportar fade/crossfade para BGM y ambience desde metadata.
- Clarificar formato oficial de tags:
  - `# bgm: theme`
  - `# bgm: stop`
  - `# ambience: rain`
  - `# ambience: stop`
- Alinear `framework/docs/audio.schema.md` con capacidades reales.

### Criterios de salida

- `bgm` y `ambience` pueden sonar simultaneamente con volumen independiente.
- Cambios de volumen afectan fuentes activas y futuras.
- `VnStage` solo orquesta UI; no contiene logica central de audio.
- Tests cubren stop, fade basico, volumen persistente y restauracion desde save.

## FM2-4: Tooling CLI y flujo creador

Objetivo: que el creador tenga comandos previsibles para crear, validar y distribuir.

### Alcance

- Suite automatizada para CLI:
  - `new`
  - `doctor`
  - `build`
  - errores de schema
  - assets faltantes
  - rutas inexistentes
- Watch mode formal para `dev`:
  - eventos visibles por archivo cambiado.
  - recompilacion de story/data/assets segun corresponda.
  - mensajes accionables.
- Mejorar validacion contra JSON schema.
- Agregar comando o flag de preview del build estatico.

### Criterios de salida

- Tests CLI crean proyectos temporales y limpian sus salidas.
- `dev` reporta cambios detectados sin depender solo de recompilacion bajo demanda.
- Errores de usuario tienen sugerencias concretas.

## FM2-5: Browser E2E y coverage

Objetivo: validar que el build corre en un navegador real.

### Alcance

- Agregar Playwright.
- Smoke E2E para `smoke-fixture`:
  - abrir build estatico.
  - confirmar render inicial.
  - avanzar dialogo.
  - tomar una eleccion.
  - guardar/cargar una partida.
- Verificar build bajo subpath para evitar regresiones de `basePath`.
- Definir coverage baseline para:
  - engine
  - parser
  - save/load
  - doctor/build

### Criterios de salida

- CI ejecuta E2E smoke.
- Fallos de hidratacion o assets rotos se detectan antes de merge.
- Coverage tiene umbral inicial razonable y documentado.

## FM2-6: Extension points y plugins

Objetivo: que juegos avanzados puedan extender sin modificar el framework.

### Alcance

- Renderer registry declarativo:
  - backgrounds custom
  - characters custom
  - overlays custom
- Metadata/versionado para plugins de minijuegos.
- Ejemplo real de shell custom en `games/`.
- Contrato para cargar minijuegos con lifecycle:
  - `mount`
  - `complete`
  - `dispose`
  - error boundary.
- Documentar limites entre framework core y plugins experimentales.

### Criterios de salida

- Un juego puede registrar un renderer custom desde config sin editar `framework/`.
- Minijuegos declaran metadata minima: `id`, `version`, `entry`, `schema`.
- Existe un ejemplo ejecutable de custom UI.

## FM2-7: Distribucion por perfiles

Objetivo: producir artefactos distintos segun destino.

### Alcance

- `standalone`: sitio completo autocontenido.
- `static`: salida relativa para hosting simple.
- `portal`: manifest compatible con portal multi-novela.
- `embedded`: wrapper para iframe o host externo.
- Manifests especificos por modo.
- Smoke check por modo.
- Documentar compatibilidad de `basePath`.

### Criterios de salida

- `bun manager/cli.ts build <game> --mode <mode>` produce artefactos distintos cuando aplica.
- Cada modo tiene manifest y smoke check propio.
- Docs incluyen ejemplos de deploy.

## FM2-8: Framework de minijuegos

Objetivo: fortalecer el contrato de minijuegos sin depender de implementaciones concretas de la novela ejemplo.

### Alcance

- Definir interfaz publica de minijuego.
- Definir contrato de resultado, cancelacion y error.
- Crear overlay compartido de minijuegos.
- Agregar tests de lifecycle y resultado.
- Proveer un minijuego fixture minimo para CI.
- Mantener implementaciones complejas como ejemplos externos o plugins.

### Criterios de salida

- El framework puede montar, completar, cancelar y desmontar un minijuego sin fugas de estado.
- El engine recibe resultado de minijuego y puede continuar la historia.
- Errores de minijuego no dejan el stage bloqueado.

## Nuevas features candidatas

Estas no son bloqueantes para robustez inicial, pero tienen alto valor para un framework de novelas visuales:

- Backlog/history de dialogos.
- Auto mode y skip mode.
- Preferencias de texto: velocidad, tamano, contraste.
- Galeria CG y escenas desbloqueables.
- Menu de accesibilidad.
- Selector de idioma en runtime.
- Import/export de saves.
- Pantalla de loading con preload de assets.
- Overlay de errores en dev.
- Linter de story/tags antes de build.
- Generador de docs desde schemas.
- Telemetria local opcional para debug de flujo narrativo.

## Sprint recomendado inmediato

1. FM2-0: alinear schema/docs/tipos y documentar API publica.
2. FM2-1: formalizar diagnostics, severidades y supresiones intencionales.
3. FM2-2: mostrar thumbnails en save slots y namespacear autosave por juego.
4. FM2-5: agregar Playwright smoke para el fixture.

### Resultado del sprint inmediato

- Agregado `EngineEventMap` y `EventBus<EngineEventMap>` para eventos publicos del engine.
- Agregada documentacion de API publica en `framework/docs/game-engine-api.md`.
- Alineados `distribution.mode` en docs, tipos y schema para `standalone`, `portal`, `static` y `embedded`.
- `SaveManager` ahora guarda `gameId` y `gameVersion`; rechaza saves de otro juego o de otro major version cuando la metadata existe.
- Autosave usa preferencia namespaced por juego: `vn:<gameId>:autoSave`.
- Los slots de save/load muestran thumbnail cuando existe en metadata.
- `doctor` soporta `error`, `warning` e `info`, codigos para diagnostics conocidos y supresiones intencionales con razon.
- `build` escribe diagnostics estructurados en `manifest.json`.
- Agregado Playwright smoke sobre `smoke-fixture`.
- Corregido build runtime para apuntar story entrypoints compilados a `.json`.
- Corregidos exports vendor ESM de React/JSX/ReactDOM usados por el build estatico.
- `bun run verify` incluye unit tests, typecheck, doctor, build y E2E browser.

## Comandos de verificacion

```bash
bun run verify
bun manager/cli.ts doctor smoke-fixture
bun manager/cli.ts build smoke-fixture
```

## Decision de mantenimiento

- `FEATURE_MAP.md` queda como historico de fases 0-9.
- `FEATURE_MAP_NEXT.md` es el roadmap vivo para el siguiente ciclo.
- Cuando un bloque FM2 se complete, registrar resultado, verificacion y pendientes reales en este archivo.
