# Two-storey city art

Historical generation notes. Current workflow: [HOUSE-ASSET-WORKFLOW.md](../../../docs/HOUSE-ASSET-WORKFLOW.md). The separate civic/commercial atlas has been retired; properties now use the same 32-house atlas as ordinary buildings.

Production replacement, 2026-10-15. All 28 active building variants have at most two storeys total (ground floor and one upper floor). Warehouses and other one-storey buildings remain lower. Extra floors were removed in the illustrations; the existing taller sheets are retained only as earlier assets.

## Assets and edit mode

Created with the built-in Imagegen image-edit tool, using each existing project atlas as its reference and requesting a transparent background. The six returned PNGs were copied unchanged into the project. Ground anchors and crop metadata are calibrated separately in `pizza-city-building-art.js` and `pizza-city-art.js`. No raster resampling or image-edit script was used to generate these files.

| Saved asset (relative to this directory) | Reference | Active variants |
| --- | --- | --- |
| `italian-buildings-two-storey-v1.png` | `italian-buildings-v2.png` | 8 |
| `italian-buildings-extra-two-storey-v1.png` | `italian-buildings-extra-v1.png` | 7 (plus the separate narrow house) |
| `italian-courtyards-two-storey-v1.png` | `italian-courtyards-v1.png` | 2 |
| `italian-landmarks-two-storey-v1.png` | `italian-landmarks-v3.png` | 2 |
| `italian-townhouse-narrow-two-storey-v1.png` | `italian-buildings-extra-v1.png`, bottom-right house | 1 |

The separate narrow townhouse replaces building variant 15 so its long footprint is retained. The second atlas still contains its unused first redraw.

## Prompt set

The first five edits used the following shared prompt, with the asset-specific instruction inserted at `[ASSET INSTRUCTION]`:

```text
Use case: precise-object-edit. Edit target: the supplied PizzaCity isometric pixel-art sprite atlas. Production replacement for a 2D city builder. Primary request: lower ALL buildings to MAXIMUM TWO STOREYS total, meaning ground floor plus exactly one upper floor, by REMOVING extra storeys and redrawing facades. Do not squash vertically or keep extra window rows. [ASSET INSTRUCTION] Keep the illustrated pixel-art style and warm Italian materials. Strict 2:1 isometric ground edges, vertical walls vertical, common top-left lighting. CRITICAL INVARIANTS: preserve atlas dimensions/aspect ratio, exact sprite count, order, cell layout, horizontal positions, ground-contact positions and foundation footprint dimensions. Leave each sprite's BOTTOM foundation at its original place; lower its roof into the now-empty upper space. Do not recenter shorter houses vertically. Retain empty spacing between sprites, no overlapping sprites. Transparent background, real alpha, no painted backdrop, no floor tiles/roads, no cast shadows extending outside the footprint, no text, no labels. Keep roofs shallow and chimneys short. All buildings must be visibly low-rise, no third window row or third enclosed floor anywhere.
```

### buildings

Reference: `italian-buildings-v2.png`.

```text
Eight houses in exactly FOUR columns and TWO rows, same order. The first, second and fourth houses in the top row currently have three storeys: remove the middle storey. All eight must have exactly one ground floor with doors/shops and ONE upper floor with one row of windows. Preserve every original ground-floor facade and every terracotta roof, green shutters, awnings, individual colors and footprint.
```

### extras

Reference: `italian-buildings-extra-v1.png`.

```text
Eight houses in exactly FOUR columns and TWO rows, same order. Top row: the tall cream house and blue house become ground floor + ONE upper window row; shop houses already two storeys stay two. Bottom row: red house becomes two storeys, roof-terrace yellow house becomes ground floor + ONE upper floor with a small open roof terrace (no third enclosed level), winery remains two, cream/blue-shutter townhouse becomes two. Preserve different colors, roofs, shopfronts and individual character.
```

### courtyards

Reference: `italian-courtyards-v1.png`.

```text
TWO distinct courtyard building sprites, L-shaped on LEFT and U-shaped on RIGHT, same positions, footprints and open courtyard shape. Both currently have THREE facade storeys: remove the middle storey on EVERY exterior and interior wing. Each wing must show a ground floor arcade/doors and exactly ONE upper window row, then terracotta roof. Preserve open courtyards, correct isometric occlusion, three wing lengths and colors. Reduce height by removing a floor, keep roof and ground footprint full width.
```

### landmarks

Reference: `italian-landmarks-v3.png`.

```text
TWO landmarks same LEFT/RIGHT order and original ground footprints. Left amphitheatre: redesign as a LOW ancient Roman amphitheatre with at most TWO arcade levels, not the current four/five. Right cathedral: redesign as a LOW Italian basilica with ground floor and at most ONE upper level, shallow small dome and very SHORT belfry, with no skyscraping tower. Whole silhouette of either landmark should be no taller than an ordinary two-storey house plus modest roof, at matching door scale. Keep recognizable Roman arches, green/white marble, terracotta roofs, and same exact 2:1 projection. Widths and occupied ground must stay full size.
```

### Narrow townhouse correction

Reference: `italian-buildings-extra-v1.png`.

```text
Use case: precise-object-edit. The reference is a PizzaCity game atlas. Extract and redraw ONLY the very BOTTOM-RIGHT cream-stone townhouse with blue shutters, as ONE isolated finished game sprite on real transparent background. It currently has three storeys: remove one storey so the result has EXACTLY TWO total: ground floor with one arched door, and ONE upper window row. CRITICAL: preserve its original elongated narrow foundation and viewing direction: the visible wall on the LEFT is very NARROW, only one window/door bay wide; the wall on the RIGHT is about THREE times as long, with three blue-shutter window bays. The vertical front corner and frontmost ground contact must lie about 27 percent of the way from the LEFT foundation corner to the RIGHT foundation corner, NOT centered. This is a long 1-by-3 townhouse, NOT a square cube. Preserve cream limestone corner blocks, weathered pale stucco, blue shutters, tiny balcony, terracotta roof and small chimney. Two storeys only; no attic or dormer level, no extra middle window row. Strict 2:1 isometric ground-edge slopes, all verticals vertical, original illustrated pixel art style and top-left lighting. Show the entire house, no crop, no other buildings, no text, no ground platform, no painted backdrop, no external shadows. Give it the normal generous door/window proportions of the reference, do not vertically squash it.
```

## Verification

The geometry test checks the two-storey limit, unchanged foundation edges and vertical walls. Browser QA checks all 28 production textures, missing-atlas fallbacks, mobile property previews and preservation of existing cash, game time and warehouse ownership. The city mix test checks street and water clearance, frontage seams and courtyard placement across eight seeds.
