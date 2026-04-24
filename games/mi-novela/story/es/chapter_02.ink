=== chapter_02 ===
# scene: cafe_interior
# bgm: tension

La tormenta llega sin previo aviso. Las luces del café parpadean.
# character: sara, position: left, expression: neutral
# character: kai, position: right, expression: neutral

Sara: Esto no es clima normal.

* [Preguntar a Sara qué pasa]
    -> chapter_02_ask
* [Mirar por la ventana]
    -> chapter_02_window

=== chapter_02_ask ===
# character: sara, expression: happy

Sara sonríe con algo que no es exactamente tranquilidad.

Sara: El café aparece cuando alguien lo necesita. Tú lo necesitabas.

* [Creerle]
    -> chapter_02_believe
* [No creerle]
    -> chapter_02_doubt

=== chapter_02_believe ===
# character: kai, expression: happy

Kai siente que algo encaja.

-> chapter_02_antagonist_arrives

=== chapter_02_doubt ===
# character: kai, expression: sad

Kai mira el café buscando una salida. No hay ninguna.

-> chapter_02_antagonist_arrives

=== chapter_02_window ===
# scene: cafe_exterior
# bgm: battle_theme

En el reflejo del cristal aparece una figura que no debería estar ahí.
# character: antagonist, position: center, expression: neutral

-> chapter_02_antagonist_arrives

=== chapter_02_antagonist_arrives ===
# scene: cafe_interior
# bgm: battle_theme
# character: antagonist, position: center, expression: menacing

???: Ya los encontré.

~ launch_minigame("tension_timer")

* [Enfrentarlo]
    -> chapter_02_confront
* [Proteger a Sara]
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

Los dos se mueven al mismo tiempo. El café tiembla.

-> endings

=== chapter_02_win ===
# bgm: morning_theme

El antagonista retrocede. La tormenta amaina.

-> endings

=== chapter_02_lose ===
# bgm: tension

La oscuridad se cierra. Pero el café sigue ahí.

-> endings
