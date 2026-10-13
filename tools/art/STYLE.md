# Foodi Dex creature art: house style (approved by Alex, 2026-10-12)

Read these approved examples first and match them exactly in structure, proportion and face:
/Users/alexscholtes/Developer/foodi-dex/public/art/ingredients/ — carrot.svg, beet.svg, kale.svg (the three originals),
plus granny-smith-apple.svg, watermelon.svg, butternut-squash.svg, olive-oil.svg, black-pepper.svg.

## Every file
- Path: /Users/alexscholtes/Developer/foodi-dex/public/art/ingredients/<key>.svg — the key you were given, exactly.
- Root: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-labelledby="t">, then
  <title id="t">NAME</title> with the name you were given, exactly (accents included).
- First shape, the tile: <rect x="8" y="8" width="240" height="240" rx="40" fill="TINT"/> with your group's tint.
- Ground shadow: one ellipse, cy 222–228, ry 8–9, fill #000, opacity 0.14, rx sized to the body.
- Keep every painted pixel (stroke included) inside the tile; aim for x and y within 20–236.
- Outlines #1B1B1F, width 6 on bodies, leaves, stems, caps; stroke-linejoin and stroke-linecap round.
  Detail lines (veins, ridges, seeds, texture) width 3–4, in a colour that shows against the body.
- Flat fills plus ONE lighter highlight shape on the body, no stroke. No gradients, filters, masks, text,
  <image>, <script>, href or external references. Under 4 KB.
- Body fills about 60–75% of the tile height, centred.

## The face — identical on every creature
- Eye whites: <ellipse rx="9.5" ry="11" fill="#FFFFFF"/> inside <g stroke="#1B1B1F" stroke-width="3.5">,
  centres exactly 30 px apart (cx 113 and 143 when the face is centred at x 128).
- Pupils: <circle r="5.2" fill="#1B1B1F"/> at (eye cx + 2, eye cy + 2).
- Glints: <circle r="1.9" fill="#FFFFFF"/> at (eye cx + 4, eye cy − 1).
- Smile: <path d="M{cx−8} {y} Q{cx} {y+8} {cx+8} {y}" stroke="#1B1B1F" stroke-width="4" stroke-linecap="round" fill="none"/>
  about 19 px below the eye centres. On a very dark body where a dark smile disappears, make it #FFFFFF.
- Blush: two ellipses rx 8 ry 4.5, about ±25 px from the face centre, level with the smile:
  #FF5F6D at opacity 0.45 on light bodies, #FF9EC4 at opacity 0.55 on dark ones.
- The face sits where the body is clear: no veins, seeds, ridges or texture lines cross it. If texture covers the
  body, put a body-coloured patch behind the face first (see cantaloupe.svg).
- Icons on containers go ABOVE the face; below it they read as a mouth at small sizes.

## Recognisable at 72 px
- One bold silhouette per food. Prefer the food's signature over detail: romaine tall and ribbed vs iceberg a
  tight round head; lemon pointed ends vs lime smaller and darker green; shiitake brown cap with pale cracks vs
  portabella wide flat dark cap.
- Your list groups lookalikes on purpose. Give each one a distinct signature (shape, colour, a telling detail)
  so no two in your list could be mistaken for each other at 72 px.
- Original creatures only: nothing from Pokémon or any existing character, no logos, no brand marks.

## Check before you report
- Each file parses: python3 -c "import xml.dom.minidom; xml.dom.minidom.parse('PATH')"
- Render your files at 72 px and 256 px (headless Chrome or `qlmanage -t -s 256 -o OUTDIR FILE`) and look at them.
  Fix anything unrecognisable, off-style, or clipped before reporting.
- Do NOT edit any other file, do NOT overwrite an existing file, do NOT run git.
