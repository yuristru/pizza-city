# Isometric building atlas, revision 2

Current house-generation instructions: [HOUSE-ASSET-WORKFLOW.md](../../../docs/HOUSE-ASSET-WORKFLOW.md). The separate eight-building civic/commercial atlas has been retired, including older PNG revisions. Its six properties now use the shared 32-house atlas without changes to IDs, prices or functions. The remaining prompt recipes below document the earlier generation.

Three original production PNGs generated with the built-in Imagegen edit tool. Returned PNG bytes are copied unchanged into `assets/pizza/city/`. Native SVG construction guides supply exact 2:1 geometry; no image-edit script changes the production bitmaps.

| Asset | Content |
| --- | --- |
| `italian-houses-32-two-storey-v2.png` | 32 different houses in one 8 × 4 atlas |
| `italian-courtyards-two-storey-v2.png` | 4 palazzi: two L-shaped and two U-shaped |
| `italian-landmarks-two-storey-v2.png` | 2 low landmarks |

## Projection and variants

The previous runtime stretched the left and right halves independently. That could bend a roof ridge at the front corner and disagree across courtyard wings. Every complete replacement sprite now uses one affine matrix. Foundation directions, vertical walls, roofs, chimneys and courtyard wings share that matrix. The same textures serve the city, property previews and geometry study. The curved arena retains uniform scaling. Assets remain limited to two storeys total.

The house catalog grows from 16 to 32 active variants and is actually included in city generation. House types include townhouses, corner shops, arcaded palazzetti, workshops, canal houses, stone cottages, narrow studios, gatehouses and open roof terraces. Roofs include hipped roofs, gables and open terraces. Chimney recipes vary form and roof position rather than repeating one ridge-mounted stack. Four courtyard styles are selected by shape and city seed.

`geometry/isometric-building-blueprints.json` stores original geometry/style recipes. Run `node assets/pizza/city/geometry/build-isometric-guides.mjs` from the repository root to reproduce the SVG construction guides. Source geometry and measured art calibration remain separate.

## Prompt set

### houses

Geometry reference: `qa/isometric-guides/houses-32.png`; material/style reference: `italian-buildings-two-storey-v1.png`.

```text
Use case: precise-object-edit. Production replacement flat 2D pixel-art sprite sheet for PizzaCity. Image 1 is the EXACT GEOMETRY edit target, a mathematically drawn 2:1 isometric construction sheet. Image 2 is ONLY a surface/material/style reference, NOT a geometry reference. Dress the plain volumes in Image 1 with finished warm Italian illustrated pixel art, matching Image 2's terracotta, shutters, stucco, stone and delicate pixel detail. Geometry is the highest priority: TRACE the exact wall corners, roof eaves, roof ridges, wing positions, silhouette footprint and vertical walls of Image 1. Do NOT reinterpret their perspective. Every horizontal ground-level or eave edge and every horizontal ridge uses screen slope +1/2 or -1/2 (two pixels across to one pixel up). Vertical lines stay vertical. Roof pitch/hip diagonals may slope differently, but all parallel architectural edges stay parallel, no vanishing points. No front-facing or sideways perspective, no 30-degree true-isometric camera. Exactly TWO STOREYS MAXIMUM TOTAL: ground floor doors/shops plus ONE upper window row, or a single storey where indicated. No third window row, no occupied attic, no third rooftop room. Preserve input 1 canvas aspect ratio, EXACT sprite count, row/column layout, cell positions, relative building sizes, foundation contacts and empty gutters. Keep each complete building inside its cell. Genuine transparent background and transparent gaps, no ground slabs/streets/shadows/backdrop/grid/labels/text/watermark. Common light from upper left. Add convincing doors, windows and details instead of the guide's placeholder rectangles. Vary chimney shape and exact roof location, do NOT put the same square chimney on every ridge. Make all assets finished game artwork, not blank diagram blocks.
Canvas 3072 x 2048, EXACTLY 32 houses in EIGHT columns and FOUR rows. Read specifications row-major, left to right, top to bottom. These must be distinct architectural variants, not just color swaps. Keep the narrow last house of row 2 long and narrow. Open roof terraces have no enclosed extra level.
Cell specifications:
1. Ochre residence, green shutters, arched oak door. Roof hip. 2 storeys. Chimney brick shaft with plain slab cap, at roof fraction 0.2,0.28.
2. Ivory corner residence, blue shutters, tiny iron balcony. Roof hip. 2 storeys. Chimney two terracotta pots on a low masonry base, at roof fraction 0.75,0.3.
3. Salmon house, green shutters, asymmetrical window bays. Roof hip. 2 storeys. Chimney round pale plaster flue with clay cap, at roof fraction 0.22,0.72.
4. Yellow grocer, deep green cloth awnings. Roof hip. 2 storeys. Chimney short square stone stack, at roof fraction 0.75,0.72.
5. Cream pizzeria, red striped awning and flower boxes. Roof hip. 2 storeys. Chimney slender dark metal flue, at roof fraction 0.4,0.35.
6. Pale stone bakery, green striped awning. Roof hip. 2 storeys. Chimney paired short brick stacks, at roof fraction 0.65,0.6.
7. Red corner trattoria, two separate striped awnings. Roof hip. 2 storeys. Chimney small plaster stack with black hood, at roof fraction 0.3,0.5.
8. Limestone palazzetto, tall arched windows. Roof hip. 2 storeys. Chimney wide terracotta capped chimney, at roof fraction 0.68,0.2.
9. Cream townhouse, single wrought iron balcony. Roof hip. 2 storeys. Chimney brick shaft with plain slab cap, at roof fraction 0.2,0.28.
10. Butter yellow cafe, red cafe awning. Roof hip. 2 storeys. Chimney two terracotta pots on a low masonry base, at roof fraction 0.75,0.3.
11. Blue coastal house, white stone trim. Roof hip. 2 storeys. Chimney round pale plaster flue with clay cap, at roof fraction 0.22,0.72.
12. Ochre fruit shop with open ground-floor display. Roof hip. 2 storeys. Chimney short square stone stack, at roof fraction 0.75,0.72.
13. Brick red vintner, broad arched cellar door. Roof hip. 2 storeys. Chimney slender dark metal flue, at roof fraction 0.4,0.35.
14. Yellow house with open planted roof terrace. Roof terrace. 2 storeys. Chimney paired short brick stacks, at roof fraction 0.65,0.6.
15. Rose winery with two broad ground-floor arches. Roof hip. 2 storeys. Chimney small plaster stack with black hood, at roof fraction 0.3,0.5.
16. Long narrow ivory townhouse, blue shutters. Roof hip. 2 storeys. Chimney wide terracotta capped chimney, at roof fraction 0.68,0.2.
17. Terracotta artisan workshop, wide timber double door. Roof gable. 2 storeys. Chimney brick shaft with plain slab cap, at roof fraction 0.2,0.28.
18. Pale pink bookshop, slender arched display windows. Roof hip. 2 storeys. Chimney two terracotta pots on a low masonry base, at roof fraction 0.75,0.3.
19. Whitewashed seaside cottage, blue wooden shutters. Roof hip. 2 storeys. Chimney round pale plaster flue with clay cap, at roof fraction 0.22,0.72.
20. Sage green corner pharmacy, carved stone door surround. Roof gable. 2 storeys. Chimney short square stone stack, at roof fraction 0.75,0.72.
21. Ochre arcaded palazzetto, three ground-floor arches. Roof hip. 2 storeys. Chimney slender dark metal flue, at roof fraction 0.4,0.35.
22. Soft blue canal house, stone quay doorway. Roof hip. 2 storeys. Chimney paired short brick stacks, at roof fraction 0.65,0.6.
23. Cream terraced home, shallow gable, green balcony. Roof gable. 2 storeys. Chimney small plaster stack with black hood, at roof fraction 0.3,0.5.
24. Dusty rose flower shop, plain canvas canopy. Roof hip. 2 storeys. Chimney wide terracotta capped chimney, at roof fraction 0.68,0.2.
25. Rural Tuscan stone house, offset entrance and log stack. Roof hip. 2 storeys. Chimney brick shaft with plain slab cap, at roof fraction 0.2,0.28.
26. Compact white stucco villa, low red roof. Roof gable. 2 storeys. Chimney two terracotta pots on a low masonry base, at roof fraction 0.75,0.3.
27. Narrow red-brick studio, large upper arched window. Roof hip. 2 storeys. Chimney round pale plaster flue with clay cap, at roof fraction 0.22,0.72.
28. Pale yellow long street-front home, paired balconies. Roof hip. 2 storeys. Chimney short square stone stack, at roof fraction 0.75,0.72.
29. Pastel apricot corner deli, recessed entrance. Roof gable. 2 storeys. Chimney slender dark metal flue, at roof fraction 0.4,0.35.
30. Sea-green home with open rooftop pergola. Roof terrace. 2 storeys. Chimney paired short brick stacks, at roof fraction 0.65,0.6.
31. Ivory courtyard gatehouse, central archway. Roof hip. 2 storeys. Chimney small plaster stack with black hood, at roof fraction 0.3,0.5.
32. Weathered coral fisher house, plain blue door. Roof gable. 2 storeys. Chimney wide terracotta capped chimney, at roof fraction 0.68,0.2.
```

### courts

Geometry reference: `qa/isometric-guides/courtyards-4.png`; material/style reference: `italian-courtyards-two-storey-v1.png`.

```text
Use case: precise-object-edit. Production replacement flat 2D pixel-art sprite sheet for PizzaCity. Image 1 is the EXACT GEOMETRY edit target, a mathematically drawn 2:1 isometric construction sheet. Image 2 is ONLY a surface/material/style reference, NOT a geometry reference. Dress the plain volumes in Image 1 with finished warm Italian illustrated pixel art, matching Image 2's terracotta, shutters, stucco, stone and delicate pixel detail. Geometry is the highest priority: TRACE the exact wall corners, roof eaves, roof ridges, wing positions, silhouette footprint and vertical walls of Image 1. Do NOT reinterpret their perspective. Every horizontal ground-level or eave edge and every horizontal ridge uses screen slope +1/2 or -1/2 (two pixels across to one pixel up). Vertical lines stay vertical. Roof pitch/hip diagonals may slope differently, but all parallel architectural edges stay parallel, no vanishing points. No front-facing or sideways perspective, no 30-degree true-isometric camera. Exactly TWO STOREYS MAXIMUM TOTAL: ground floor doors/shops plus ONE upper window row, or a single storey where indicated. No third window row, no occupied attic, no third rooftop room. Preserve input 1 canvas aspect ratio, EXACT sprite count, row/column layout, cell positions, relative building sizes, foundation contacts and empty gutters. Keep each complete building inside its cell. Genuine transparent background and transparent gaps, no ground slabs/streets/shadows/backdrop/grid/labels/text/watermark. Common light from upper left. Add convincing doors, windows and details instead of the guide's placeholder rectangles. Vary chimney shape and exact roof location, do NOT put the same square chimney on every ridge. Make all assets finished game artwork, not blank diagram blocks.
Canvas 1536 x 1536, EXACTLY FOUR courtyard palazzi in TWO columns and TWO rows. TOP LEFT ochre L shape, TOP RIGHT ivory U shape, BOTTOM LEFT salmon L shape, BOTTOM RIGHT sage U shape. Use the geometric guide, not the old perspective in the style image. Every wing is two storeys with ground-floor archways and ONE upper window row. Keep the open court empty and transparent all the way through the footprint; do not invent a front closing wing. Long parallel roof ridges must have exactly the same angle. Each palazzo has 1-3 small differently shaped chimneys on different roof sections, never identical repeated chimney positions. Add stone arcade piers, varied shutters and modest balconies, no floor or lawn in court.
Cell specifications:
1. Ochre L-shaped palazzo, stone ground-floor arches, green shutters. Roof hip. 2 storeys. Chimney round pale plaster flue with clay cap, at roof fraction 0.22,0.72.
2. Ivory U-shaped palazzo, blue shutters, continuous ground-floor arcade. Roof hip. 2 storeys. Chimney short square stone stack, at roof fraction 0.75,0.72.
3. Salmon L-shaped residential palazzo, tall timber doors, cream pilasters. Roof hip. 2 storeys. Chimney slender dark metal flue, at roof fraction 0.4,0.35.
4. Pale sage U-shaped palazzo, green shutters, small iron balconies. Roof hip. 2 storeys. Chimney paired short brick stacks, at roof fraction 0.65,0.6.
```

### Landmarks

Reference: `italian-landmarks-two-storey-v1.png`.

```text
Use case: precise-object-edit. Edit the supplied PizzaCity two-landmark sprite atlas for strict 2:1 orthographic game isometry. Keep exactly TWO sprites, amphitheatre LEFT and Italian basilica RIGHT, with the same aspect ratio, order, positions, full ground footprints and overall two-storey scale. Redraw the basilica roof structure so all horizontal eaves, cornices, roof ridges, facade baselines and window rows on the same world axis are exactly parallel and use screen slopes +1/2 or -1/2 (two pixels across, one up). All vertical walls vertical; no perspective convergence. Pitched roof hip diagonals and curved dome edges naturally use their own slopes. Keep the amphitheatre as a low, recognisable TWO-tier Roman arena in the same shared 2:1 camera. Basilica has MAXIMUM TWO storeys total, low shallow dome and very short belfry; no third floor. Preserve richly illustrated warm Italian pixel art, terracotta tiles, green-and-white marble details, stone arcades and light from upper left. Transparent background with genuine alpha, no terrain, cast shadows, glow, road slabs, labels or text. No new buildings. The geometry is the correction; do not add floors, squeeze height or rotate buildings.
```
