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

Sara levanta la vista desde detrás del mostrador.

Sara: Llevas mucho tiempo mirando desde afuera.

Una taza vacía descansa en la mesa junto a la ventana, todavía tibia.

Sara: Si te sirve de consuelo, todos dudan la primera vez.

* [Responder]
    -> chapter_01_response
* [Callarse]
    -> chapter_01_silent

=== chapter_01_response ===
# character: kai, expression: surprised
# character: sara, expression: happy

Kai: No sabía si el lugar era real.

Sara: Sigue sin serlo. Siéntate de todas formas.

La lluvia golpea el cristal como si aprobara la respuesta.

-> chapter_02

=== chapter_01_silent ===
# character: kai, expression: sad

Kai no dice nada. Sara vuelve a su trabajo.

La puerta se balancea apenas, aunque nadie ha entrado.

-> chapter_02

=== chapter_01_walk ===
# character: kai, expression: neutral

Kai sigue caminando. Pero el café aparece de nuevo en la siguiente esquina.

-> chapter_01_enter
