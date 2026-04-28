=== chapter_01 ===
# scene: cafe_exterior
# atmosphere: rain, opacity: 0.28, speed: 8, persistent: true
# bgm: morning_theme

Rain falls on the cobblestones outside a café that shouldn't exist.
# character: kai, position: right, expression: neutral

Kai stares at the entrance without moving.

* [Enter the café]
    -> chapter_01_enter
* [Keep walking]
    -> chapter_01_walk

=== chapter_01_enter ===
# scene: cafe_interior
# sfx: door_open

The interior smells of cinnamon and something older.
# character: sara, position: left, expression: neutral

Sara glances up from behind the counter.

Sara: You've been staring at the door for a while.

An empty cup rests on the table by the window, still warm.

Sara: If it helps, everyone doubts it the first time.

* [Respond]
    -> chapter_01_response
* [Stay silent]
    -> chapter_01_silent

=== chapter_01_response ===
# character: kai, expression: surprised
# character: sara, expression: happy

Kai: I wasn't sure the place was real.

Sara: It still might not be. Sit down anyway.

Rain taps the glass as if approving the answer.

-> chapter_02

=== chapter_01_silent ===
# character: kai, expression: sad

Kai says nothing. Sara returns to her work.

The door sways slightly, though no one has entered.

-> chapter_02

=== chapter_01_walk ===
# character: kai, expression: neutral

Kai keeps walking. But the café appears again on the next corner.

-> chapter_01_enter
