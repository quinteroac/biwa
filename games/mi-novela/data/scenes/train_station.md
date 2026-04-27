---
id: train_station
displayName: Train Station
description: Crowded platform with distant announcements and passing trains.

background:
  type: video
  file: scenes/train_station/loop.webm
  poster: scenes/train_station/poster.png
  fit: cover

transitions:
  in:
    type: fade
    duration: 0.5

ambient:
  sfx: city_morning
  sfxVolume: 0.8
  effect: none

thumbnail: scenes/train_station/poster.png
---

Used for meetings and departures; has ambient motion via video.
