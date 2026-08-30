import { candidateCells } from './clues';
import { indexScene, type SceneIndex } from './scene';
import type { Cell, Character, Scene } from './types';

export interface SolveInput {
  scene: Scene;
  characters: Character[];
  idx?: SceneIndex;
}

/**
 * Backtracking over characters, most-constrained first, tracking used rows and
 * columns as bitmasks. Stops as soon as `limit` solutions have been found, so
 * uniqueness checks abort at the second hit.
 */
export function solve(input: SolveInput, limit = 2): Cell[][] {
  const { scene, characters } = input;
  const idx = input.idx ?? indexScene(scene);

  const candidates = characters.map((c) => candidateCells(scene, idx, c.clue));
  if (candidates.some((c) => c.length === 0)) return [];

  const order = characters
    .map((_, i) => i)
    .sort((a, b) => candidates[a].length - candidates[b].length);

  const solutions: Cell[][] = [];
  const placement: Cell[] = new Array(characters.length);
  let rows = 0;
  let cols = 0;

  const walk = (depth: number): void => {
    if (solutions.length >= limit) return;
    if (depth === order.length) {
      solutions.push(placement.slice());
      return;
    }

    const ci = order[depth];
    for (const cell of candidates[ci]) {
      const rBit = 1 << cell.y;
      const cBit = 1 << cell.x;
      if (rows & rBit || cols & cBit) continue;

      rows |= rBit;
      cols |= cBit;
      placement[ci] = cell;

      walk(depth + 1);

      rows &= ~rBit;
      cols &= ~cBit;
      if (solutions.length >= limit) return;
    }
  };

  walk(0);
  return solutions;
}

export function isUnique(input: SolveInput): boolean {
  return solve(input, 2).length === 1;
}
