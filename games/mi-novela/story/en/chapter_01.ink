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

Sara glances up from behind the counter.

Sara: You've been staring at the door for a while.

* [Respond]
    -> chapter_01_response
* [Stay silent]
    -> chapter_01_silent

=== chapter_01_response ===
# character: kai, expression: surprised
# character: sara, expression: happy

Kai: I wasn't sure the place was real.

Sara: It still might not be. Sit down anyway.

-> chapter_02

=== chapter_01_silent ===
# character: kai, expression: sad

Kai says nothing. Sara returns to her work.

-> chapter_02

=== chapter_01_walk ===
# character: kai, expression: neutral

Kai keeps walking. But the café appears again on the next corner.

-> chapter_01_enter
