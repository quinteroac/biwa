---
id: kai_apartment
displayName: Kai's Apartment
description: Small, dimly-lit apartment with stacked books and a single window.

background:
  type: static
  image: scenes/kai_apartment/default.png
  fit: cover
  position: center

transitions:
  in:
    type: slide
    direction: up
    duration: 0.5

ambient:
  effect: none

audio:
  ambience:
    id: kai_apartment_city
    file: audio/ambience/city_morning.ogg
    volume: 0.4
    fadeIn: 1
  music:
    id: kai_apartment_morning_theme
    file: audio/bgm/morning_theme.ogg
    volume: 0.35
    fadeIn: 1.5
    fadeOut: 2

thumbnail: scenes/kai_apartment/default.png
---

Personal space for Kai: introspection, phone calls, and private scenes.
