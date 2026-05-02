=== intro ===
# scene: aula_framework
# effect: fade, duration: 0.35
# atmosphere: dust, opacity: 0.18, speed: 4, persistent: true
# character: guia, position: left, expression: neutral

Guia: Bienvenida al taller de Biwa.

# character: aprendiz, position: right, expression: curious

Aprendiz: Solo traje una carpeta vacia y demasiadas preguntas.

Guia: Perfecto. Una visual novel empieza justo asi: con una escena, un personaje y una linea que quiere avanzar.

Aprendiz: Entonces esto tambien es un tutorial jugable.

Guia: Exacto. Cada capitulo te muestra una pieza del framework sin salir de Ink.

* [Quiero entender la estructura del proyecto]
    ~ curiosidad += 1
    -> estructura
* [Prefiero ver algo funcionando ya]
    ~ confianza += 1
    -> primer_tag

=== estructura ===
# character: guia, expression: explain

Guia: El juego vive dentro de games/framework-tutorial.

Guia: La historia esta en story/es, los datos en data, y los recursos visuales en assets.

Aprendiz: O sea que Ink dirige la escena, pero los Markdown describen que existe.

Guia: Esa es la idea. Ink pide "guia feliz"; data/characters/guia.md dice que sprite corresponde a "happy".

-> primer_tag

=== primer_tag ===
# character: aprendiz, expression: happy

Aprendiz: Hagamos que algo cambie.

# scene: estudio_tags
# effect: flash, duration: 0.15, intensity: 0.15

Guia: Acabas de ver dos tags: scene y effect.

Guia: Los tags son comentarios Ink que el engine interpreta.

-> tags
