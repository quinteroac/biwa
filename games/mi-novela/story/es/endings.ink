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

La mañana llega finalmente al café.

Sara: Vuelve cuando quieras. Siempre estará aquí.

Kai: ¿Incluso si no lo necesito?

Sara: Especialmente entonces.

-> END

=== ending_neutral ===
# scene: kai_apartment
# bgm: morning_theme
# character: kai, position: center, expression: neutral

Kai despierta en su apartamento. El café no está en ningún mapa.

Pero el aroma a canela todavía está en su ropa.

-> END
