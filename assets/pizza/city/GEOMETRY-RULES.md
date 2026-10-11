# City geometry and Italian art direction

## Reference observations

Icograms uses a fixed 2:1 projection (26.565 degrees) and illustrated 2D assets rather than a rotating 3D camera: https://icograms.com/faq

The supplied City Center JSON has a 1280 x 960 canvas, 275 top-level entries, 441 entries including descendants, and 37 groups with nesting up to two levels. Position, scale, flip and colorMapping are stored separately. Adjacent repeated houses include a (64,32) screen-space displacement, consistent with a 2:1 ground axis. These are illustration placement observations, not evidence of a gameplay collision or city-generation algorithm.

The reference sheets show compact houses, long street fronts, L-shaped wings, U-shaped blocks and enclosed courtyards. Those basic geometric forms inform our original templates. No Icograms stock image, SVG, exported JSON or traced facade is included here.

## Production rules

1. Ground geometry has two axes: screen (32,16) and (-32,16) for one 64 x 32 tile. Vertical walls remain vertical. Cornices, window rows and foundation edges stay parallel to the appropriate ground axis.
2. Store the occupied footprint, courtyard holes, front ground anchor, facade height and image crop separately. PNG width and height describe the image rectangle, not occupied ground.
3. Check footprint cells against streets, water and existing buildings before placing an asset. An L-shaped building does not occupy its empty courtyard. A courtyard passage also needs a separate entrance and pedestrian connection when added to gameplay.
4. Streets define buildable parcels; they do not dictate identical square blocks. Current streets vary between 0.75 and 1.1 world units instead of two units, with offset T-junctions and variable block widths. Asset scale stays stable.
5. Combine narrow townhouses into continuous street fronts; use corner wings, courtyards and occasional setbacks to vary blocks. Keep space for restaurant terraces and entrances. Avoid scattering every house evenly across a paved square.
6. Keep silhouette and footprint fixed when changing visual style. Italian variants change stucco, terracotta roofs, shutters, balconies, stone courses and arcades. Roof shape, floor count and courtyard details may vary within the same occupied ground.
7. Use one camera and light direction across the entire catalog. Rotations require a separately drawn view; mirroring an image must also update its footprint, anchor, entrance and lighting.
8. Render ground first and sort buildings and moving actors by their ground contact. Larger wings may need separate draw layers to avoid an entire sprite hiding a person standing in its courtyard.

## Original template catalog

`pizza-city-footprints.js` defines six independent geometry templates and occupied cells. `geometry/building-footprints.svg` is a precise projection guide for drawing or image generation, not a replacement game-art atlas. The existing city art remains active; these templates are the basis for subsequent Italian assets and footprint-aware placement.

| Template | Outer dimensions | Occupied cells | First Italian variant |
| --- | --- | --- | --- |
| Compact | 2 x 2 | 4 | Ochre townhouse |
| Townhouse | 2 x 3 | 6 | Narrow house with shop |
| Street front | 4 x 2 | 8 | Arcaded palazzo facade |
| L-shaped corner | 4 x 3 | 6 | Palazzo and terrace |
| U-shaped courtyard | 4 x 4 | 10 | Palazzo with open loggia court |
| Enclosed courtyard | 4 x 4 | 12 | Residential courtyard block |

## Direct asset reuse

The published commercial license explicitly allows modifications and use in computer games, but prohibits selling, sublicensing or transferring the stock media itself: https://icograms.com/license-agreement-commercial

Direct adaptation of Icograms assets requires the appropriate license. Publishing reusable stock or derived assets in a public repository needs separate clarification of that restriction. Generic independent ground geometry and our own Italian illustrations avoid copying those stock files.
