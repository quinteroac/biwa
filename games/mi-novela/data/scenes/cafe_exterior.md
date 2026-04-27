---
id: cafe_exterior
displayName: Cafe Exterior
description: Street-facing view of the midnight cafe, wet pavement and neon reflections.

background:
  type: ink-wash
  image: scenes/cafe_exterior/night.png
  tint: rgba(24, 18, 16, 0.26)
  contrast: 1.12
  saturation: 0.78
  grainOpacity: 0.1
  variants:
    day:
      image: scenes/cafe_exterior/day.png
      fit: cover
      position: center
    night:
      image: scenes/cafe_exterior/night.png
      fit: cover
      position: center
  defaultVariant: night

transitions:
  in:
    type: fade
    duration: 0.6

ambient:
  sfx: city_morning
  sfxVolume: 0.5
  effect: rain

thumbnail: scenes/cafe_exterior/night.png
---

Exterior of the cafe used for arrival and departure scenes. Variants for day/night/rain.
