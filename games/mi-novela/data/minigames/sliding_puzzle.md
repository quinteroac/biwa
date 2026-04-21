---
id: sliding_puzzle
displayName: Sliding Puzzle
description: Rearrange tiles into the correct image. One-shot, no time limit.
entry: minigames/sliding_puzzle/SlidingPuzzle.js

integration: fullscreen

config:
  gridSize: 3
  image: assets/puzzle/kai_memory.jpg
  shuffles: 50

results:
  solved:
    inkVariable: puzzle_solved
    type: boolean
    description: True if the player completed the puzzle.
  moves:
    inkVariable: puzzle_moves
    type: number
    description: Number of moves used.

audio:
  bgm: puzzle_ambient
  restorePrevious: true
---

Sliding puzzle used for a memory-reconstruction scene.
