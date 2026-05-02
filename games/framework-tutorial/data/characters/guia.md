---
id: guia
displayName: Guia
role: Mentor del framework
tags: [tutorial, mentor]
physicalDescription: Persona adulta de mirada tranquila, ropa practica y una libreta llena de diagramas.
expressionsText: [neutral, happy, explain]
nameColor: '#7dd3fc'
defaultPosition: left
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
        neutral: characters/guia/guia.png
        happy: characters/guia/guia.png
        explain: characters/guia/guia.png
    default: neutral
prompt: Guia amable de tutorial tecnico, expresiva, estilo visual novel moderno.
isNarrator: false
relationships: []
authorNotes: Sprite base generado con imagegen. Para expresiones reales, reemplazar cada entrada de layers.body.animation.sprites por su PNG correspondiente.
---

# Guia

Mentor que traduce conceptos tecnicos del framework a ejemplos narrativos.
