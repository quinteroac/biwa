# Sprites generados

Estos sprites base fueron generados con el skill `imagegen` y guardados con fondo transparente.
Los personajes usan `layers` en `data/characters/*.md`, por lo que no necesitan atlas JSON.

## guia

- `characters/guia/guia.png`
- Estados Ink mapeados al sprite base: `neutral`, `happy`, `explain`

## aprendiz

- `characters/aprendiz/aprendiz.png`
- Estados Ink mapeados al sprite base: `neutral`, `happy`, `curious`, `confused`, `confident`

## motor

- `characters/motor/motor.png`
- Estados Ink mapeados al sprite base: `idle`

## artista

- `characters/artista/artista.png`
- Estados Ink mapeados al sprite base: `neutral`, `happy`

Para expresiones distintas, crea PNG adicionales, por ejemplo `characters/guia/guia_happy.png`, y reemplaza solo ese valor en `layers.body.animation.sprites`.
