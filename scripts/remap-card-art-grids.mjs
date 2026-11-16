/**
 * Re-slice source 4×4 grids → frontend/src/assets/cards/{slug}.{webp,png}
 * and rewrite frontend/src/utils/cardArt.js.
 *
 * Source files live as UUID jpgs under the agent assets folder (original
 * human names like "1-16.jpg" were not preserved by upload). Ranges are
 * locked explicitly below — do NOT sort by UUID and do NOT re-guess by
 * scanning cell content for grid order.
 *
 * Usage (from repo root, with PIL + cwebp):
 *   ASSETS_DIR=/path/to/assets node --experimental-vm-modules scripts/remap-card-art-grids.mjs
 * Prefer the Python block in git history / agent notes; this file documents the map.
 */

export const GRID_RANGES = [
  ['756f59f6-681c-4a18-9d39-2fa46ec7a8ce.jpg', 1, 16],
  ['6c84a1bb-60c8-4dae-ab54-9a7dc31c8e82.jpg', 17, 32],
  ['4a2ad300-aed1-4389-928b-96409b6766f2.jpg', 33, 48],
  ['67ea9443-46ec-4055-b4f1-a91c4f326717.jpg', 49, 64],
  ['76d31954-a870-4cee-82df-b5dea883022f.jpg', 65, 80],
  ['e2677e03-7cca-4e57-9b59-2f02d3958150.jpg', 81, 96],
  ['a7260e15-6966-4761-b9af-1c9996416209.jpg', 97, 112],
  ['0a3032e5-7bfb-4e38-97a0-21dc194a26d3.jpg', 113, 128],
  ['b82647f5-5571-4e05-8679-4fc7b24cbe22.jpg', 129, 144],
  ['1e535173-0df8-45da-b3a7-bf0af024d333.jpg', 145, 160],
  ['548a6317-3d3a-4208-af77-f0b855a6f576.jpg', 161, 176],
  ['072b1be0-4a67-4896-b446-b3b1b4ca31e1.jpg', 177, 192],
  ['af4d0467-ac8a-44be-91aa-5cdb6ec4b5c9.jpg', 193, 206],
]

/** e267 portrait sheet: catalogue slot offset → source cell index */
export const E267_CELL_ORDER = [2, 3, 4, 14, 1, 0, 12, 7, 9, 5, 8, 15, 13, 6, 10, 11]

console.log('GRID_RANGES', GRID_RANGES.length, 'E267_CELL_ORDER', E267_CELL_ORDER.length)
