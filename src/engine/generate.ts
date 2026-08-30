import { clueLadder, trueAtoms } from './clues';
import { scoreDifficulty } from './difficulty';
import { Rng } from './rng';
import { cellIsOccupiable, generateScene, indexScene, validateScene } from './scene';
import { solve } from './solver';
import { key } from './types';
import type { Cell, Character, Clue, Puzzle, Scene } from './types';

export interface GenerateOptions {
  size?: number;
  seed?: number;
  /** Reject puzzles outside this band. Useful when filling a weekly curve. */
  band?: Puzzle['difficulty']['band'];
}

interface Arrangement {
  cells: Cell[];
  victim: number;
  murderer: number;
}

/**
 * A Latin placement where exactly one room holds exactly two people.
 * That pairing is what makes the murderer well defined: the victim and one
 * suspect alone together. Zero or two suspects in that room has no answer.
 */
/**
 * Cells that can carry a meaningful clue: on an object, next to one, or facing
 * a window. A character on a bare floor cell can only ever be pinned to a room,
 * which is far too weak to produce a unique solution.
 */
function richCells(scene: Scene, idx: ReturnType<typeof indexScene>): Set<string> {
  const rich = new Set<string>();
  for (let y = 0; y < scene.size; y++) {
    for (let x = 0; x < scene.size; x++) {
      const c = { x, y };
      if (!cellIsOccupiable(idx, c)) continue;
      if (trueAtoms(scene, idx, c).some((a) => a.kind !== 'inRoom')) rich.add(key(c));
    }
  }
  return rich;
}

/**
 * A Latin placement where every character stands on a clue-bearing cell and
 * exactly one room holds exactly two people. That pairing is what makes the
 * murderer well defined: the victim and one suspect, alone together. Zero or
 * two suspects in that room would leave the puzzle without an answer.
 */
function findArrangement(scene: Scene, rng: Rng): Arrangement | null {
  const idx = indexScene(scene);
  const n = scene.size;
  const rich = richCells(scene, idx);

  const columnsByRow: number[][] = [];
  for (let y = 0; y < n; y++) {
    const cols: number[] = [];
    for (let x = 0; x < n; x++) if (rich.has(key({ x, y }))) cols.push(x);
    if (cols.length === 0) return null;
    columnsByRow.push(cols);
  }

  const found: number[][] = [];
  const perm: number[] = new Array(n);
  let usedCols = 0;
  let visited = 0;

  const walk = (y: number): void => {
    if (found.length >= 40 || visited > 20000) return;
    visited++;
    if (y === n) {
      found.push(perm.slice());
      return;
    }
    for (const x of rng.shuffle(columnsByRow[y])) {
      const bit = 1 << x;
      if (usedCols & bit) continue;
      usedCols |= bit;
      perm[y] = x;
      walk(y + 1);
      usedCols &= ~bit;
      if (found.length >= 40) return;
    }
  };

  walk(0);
  if (found.length === 0) return null;

  for (const candidate of rng.shuffle(found)) {
    const cells: Cell[] = candidate.map((x, y) => ({ x, y }));

    const byRoom = new Map<number, number[]>();
    cells.forEach((c, i) => {
      const r = idx.roomAt.get(key(c))!;
      const list = byRoom.get(r) ?? [];
      list.push(i);
      byRoom.set(r, list);
    });

    const pairRooms = [...byRoom.values()].filter((occupants) => occupants.length === 2);
    if (pairRooms.length === 0) continue;

    const pair = rng.pick(pairRooms);
    const victimFirst = rng.chance(0.5);
    return {
      cells,
      victim: victimFirst ? pair[0] : pair[1],
      murderer: victimFirst ? pair[1] : pair[0],
    };
  }

  return null;
}

/**
 * Start every suspect on their weakest true clue, then strengthen only the
 * clues that actually permit an alternative solution. Using the second
 * solution to pick who to strengthen converges far faster than random retry.
 */
function assignClues(scene: Scene, arrangement: Arrangement, rng: Rng): Character[] | null {
  const idx = indexScene(scene);
  const ladders = arrangement.cells.map((cell, i) =>
    i === arrangement.victim ? [] : clueLadder(scene, idx, cell),
  );
  if (ladders.some((l, i) => i !== arrangement.victim && l.length === 0)) return null;

  const rung = arrangement.cells.map(() => 0);
  const nameOrder = rng.permutation(arrangement.cells.length);

  const build = (): Character[] =>
    arrangement.cells.map((_, i) => ({
      id: i,
      nameIndex: nameOrder[i],
      isVictim: i === arrangement.victim,
      clue: i === arrangement.victim ? null : (ladders[i][rung[i]] as Clue),
    }));

  for (let attempt = 0; attempt < 300; attempt++) {
    const characters = build();
    const solutions = solve({ scene, characters, idx }, 2);

    if (solutions.length === 1) return characters;
    if (solutions.length === 0) return null; // should not happen; clues are derived from the truth

    // Strengthen a character whose position is not yet pinned down.
    const [a, b] = solutions;
    const ambiguous = characters
      .map((_, i) => i)
      .filter(
        (i) =>
          i !== arrangement.victim &&
          (a[i].x !== b[i].x || a[i].y !== b[i].y) &&
          rung[i] < ladders[i].length - 1,
      );

    if (ambiguous.length === 0) return null;
    rung[rng.pick(ambiguous)]++;
  }

  return null;
}

/** One attempt. Returns null when the scene or arrangement is unusable. */
function attempt(size: number, seed: number): Puzzle | null {
  const rng = new Rng(seed);

  const scene = generateScene(size, rng);
  if (!validateScene(scene)) return null;

  const arrangement = findArrangement(scene, rng);
  if (!arrangement) return null;

  const characters = assignClues(scene, arrangement, rng);
  if (!characters) return null;

  return {
    seed,
    scene,
    characters,
    solution: arrangement.cells,
    victimId: arrangement.victim,
    murdererId: arrangement.murderer,
    difficulty: scoreDifficulty(scene, characters),
  };
}

/**
 * Generation is rejection sampling, so runtime per puzzle is variable.
 * That variance is why puzzles are produced in batches ahead of publication
 * rather than on a schedule at publication time.
 */
export function generatePuzzle(options: GenerateOptions = {}): Puzzle {
  const size = options.size ?? 8;
  let seed = options.seed ?? Math.floor(Math.random() * 2 ** 31);

  for (let tries = 0; tries < 2000; tries++) {
    const puzzle = attempt(size, seed + tries);
    if (puzzle && (!options.band || puzzle.difficulty.band === options.band)) return puzzle;
  }

  throw new Error(`Could not generate a ${size}x${size} puzzle from seed ${seed}`);
}
