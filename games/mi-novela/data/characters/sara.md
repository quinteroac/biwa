---
id: sara
displayName: Sara
nameColor: "#f9a8d4"
defaultPosition: left

layers:
  - id: body
    animation:
      type: sprites
      sprites:
        default: characters/sara/body.png
    default: default

  - id: face
    animation:
      type: sprites
      sprites:
        neutral:  characters/sara/face_neutral.png
        happy:    characters/sara/face_happy.png
        wink:     characters/sara/face_wink.png
    default: neutral

  - id: outfit
    animation:
      type: sprites
      sprites:
        school:   characters/sara/outfit_school.png
        casual:   characters/sara/outfit_casual.png
    default: school
---

# Sara

Personaje secundario. Extrovertida, cambia de outfit según el capítulo...