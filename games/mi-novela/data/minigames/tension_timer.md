---
id: tension_timer
displayName: Tension Timer
description: Invisible countdown that affects dialogue options; no dedicated visual layer.
entry: minigames/tension_timer/TensionTimer.js

integration: reactive

config:
  duration: 45
  autoStart: true

results:
  timeRemaining:
    inkVariable: tension_time_remaining
    type: number
    description: Seconds left on the timer when the minigame ends.
  expired:
    inkVariable: tension_expired
    type: boolean
    description: True if timer reached zero before the condition was met.

audio:
  bgm: tension_ambient
  restorePrevious: true
---

Reactive minigame used to make dialogues feel urgent. No visual element.
