# Pazuru — phase 1

A working generator, solver and renderer for the Pazuru deduction puzzle.
Rules live in `pazuru-rules.md`; this repository implements them.

## Run it

```bash
npm install
npm run dev          # the app at localhost:5173
npm run smoke        # generate 200 puzzles and assert every invariant
npm run generate -- --weeks 8 --start 2026-09-07 --out content/puzzles
```

Or open `pazuru-preview.html` directly. It is the same engine and the same
renderer, bundled into one file, no install required.

## Layout

```
src/engine/     pure TypeScript, no React import anywhere
  rng.ts        seeded RNG; every puzzle is reproducible from its seed
  types.ts      domain types
  catalog.ts    object catalogue and per-room furniture tables
  scene.ts      BSP rooms, derived walls, furniture, windows, validation
  clues.ts      clue predicates, derivation, strength ranking
  solver.ts     backtracking with row/column bitmasks
  difficulty.ts human-style propagation solver used for scoring
  generate.ts   the generation loop
src/renderer/   PazuruMap, the interactive board; tiles.ts, the object art
src/content/    locales and name pools
scripts/        smoke test and batch publication
public/tiles/   the supplied art
```

The engine never imports React. That is the one hard architectural rule: the
batch script runs it in Node, the app runs it in the browser.

## How generation works

1. Partition the grid with BSP into 4–6 rectangular rooms. Walls are derived
   from the partition, never authored.
2. Place furniture per room archetype, up to 55% of the room's cells.
3. Reject the scene unless every row, every column and every room has at least
   one cell a character can stand on. Without this the one-person-per-row rule
   makes the puzzle unsolvable regardless of clues.
4. Find a Latin placement where every character stands on a clue-bearing cell
   and exactly one room holds exactly two people.
5. Give every suspect their weakest true clue, then strengthen only the clues
   that permit an alternative solution, using the second solution to choose who
   to strengthen.
6. Verify uniqueness, then score difficulty.

Measured at 8×8: about 38 ms per puzzle, zero invariant failures over 300 runs.

## Playing the board

The map is written on the way a sudoku grid is: nothing you put down is checked
against the solution.

- Pick a character, then click a square to **pencil** them in. One character can
  be pencilled into every square their clue allows — all three sofa cells — and one
  square can hold several characters at once. Each character keeps a fixed slot
  inside the square, so the position identifies them before the letter is legible.
- **Shift-click**, or switch to Place mode, to commit. A character has at most one
  committed square; committing again moves them and displaces whoever was there,
  and clears their own pencil marks.
- Right-click clears a square. `1`–`9` select a character, `N` and `P` switch mode.
- A red dashed ring means two of your own committed placements share a row or a
  column. It says nothing about whether either is in the right square.

Squares carrying a table, TV, plant or desk take no clicks at all: nobody
may ever stand there, in any puzzle.

## Difficulty

Grid size is a weak difficulty lever. What is scored instead is the deepest
technique a player needs:

| Tier | Technique |
|---|---|
| 1 | A character has exactly one candidate cell |
| 2 | A row or column can only be claimed by one character |
| 3 | Anything propagation cannot reach; requires search |

Rough spread at 8×8: 18% easy, 49% medium, 33% hard.

## Tile contract

- 48 × 48 per cell, origin top-left, no padding.
- Bed and desk use per-cell segments; the renderer rotates them. Sofa and table
  are drawn as one continuous run so seams never break the outline.
- **No baked background.** The supplied tiles carry a solid `#1AFF00` or
  `#0004FF` fill rect; the renderer strips it. The floor belongs to the room.
- **No baked colour.** Use `currentColor` or the CSS variables `--ink`,
  `--tile-surface`, `--tile-placeholder`.
- Filename equals the object key: `bed-pillow`, `bed-feet`, `desk-end`,
  `desk-middle`, `desk-corner`, `plant`, `chair`, `tv`, `sofa`, `table`.

### Art status

| Object | Occupiable | Size | Art |
|---|---|---|---|
| bed | yes | 2 | supplied (`bed-pillow` + `bed-feet`) |
| sofa | yes | 2–3 | placeholder (continuous run) |
| table | no | 2–3 | placeholder (continuous run) |
| desk | no | 2–3, may L | supplied (`desk-end`, `desk-middle`, `desk-corner`) |
| plant | no | 1 | supplied, **needs revectorising** |
| chair | yes | 1 | placeholder drawn in code |
| tv | no | 1 | placeholder drawn in code |

Windows are kozijnen on wall edges, not cell objects.

Two things need attention:

1. `plant.svg` is 864 KB because it wraps a 750×938 PNG in a `<pattern>`. It
   needs to be redrawn as real vector paths. The renderer currently uses a coded
   plant instead.
2. Chair and sofa are occupiable, so their absence directly shrinks the clue
   space. Adding real art for them is the highest-value asset work.

## Next

- Tier 3 and 4 techniques in `difficulty.ts` for a finer curve.
- Italian and Dutch locales, with gender and article tables per object.
- Composable character avatars.
