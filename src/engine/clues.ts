import { OBJECT_TYPES } from './catalog';
import { cellIsOccupiable, type SceneIndex } from './scene';
import { DIRS, key } from './types';
import type { Atom, Cell, Clue, Dir, Scene } from './types';

const ORTHO: Dir[] = ['N', 'E', 'S', 'W'];

/**
 * 'Adjacent' means orthogonally next to, in the same room, and belonging to a
 * different object than the one the character is standing on.
 */
export function satisfiesAtom(idx: SceneIndex, cell: Cell, atom: Atom): boolean {
  switch (atom.kind) {
    case 'on': {
      const obj = idx.objectAt.get(key(cell));
      return !!obj && obj.type === atom.object;
    }
    case 'adjacent': {
      const standingOn = idx.objectAt.get(key(cell));
      const room = idx.roomAt.get(key(cell));
      for (const d of ORTHO) {
        const step = DIRS[d];
        const n = { x: cell.x + step.x, y: cell.y + step.y };
        if (n.x < 0 || n.y < 0 || n.x >= idx.size || n.y >= idx.size) continue;
        if (idx.roomAt.get(key(n)) !== room) continue; // adjacency never crosses a wall
        const obj = idx.objectAt.get(key(n));
        if (obj && obj.type === atom.object && obj.id !== standingOn?.id) return true;
      }
      return false;
    }
    case 'inRoom':
      return idx.roomAt.get(key(cell)) === atom.roomId;
    case 'facingWindow':
      return idx.windowCells.has(key(cell));
  }
}

export function satisfiesClue(idx: SceneIndex, cell: Cell, clue: Clue | null): boolean {
  if (!clue) return true; // the victim carries no positional clue
  return clue.atoms.every((a) => satisfiesAtom(idx, cell, a));
}

/** Every cell a character with this clue could legally occupy. */
export function candidateCells(scene: Scene, idx: SceneIndex, clue: Clue | null): Cell[] {
  const out: Cell[] = [];
  for (let y = 0; y < scene.size; y++) {
    for (let x = 0; x < scene.size; x++) {
      const c = { x, y };
      if (cellIsOccupiable(idx, c) && satisfiesClue(idx, c, clue)) out.push(c);
    }
  }
  return out;
}

/** Every atom that is true of this cell. */
export function trueAtoms(scene: Scene, idx: SceneIndex, cell: Cell): Atom[] {
  const atoms: Atom[] = [];

  for (const t of OBJECT_TYPES) {
    if (satisfiesAtom(idx, cell, { kind: 'on', object: t })) atoms.push({ kind: 'on', object: t });
    if (satisfiesAtom(idx, cell, { kind: 'adjacent', object: t }))
      atoms.push({ kind: 'adjacent', object: t });
  }

  const roomId = idx.roomAt.get(key(cell));
  if (roomId !== undefined) atoms.push({ kind: 'inRoom', roomId });
  if (satisfiesAtom(idx, cell, { kind: 'facingWindow' })) atoms.push({ kind: 'facingWindow' });

  return atoms;
}

/**
 * Candidate clues for a character standing on `cell`, ordered from weakest
 * (most candidate cells) to strongest. Singles first, then pairs.
 */
export function clueLadder(scene: Scene, idx: SceneIndex, cell: Cell): Clue[] {
  const atoms = trueAtoms(scene, idx, cell);
  const clues: Clue[] = atoms.map((a) => ({ atoms: [a] }));

  for (let i = 0; i < atoms.length; i++) {
    for (let j = i + 1; j < atoms.length; j++) {
      clues.push({ atoms: [atoms[i], atoms[j]] });
    }
  }

  return clues
    .map((clue) => ({ clue, size: candidateCells(scene, idx, clue).length }))
    .sort((a, b) => b.size - a.size)
    .map((entry) => entry.clue);
}
