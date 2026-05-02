---
id: motor
displayName: Motor
role: Representacion diegetica del engine
tags: [tutorial, sistema]
physicalDescription: Avatar holografico con interfaz luminosa y silueta simple.
expressionsText: [idle]
nameColor: '#fef08a'
defaultPosition: center
defaultExpression: idle
scale: 0.92
offset:
  x: 0
  y: 0
layers:
  - id: body
    animation:
      type: sprites
      sprites:
        idle: characters/motor/motor.png
    default: idle
prompt: Avatar holografico del motor de juego, minimalista, luminoso, amigable.
isNarrator: false
relationships: []
authorNotes: Sprite base generado con imagegen. Puede quedarse con un unico estado idle.
---

# Motor

Personaje sistema usado para explicar eventos del engine sin romper la ficcion.
