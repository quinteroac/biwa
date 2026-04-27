---
id: library_interior
displayName: School Library
description: Quiet library with afternoon light and tall bookcases.

background:
  type: static
  variants:
    default:
      image: scenes/library/default.png
      fit: cover
      position: center
    evening:
      image: scenes/library/evening.png
      fit: cover
  defaultVariant: default

transitions:
  in:
    type: fade
    duration: 0.6

ambient:
  sfx: city_morning
  sfxVolume: 0.35
  effect: none

thumbnail: scenes/library/default.png
---

Scene used for study and quiet conversation moments.
