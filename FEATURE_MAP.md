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

## Pendientes P1

### Player Preferences

Objetivo: centralizar preferencias de lectura, UI y accesibilidad.

Alcance:

- Crear `PlayerPreferences` o servicio equivalente.
- Persistir por game id:
  - velocidad de texto.
  - auto delay.
  - skip mode default.
  - volumen/mute ya existente como integracion.
  - tamaño de texto.
  - opciones de accesibilidad basicas.
- Exponer API para componentes custom.
- Agregar panel de settings overrideable.
- Migrar controles dispersos hacia este contrato cuando aplique.

Criterios de salida:

- Preferencias sobreviven reload.
- `VnStage` consume preferencias sin acoplarse a localStorage directo.
- Docs explican claves y defaults.

### Input Map

Objetivo: hacer configurables los controles de jugador.

Alcance:

- Definir acciones:
  - advance.
  - reveal.
  - backlog.
  - auto.
  - skip.
  - save/load.
  - menu/settings.
- Soportar teclado y mouse/touch.
- Permitir override desde host app.
- Documentar defaults.
- Agregar tests de mapeo y prioridades.

Criterios de salida:

- Acciones principales no dependen de teclas hardcodeadas.
- Apps host pueden reemplazar el mapa sin reescribir `VnStage`.

### Save UX Avanzada

Objetivo: hacer que save/load se sienta completo para jugador final.

Alcance:

- Mejorar metadata visual por slot:
  - screenshot o thumbnail real cuando sea posible.
  - ubicacion/escena legible.
  - fecha y playtime.
- Confirmacion clara de sobrescritura.
- Delete slot desde UI.
- Autosave visible y distinguible.
- Tests de flujos principales.

Criterios de salida:

- El jugador puede guardar, cargar y borrar slots con confianza.
- Los slots muestran suficiente contexto para elegir.

## Pendientes P2

### CG Gallery

Objetivo: desbloquear una galeria de imagenes/event CG basada en progreso del jugador.

Alcance:

- Definir data schema para gallery items.
- Registrar unlocks desde Ink tags o engine API.
- Persistir unlocks por game id.
- Componente `VnGallery` overrideable.
- Soportar thumbnails, full image, titulo y descripcion.
- Tests de unlock y persistencia.

Criterios de salida:

- Una historia puede desbloquear imagenes de galeria.
- La galeria muestra solo items desbloqueados salvo modo debug/documentado.

### Music Room / Replay

Objetivo: permitir revisar musica o escenas desbloqueadas.

Alcance:

- Definir unlocks para pistas de audio.
- Componente de music room con preview/play/stop.
- Opcional: replay de escenas marcadas.
- Respetar volumen global.
- Persistencia por game id.

Criterios de salida:

- Pistas desbloqueadas se pueden reproducir desde menu.
- No interfiere con audio runtime de partida.

### Accessibility Polish

Objetivo: elevar la comodidad de lectura para mas jugadores.

Alcance:

- Preferencias de tamaño de texto y contraste.
- Reducir movimiento/transiciones.
- Subtitulos/labels claros para audio/voice cuando aplique.
- Navegacion por teclado en menus.
- Revisión ARIA de overlays principales.

Criterios de salida:

- Menus principales son navegables por teclado.
- Preferencias visuales afectan dialogo y elecciones.
- Docs recomiendan patrones para componentes custom.

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
