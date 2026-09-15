# Working notes for Pazuru

`pazuru-rules.md` is the specification. This file covers what the code cannot
tell you on its own.

## Invariants

Break any of these and puzzles become unsolvable in ways the type system will
not catch. Most of them fail silently: the generator keeps producing output,
the output is just wrong.

1. **N equals the character count.** The grid is N×N and there are exactly N
   characters, N−1 suspects plus one victim. This is what forces the victim into
   the last remaining cell. Do not place fewer characters on a larger grid
   without redesigning the victim rule first.
2. **The engine never imports React.** `src/engine/` is pure TypeScript. The
   batch script runs it in Node; the app runs it in the browser. An import of
   `react` anywhere under `src/engine/` breaks `npm run generate`.
3. **Walls are derived, never authored.** A wall exists between two neighbouring
   cells exactly when they belong to different rooms. Never store a wall list.
4. **Adjacency does not cross a wall.** `accanto` / "next to" means orthogonally
   adjacent *and* in the same room. No diagonals. This is the constraint most
   likely to produce silently wrong puzzles.
5. **Adjacency refers to a different object.** Standing on a bed does not make
   you "next to a bed".
6. **Windows live on edges, not in cells.** A border window is faced by one
   cell; an interior window by two, one in each adjoining room.
7. **Exactly one suspect shares the victim's room.** Zero or two leaves the
   puzzle without an answer. This is a generation constraint, not a solving aid:
   the solver must never use it, or the logical contract of the puzzle changes.
8. **Every character stands on a clue-bearing cell.** A cell with no object
   adjacency and no window can only ever be pinned to a room, which is far too
   weak for a unique solution.
9. **Uniqueness is verified, not assumed.** Every generated puzzle passes
   `solve(puzzle, limit=2).length === 1`.

## Before you commit

```bash
npm run smoke     # 200 puzzles, must report 0 invariant failures
npx tsc --noEmit  # must be clean
```

`npm run smoke` is the real test suite. If a change to the engine, the scene
generator or the clue system does not keep it at zero failures, the change is
wrong regardless of how reasonable it looks.

## Things that are deliberate, not oversights

- **The board is a component, and there is only one.** `PazuruMap` replaced the
  string renderer when cell interaction landed. Publication (`generate-batch`)
  renders that same component with `renderToStaticMarkup`, so the frozen SVG in a
  published puzzle cannot drift from what a player sees. Adding a second string
  renderer for Node would reintroduce exactly the drift this avoids.
- **The board never checks itself against the solution.** Pencil marks and
  committed placements are what the player believes, not what is true. Nothing in
  `PazuruMap` or `App` may read `puzzle.solution` outside the `reveal` branch.
  The one piece of feedback allowed is `conflictingPlacements`, which flags two of
  the player's *own* placements sharing a row or column — a rule they already
  know, never a hint about this puzzle.
- **Blocked cells are inert, occupiable ones are not.** A cell carrying a table,
  TV, plant or desk takes no clicks. That is §4.2 of the rules, not a
  clue: it is true of every puzzle before any deduction.
- **Chair, sofa, table and TV are drawn in code.** They are placeholders awaiting
  art, flagged by `hasArt: false` in `src/engine/catalog.ts`. Chair and sofa are
  occupiable, so they carry real weight in the clue space; they are not
  decoration. Sofa and table are continuous runs, not per-cell slices.
- **`public/tiles/plant.svg` is not used by the renderer.** It wraps an 864 KB
  PNG in a `<pattern>`. The renderer draws a coded plant until it is revectorised.
- **Difficulty is not grid size.** It is the deepest technique a player needs.
  See `src/engine/difficulty.ts`.

## Tile contract

- 48 × 48 per cell, origin top-left, no padding, no baked background.
- Colours come from `--ink`, `--tile-surface`, `--tile-placeholder`. Never a
  literal hex in a tile.
- Multi-cell objects are per-cell segments for bed and desk; sofa and table are
  one continuous run. Each segment tile declares the direction its surface
  connects toward in its unrotated form.
- Filename equals the object key.

Adding an object type is three edits: an entry in `src/engine/catalog.ts`, a
case in `src/renderer/tiles.ts`, and a name in each locale.

## Style

- Comments explain why, not what. The invariants above are the kind of thing
  worth a comment; a loop that iterates cells is not.
- No new dependencies without a reason that survives the question "what does
  this do that twenty lines would not". The engine has zero runtime deps and
  should keep them.
