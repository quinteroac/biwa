---
id: cafe_interior
displayName: The Midnight Cafe (Interior)
description: Warm interior with wooden tables, soft lamps and a small counter.

background:
  type: parallax
  intensity: 0.6
  layers:
    - image: scenes/cafe_interior/bg.png
      depth: 0.05
    - image: scenes/cafe_interior/mid.png
      depth: 0.25
    - image: scenes/cafe_interior/fg.png
      depth: 0.6

transitions:
  in:
    type: fade-color
    color: '#0a0a14'
    duration: 0.6

ambient:
  sfx: cafe_ambience
  sfxVolume: 0.7
  effect: none

thumbnail: scenes/cafe_interior/thumb.jpg
---

Interior used for most conversations and character beats.
