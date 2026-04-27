=== chapter_01 ===
# scene: cafe_exterior
# bgm: morning_theme

La lluvia cae sobre los adoquines frente al café que no debería existir.
# character: kai, position: right, expression: neutral

Kai mira la entrada sin moverse.

* [Entrar al café]
    -> chapter_01_enter
* [Seguir caminando]
    -> chapter_01_walk

=== chapter_01_enter ===
# scene: cafe_interior
# sfx: door_open

El interior huele a canela y algo más antiguo.
# character: sara, position: left, expression: neutral
# character: kirk, position: center, expression: neutral

Sara levanta la vista desde detrás del mostrador.

Sara: Llevas mucho tiempo mirando desde afuera.

Desde una mesa junto a la ventana, Kirk baja una taza de café como si hubiera estado esperando esa frase.

Kirk: Si te sirve de consuelo, todos dudamos la primera vez.

* [Responder]
    -> chapter_01_response
* [Callarse]
    -> chapter_01_silent

=== chapter_01_response ===
# character: kai, expression: surprised
# character: sara, expression: happy
# character: kirk, expression: happy

Kai: No sabía si el lugar era real.

Sara: Sigue sin serlo. Siéntate de todas formas.

Kirk sonríe apenas, satisfecho de no ser el único testigo.

-> chapter_02

=== chapter_01_silent ===
# character: kai, expression: sad
# character: kirk, expression: sad

Kai no dice nada. Sara vuelve a su trabajo.

Kirk observa la puerta. Por un instante, parece preocupado.

-> chapter_02

=== chapter_01_walk ===
# character: kai, expression: neutral

Kai sigue caminando. Pero el café aparece de nuevo en la siguiente esquina.

-> chapter_01_enter
