=== chapter_01 ===
# scene: cafe_exterior
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
# character: kirk, position: center, expression: neutral

Sara glances up from behind the counter.

Sara: You've been staring at the door for a while.

At a table by the window, Kirk lowers his coffee cup as if he had been waiting for that exact line.

Kirk: If it helps, everyone doubts it the first time.

* [Respond]
    -> chapter_01_response
* [Stay silent]
    -> chapter_01_silent

=== chapter_01_response ===
# character: kai, expression: surprised
# character: sara, expression: happy
# character: kirk, expression: happy

Kai: I wasn't sure the place was real.

Sara: It still might not be. Sit down anyway.

Kirk gives a small smile, quietly relieved not to be the only witness.

-> chapter_02

=== chapter_01_silent ===
# character: kai, expression: sad
# character: kirk, expression: sad

Kai says nothing. Sara returns to her work.

Kirk watches the door. For a moment, he looks worried.

-> chapter_02

=== chapter_01_walk ===
# character: kai, expression: neutral

Kai keeps walking. But the café appears again on the next corner.

-> chapter_01_enter
