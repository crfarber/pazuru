import { MAX_ROOMS, MIN_ROOMS, OBJECTS, ROOM_FURNITURE, ROOM_KEYS } from './catalog';
import type { Rng } from './rng';
import { DIRS, key } from './types';
import type { Cell, Dir, ObjectType, Room, Scene, SceneObject, WindowEdge } from './types';

const MIN_ROOM_SIDE = 2;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Recursive binary space partition. Produces rectangular rooms only. */
function partition(rect: Rect, rng: Rng, depth: number, out: Rect[]): void {
  const canSplitX = rect.w >= MIN_ROOM_SIDE * 2;
  const canSplitY = rect.h >= MIN_ROOM_SIDE * 2;

  if (depth >= 3 || (!canSplitX && !canSplitY) || (depth >= 2 && rng.chance(0.45))) {
    out.push(rect);
    return;
  }

  const splitX = canSplitX && canSplitY ? rng.chance(0.5) : canSplitX;

  if (splitX) {
    const cut = rng.range(MIN_ROOM_SIDE, rect.w - MIN_ROOM_SIDE);
    partition({ ...rect, w: cut }, rng, depth + 1, out);
    partition({ ...rect, x: rect.x + cut, w: rect.w - cut }, rng, depth + 1, out);
  } else {
    const cut = rng.range(MIN_ROOM_SIDE, rect.h - MIN_ROOM_SIDE);
    partition({ ...rect, h: cut }, rng, depth + 1, out);
    partition({ ...rect, y: rect.y + cut, h: rect.h - cut }, rng, depth + 1, out);
  }
}

function rectCells(r: Rect): Cell[] {
  const cells: Cell[] = [];
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) cells.push({ x, y });
  }
  return cells;
}

/**
 * Try to lay an object of `size` cells inside `room`, avoiding `taken`.
 * Straight runs, or a single bend when the spec allows it.
 */
function placeObject(
  type: ObjectType,
  room: Room,
  taken: Set<string>,
  rng: Rng,
): Cell[] | null {
  const spec = OBJECTS[type];
  const size = rng.pick(spec.sizes);
  const inRoom = (c: Cell) =>
    c.x >= room.x && c.x < room.x + room.w && c.y >= room.y && c.y < room.y + room.h;
  const free = (c: Cell) => inRoom(c) && !taken.has(key(c));

  const starts = rng.shuffle(room.cells);
  const dirs: Dir[] = ['N', 'E', 'S', 'W'];

  for (const start of starts) {
    if (!free(start)) continue;
    if (size === 1) return [start];

    for (const dir of rng.shuffle(dirs)) {
      const cells: Cell[] = [start];
      let cursor = start;
      let bent = false;
      let heading = dir;
      let ok = true;

      for (let i = 1; i < size; i++) {
        // Optional single bend on the last segment of a 3-cell run.
        if (spec.canBend && !bent && i === size - 1 && size === 3 && rng.chance(0.45)) {
          const turn: Dir[] =
            heading === 'N' || heading === 'S' ? ['E', 'W'] : ['N', 'S'];
          heading = rng.pick(turn);
          bent = true;
        }
        const step = DIRS[heading];
        cursor = { x: cursor.x + step.x, y: cursor.y + step.y };
        if (!free(cursor)) {
          ok = false;
          break;
        }
        cells.push(cursor);
      }

      if (ok) return cells;
    }
  }

  return null;
}

function buildWindows(rooms: Room[], size: number, rng: Rng): WindowEdge[] {
  const roomAt = new Map<string, number>();
  for (const r of rooms) for (const c of r.cells) roomAt.set(key(c), r.id);

  const candidates: Array<{ a: Cell; b: Cell | null }> = [];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const a = { x, y };
      // Outer border segments.
      if (x === 0) candidates.push({ a, b: null });
      if (y === 0) candidates.push({ a, b: null });
      if (x === size - 1) candidates.push({ a, b: null });
      if (y === size - 1) candidates.push({ a, b: null });
      // Interior walls: only between two different rooms.
      for (const d of ['E', 'S'] as Dir[]) {
        const step = DIRS[d];
        const b = { x: x + step.x, y: y + step.y };
        if (b.x >= size || b.y >= size) continue;
        if (roomAt.get(key(a)) !== roomAt.get(key(b))) candidates.push({ a, b });
      }
    }
  }

  const count = rng.range(3, 5);
  const chosen = rng.shuffle(candidates).slice(0, count);
  return chosen.map((w, id) => ({ id, ...w }));
}

export interface SceneIndex {
  size: number;
  roomAt: Map<string, number>;
  objectAt: Map<string, SceneObject>;
  windowCells: Set<string>;
}

export function indexScene(scene: Scene): SceneIndex {
  const roomAt = new Map<string, number>();
  for (const r of scene.rooms) for (const c of r.cells) roomAt.set(key(c), r.id);

  const objectAt = new Map<string, SceneObject>();
  for (const o of scene.objects) for (const c of o.cells) objectAt.set(key(c), o);

  const windowCells = new Set<string>();
  for (const w of scene.windows) {
    windowCells.add(key(w.a));
    if (w.b) windowCells.add(key(w.b));
  }

  return { size: scene.size, roomAt, objectAt, windowCells };
}

/** A cell a character may stand on: empty floor, or an occupiable object. */
export function cellIsOccupiable(idx: SceneIndex, c: Cell): boolean {
  const obj = idx.objectAt.get(key(c));
  return !obj || OBJECTS[obj.type].occupiable;
}

/**
 * A scene is playable only if every row, every column and every room
 * contains at least one cell a character can stand on. Without this the
 * one-person-per-row rule makes the puzzle unsolvable regardless of clues.
 */
export function validateScene(scene: Scene): boolean {
  const idx = indexScene(scene);
  const n = scene.size;

  for (let i = 0; i < n; i++) {
    let row = false;
    let col = false;
    for (let j = 0; j < n; j++) {
      if (cellIsOccupiable(idx, { x: j, y: i })) row = true;
      if (cellIsOccupiable(idx, { x: i, y: j })) col = true;
    }
    if (!row || !col) return false;
  }

  for (const room of scene.rooms) {
    if (!room.cells.some((c) => cellIsOccupiable(idx, c))) return false;
  }

  if (scene.rooms.length < MIN_ROOMS || scene.rooms.length > MAX_ROOMS) return false;

  // Enough anchors for adjacency clues, and enough occupiable furniture for
  // 'was on a ...' clues. Without both, most cells yield only a room clue and
  // no unique solution exists.
  const anchors = scene.objects.filter((o) => !OBJECTS[o.type].occupiable).length;
  const seats = scene.objects.filter((o) => OBJECTS[o.type].occupiable).length;
  return anchors >= 4 && seats >= 3 && scene.windows.length >= 3;
}

export function generateScene(size: number, rng: Rng): Scene {
  const rects: Rect[] = [];
  partition({ x: 0, y: 0, w: size, h: size }, rng, 0, rects);

  const keys = rng.shuffle(ROOM_KEYS).slice(0, rects.length);
  const rooms: Room[] = rects.map((r, id) => ({
    id,
    key: keys[id] ?? 'hall',
    ...r,
    cells: rectCells(r),
  }));

  const taken = new Set<string>();
  const objects: SceneObject[] = [];
  let nextId = 0;

  for (const room of rooms) {
    const plan = ROOM_FURNITURE[room.key];
    const budget = Math.floor(room.cells.length * 0.55);
    let used = 0;

    for (const item of plan) {
      const count = rng.range(item.min, item.max);
      for (let i = 0; i < count; i++) {
        if (used >= budget) break;
        const cells = placeObject(item.type, room, taken, rng);
        if (!cells) continue;
        for (const c of cells) taken.add(key(c));
        used += cells.length;
        objects.push({ id: nextId++, type: item.type, roomId: room.id, cells });
      }
    }
  }

  return { size, rooms, objects, windows: buildWindows(rooms, size, rng) };
}
