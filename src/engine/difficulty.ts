import { candidateCells } from './clues';
import { indexScene } from './scene';
import { key } from './types';
import type { Cell, Character, Difficulty, Scene } from './types';

/**
 * Solves the way a player does, using only the published techniques, and
 * reports how far it got. Grid size is a poor difficulty signal; the deepest
 * technique required is a real one.
 *
 * Tier 1  a character has exactly one candidate cell
 * Tier 2  a row or column can only be claimed by one character
 * Tier 3+ anything this loop cannot reach
 */
export function scoreDifficulty(scene: Scene, characters: Character[]): Difficulty {
  const idx = indexScene(scene);
  const candidates = characters.map((c) => candidateCells(scene, idx, c.clue));
  const fixed: (Cell | null)[] = characters.map(() => null);

  let steps = 0;
  let highestTier = 0;

  const eliminate = (ci: number, cell: Cell) => {
    fixed[ci] = cell;
    candidates[ci] = [cell];
    for (let i = 0; i < candidates.length; i++) {
      if (i === ci || fixed[i]) continue;
      candidates[i] = candidates[i].filter(
        (c) => c.x !== cell.x && c.y !== cell.y && key(c) !== key(cell),
      );
    }
  };

  let progress = true;
  while (progress && fixed.some((f) => !f)) {
    progress = false;

    // Tier 1: a single remaining candidate.
    for (let i = 0; i < candidates.length; i++) {
      if (fixed[i] || candidates[i].length !== 1) continue;
      eliminate(i, candidates[i][0]);
      steps++;
      highestTier = Math.max(highestTier, 1);
      progress = true;
    }
    if (progress) continue;

    // Tier 2: a row or column reachable by exactly one unfixed character.
    for (const axis of ['y', 'x'] as const) {
      for (let line = 0; line < scene.size && !progress; line++) {
        const claimants: number[] = [];
        for (let i = 0; i < candidates.length; i++) {
          if (fixed[i]) continue;
          if (candidates[i].some((c) => c[axis] === line)) claimants.push(i);
        }
        if (claimants.length !== 1) continue;

        const ci = claimants[0];
        const narrowed = candidates[ci].filter((c) => c[axis] === line);
        if (narrowed.length === candidates[ci].length) continue;

        candidates[ci] = narrowed;
        steps++;
        highestTier = Math.max(highestTier, 2);
        progress = true;
      }
      if (progress) break;
    }
  }

  const needsSearch = fixed.some((f) => !f);
  if (needsSearch) highestTier = Math.max(highestTier, 3);

  // The deepest technique required is the honest signal. Steps only break ties
  // for ordering a week's curve within a band.
  const score = steps + highestTier * 12 + (needsSearch ? 25 : 0);
  const band: Difficulty['band'] = needsSearch ? 'hard' : highestTier >= 2 ? 'medium' : 'easy';

  return { highestTier, steps, needsSearch, score, band };
}
