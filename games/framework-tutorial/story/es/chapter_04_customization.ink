=== personalizacion ===
# scene: sala_personalizacion
# effect: fade, duration: 0.3
# character: artista, position: center, expression: neutral

Artista: Llegue por la parte visual.

# character: guia, position: left, expression: happy
# character: aprendiz, position: right, expression: happy

Guia: Los juegos no modifican el framework. Primero personalizan con variables CSS.

Artista: Y si eso no alcanza, pasan componentes propios a mountVnApp o VnStage.

Aprendiz: Entonces puedo cambiar colores rapido y reemplazar pantallas enteras despues.

Artista: Si. El tutorial usa un tema azul/verde desde game.config.ts.

* [Cerrar con checklist tecnico]
    -> checklist
* [Cerrar con mini reto narrativo]
    -> reto

=== checklist ===
# character: guia, expression: explain

Guia: Checklist: configura game.config.ts, escribe Ink, define escenas, define personajes, genera assets y valida con doctor.

# character: aprendiz, expression: confident

Aprendiz: Suena suficientemente pequeño para empezar.

-> final_bueno

=== reto ===
# character: artista, expression: happy

Artista: Reto: agrega una quinta escena donde una decision cambie el fondo y la expresion del guia.

# character: aprendiz, expression: curious

Aprendiz: Me gusta. Si lo rompo, el doctor me ayuda.

-> final_curioso
