---
id: match3
displayName: Match-3
description: Swap and match colored tiles to score points before time runs out.
entry: minigames/match3/Match3Game.js

integration: overlay

config:
  gridSize: 8
  colors: 6
  timeLimit: 60

difficulty:
  default: normal
  presets:
    easy:
      timeLimit: 90
      colors: 4
    normal:
      timeLimit: 60
      colors: 6
    hard:
      timeLimit: 40
      colors: 7
      gridSize: 10

results:
  score:
    inkVariable: minigame_score
    type: number
    description: Total points scored during the game.
  completed:
    inkVariable: minigame_completed
    type: boolean
    description: True if the player finished before time ran out.
  bestCombo:
    inkVariable: minigame_best_combo
    type: number
    description: Highest combo chain achieved.

thresholds:
  bronze: 200
  silver: 500
  gold: 800

audio:
  bgm: match3_theme
  fadeIn: 0.5
  fadeOut: 1.5
  restorePrevious: true
---

Match-3 minigame used in chapter 4. Use difficulty presets for pacing.
