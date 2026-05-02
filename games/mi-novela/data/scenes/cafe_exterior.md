---
id: cafe_exterior
displayName: Cafe Exterior
description: Street-facing view of the midnight cafe, wet pavement and neon reflections.
background:
  type: ink-wash
  image: scenes/cafe_exterior/background.png
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
  effect: rain
audio:
  ambience:
    id: cafe_exterior_rain
    file: audio/ambience/storm/rain.ogg
    volume: 0.5
    fadeIn: 1
  music:
    id: cafe_exterior_morning_theme
    file: audio/bgm/morning_theme.ogg
    volume: 0.45
    fadeIn: 1.5
    fadeOut: 2
thumbnail: scenes/cafe_exterior/night.png
location: ''
timeOfDay: ''
weather: ''
mood: ''
prompt: ''
---

Exterior of the cafe used for arrival and departure scenes. Variants for day/night/rain.
