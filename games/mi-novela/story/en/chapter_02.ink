=== chapter_02 ===
# scene: cafe_interior
# bgm: tension

The storm arrives without warning. The café lights flicker.
# character: sara, position: left, expression: neutral
# character: kai, position: right, expression: neutral

Sara: This isn't normal weather.

* [Ask Sara what's happening]
    -> chapter_02_ask
* [Look out the window]
    -> chapter_02_window

=== chapter_02_ask ===
# character: sara, expression: happy

Sara smiles with something that isn't quite reassurance.

Sara: The café appears when someone needs it. You needed it.

* [Believe her]
    -> chapter_02_believe
* [Disbelieve her]
    -> chapter_02_doubt

=== chapter_02_believe ===
# character: kai, expression: happy

Something clicks for Kai.

-> chapter_02_antagonist_arrives

=== chapter_02_doubt ===
# character: kai, expression: sad

Kai looks around the café for a way out. There isn't one.

-> chapter_02_antagonist_arrives

=== chapter_02_window ===
# scene: cafe_exterior
# bgm: battle_theme

In the window's reflection stands a figure that shouldn't be there.
# character: antagonist, position: center, expression: neutral

-> chapter_02_antagonist_arrives

=== chapter_02_antagonist_arrives ===
# scene: cafe_interior
# bgm: battle_theme
# character: antagonist, position: center, expression: menacing

???: Found you.

~ launch_minigame("tension_timer")

* [Confront them]
    -> chapter_02_confront
* [Protect Sara]
    -> chapter_02_protect

=== chapter_02_confront ===
# character: kai, expression: surprised
# character: antagonist, expression: surprised

~ launch_minigame("match3")

{ minigame_completed:
    - -> chapter_02_win
    - else: -> chapter_02_lose
}

=== chapter_02_protect ===
# character: sara, expression: happy
# character: kai, expression: neutral

Both move at the same time. The café shudders.

-> endings

=== chapter_02_win ===
# bgm: morning_theme

The antagonist falls back. The storm eases.

-> endings

=== chapter_02_lose ===
# bgm: tension

Darkness closes in. But the café is still there.

-> endings
