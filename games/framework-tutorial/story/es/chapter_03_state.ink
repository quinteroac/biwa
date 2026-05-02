=== estado ===
# scene: consola_estado
# effect: fade, duration: 0.25
# character: guia, position: left, expression: explain
# character: aprendiz, position: right, expression: neutral

Guia: Ink tambien guarda variables.

Aprendiz: Como confianza y curiosidad.

Guia: Exacto. Tus elecciones ya modificaron esos valores.

{confianza > curiosidad:
    Aprendiz: Me estoy sintiendo lista para construir.
- else:
    Aprendiz: Todavia quiero abrir cada caja antes de usarla.
}

Guia: El SaveManager puede guardar estado narrativo y estado visual: escena, personajes, posiciones y animaciones.

* [Guardar la leccion como una decision clara]
    ~ practica_estado = true
    ~ confianza += 1
    -> estado_guardado
* [Preguntar que pasa con los assets]
    ~ curiosidad += 1
    -> estado_assets

=== estado_guardado ===
# character: aprendiz, expression: confident

Aprendiz: Entonces si cargo partida, vuelvo con la escena y los sprites correctos.

Guia: Si. Por eso los ids estables importan mucho.

-> personalizacion

=== estado_assets ===
# character: aprendiz, expression: curious

Aprendiz: Los sprites no estan aqui todavia.

Guia: Estan referenciados en data/characters. Cuando generes PNG y atlas, usa esos mismos nombres o ajusta el Markdown.

Guia: El doctor del manager te dira que referencia falta o que frame no coincide.

-> personalizacion
