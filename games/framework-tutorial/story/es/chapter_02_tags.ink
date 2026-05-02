=== tags ===
# character: guia, position: left, expression: neutral
# character: aprendiz, position: right, expression: curious

Guia: En Biwa, una linea como "# character: guia, expression: happy" no se muestra como texto.

Aprendiz: Pero cambia el sprite en pantalla.

Guia: Si. Y puedes combinar id, position, sheet, expression o animation.

Aprendiz: Probemos expresiones.

* [Mostrar una expresion segura]
    ~ practica_tags = true
    ~ confianza += 1
    -> tags_segura
* [Mostrar una expresion confundida]
    ~ practica_tags = true
    ~ curiosidad += 1
    -> tags_confundida

=== tags_segura ===
# character: aprendiz, expression: confident

Aprendiz: Creo que ya entiendo donde vive la magia.

# character: guia, expression: happy

Guia: Bien. El motor solo necesita que el id de expresion exista en el mapa del personaje.

-> tags_salida

=== tags_confundida ===
# character: aprendiz, expression: confused

Aprendiz: Si escribo mal el nombre del sprite, no aparece lo esperado.

# character: guia, expression: explain

Guia: Por eso conviene definir una lista corta de estados: neutral, happy, curious, confused.

-> tags_salida

=== tags_salida ===
# character: motor, position: center, expression: idle

Motor: Evento recibido. Escena, personajes y efectos sincronizados.

# character: motor, exit

Guia: Tambien puedes sacar personajes con "# character: motor, exit".

-> estado
