---
id: aprendiz
displayName: Aprendiz
role: Protagonista del tutorial
tags: [tutorial, protagonista]
physicalDescription: Joven creadora con mochila, tablet y expresion curiosa.
expressionsText: [neutral, happy, curious, confused, confident]
nameColor: '#bbf7d0'
defaultPosition: right
defaultExpression: neutral
scale: 1
offset:
  x: 0
  y: 0
layers:
  - id: body
    animation:
      type: sprites
      sprites:
        neutral: characters/aprendiz/aprendiz.png
        happy: characters/aprendiz/aprendiz.png
        curious: characters/aprendiz/aprendiz.png
        confused: characters/aprendiz/aprendiz.png
        confident: characters/aprendiz/aprendiz.png
    default: neutral
prompt: Protagonista principiante de visual novel, curiosa y expresiva, ropa casual creativa.
isNarrator: false
relationships:
  - characterId: guia
    note: Aprende del Guia durante el tutorial.
authorNotes: Sprite base generado con imagegen. Para expresiones reales, reemplazar cada entrada de layers.body.animation.sprites por su PNG correspondiente.
---

# Aprendiz

Punto de vista del jugador. Hace preguntas sobre estructura, tags, assets y guardado.
