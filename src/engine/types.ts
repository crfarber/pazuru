/** A grid coordinate. Origin is top-left. */
export interface Cell {
  x: number;
  y: number;
}

/** Compass direction, used for tile rotation and adjacency. */
export type Dir = 'N' | 'E' | 'S' | 'W';

export type ObjectType = 'bed' | 'desk' | 'plant' | 'chair' | 'rug' | 'tv' | 'shelf';

/** Room archetype key. Rendered per locale, never stored as display text. */
export type RoomKey = 'bedroom' | 'kids' | 'living' | 'office' | 'hall' | 'bathroom';

export interface Room {
  id: number;
  key: RoomKey;
  x: number;
  y: number;
  w: number;
  h: number;
  cells: Cell[];
}

export interface SceneObject {
  id: number;
  type: ObjectType;
  roomId: number;
  /** Ordered cells. For beds: [head, foot]. For desks: the run in order. */
  cells: Cell[];
}

/**
 * A window sits on a wall, not in a cell.
 * `b` is null when the window is on the outer border of the map.
 */
export interface WindowEdge {
  id: number;
  a: Cell;
  b: Cell | null;
}

export interface Scene {
  size: number;
  rooms: Room[];
  objects: SceneObject[];
  windows: WindowEdge[];
}

/** A single testable statement about where a character stood. */
export type Atom =
  | { kind: 'on'; object: ObjectType }
  | { kind: 'adjacent'; object: ObjectType }
  | { kind: 'inRoom'; roomId: number }
  | { kind: 'facingWindow' };

/** A clue is a conjunction of atoms. The victim has no clue. */
export interface Clue {
  atoms: Atom[];
}

export interface Character {
  id: number;
  /** Index into the per-locale name pool. Keeps the puzzle language-neutral. */
  nameIndex: number;
  isVictim: boolean;
  clue: Clue | null;
}

export type DifficultyBand = 'easy' | 'medium' | 'hard';

export interface Difficulty {
  /** Deepest solving technique the propagation solver needed. */
  highestTier: number;
  /** Number of deductions made before the puzzle was solved or stalled. */
  steps: number;
  /** True when tier 1-2 propagation alone could not finish it. */
  needsSearch: boolean;
  score: number;
  band: DifficultyBand;
}

export interface Puzzle {
  seed: number;
  scene: Scene;
  characters: Character[];
  /** solution[i] is the cell of characters[i]. */
  solution: Cell[];
  victimId: number;
  murdererId: number;
  difficulty: Difficulty;
}

export const DIRS: Record<Dir, Cell> = {
  N: { x: 0, y: -1 },
  E: { x: 1, y: 0 },
  S: { x: 0, y: 1 },
  W: { x: -1, y: 0 },
};

export const key = (c: Cell): string => `${c.x},${c.y}`;
export const sameCell = (a: Cell, b: Cell): boolean => a.x === b.x && a.y === b.y;
