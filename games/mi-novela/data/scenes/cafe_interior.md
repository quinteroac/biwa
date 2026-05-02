---
id: cafe_interior
displayName: The Midnight Cafe (Interior)
description: Warm interior with wooden tables, soft lamps and a small counter.

background:
  type: parallax
  intensity: 0.6
  layers:
    - image: scenes/cafe_interior/fg.png
      depth: 0.6

transitions:
  in:
    type: fade-color
    color: '#0a0a14'
    duration: 0.6

ambient:
  effect: none

audio:
  ambience:
    id: cafe_interior_city
    file: audio/ambience/city_morning.ogg
    volume: 0.7
    fadeIn: 1
  music:
    id: cafe_interior_morning_theme
    file: audio/bgm/morning_theme.ogg
    volume: 0.4
    fadeIn: 1.5
    fadeOut: 2

thumbnail: scenes/cafe_interior/fg.png
---

Interior used for most conversations and character beats.
