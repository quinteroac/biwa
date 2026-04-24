=== endings ===
# scene: cafe_exterior
# bgm: finale
# character: sara, exit
# character: kai, exit
# character: antagonist, exit

{ minigame_completed && minigame_score >= 500:
    -> ending_good
- else:
    -> ending_neutral
}

=== ending_good ===
# scene: cafe_exterior
# character: kai, position: right, expression: happy
# character: sara, position: left, expression: happy

Morning finally reaches the café.

Sara: Come back whenever you want. It'll always be here.

Kai: Even if I don't need it?

Sara: Especially then.

-> END

=== ending_neutral ===
# scene: kai_apartment
# bgm: morning_theme
# character: kai, position: center, expression: neutral

Kai wakes up in his apartment. The café doesn't appear on any map.

But the scent of cinnamon is still on his clothes.

-> END
