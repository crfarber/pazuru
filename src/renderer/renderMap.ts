import { indexScene } from '../engine/scene';
import { key } from '../engine/types';
import type { Cell, Dir, Puzzle, RoomKey } from '../engine/types';
import { CELL, tileBody } from './tiles';

/**
 * Returns an SVG string. Phase 1 deliberately renders to markup rather than a
 * React component tree: the app and the standalone preview then share one
 * renderer and cannot drift. When cell interaction lands, this becomes a
 * component tree and the string builder goes away.
 */

export const ROOM_FILL: Record<RoomKey, string> = {
  bedroom: '#D9E2EA',
  kids: '#E6DEEA',
  living: '#DCE8DE',
  office: '#EDE3D2',
  hall: '#E3E5E8',
  bathroom: '#D6E7E9',
};

export interface RenderOptions {
  /** Show where everyone stood. */
  reveal?: boolean;
  /** Room name lookup, supplied by the active locale. */
  roomLabel?: (key: RoomKey) => string;
  /** Initial shown inside each marker. */
  initial?: (characterId: number) => string;
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const dirBetween = (from: Cell, to: Cell): Dir => {
  if (to.y < from.y) return 'N';
  if (to.y > from.y) return 'S';
  if (to.x > from.x) return 'E';
  return 'W';
};

export function renderMap(puzzle: Puzzle, options: RenderOptions = {}): string {
  const { scene } = puzzle;
  const idx = indexScene(scene);
  const size = scene.size * CELL;
  const pad = 10;
  const parts: string[] = [];

  // Room floors.
  for (const room of scene.rooms) {
    parts.push(
      `<rect x="${room.x * CELL}" y="${room.y * CELL}" width="${room.w * CELL}" height="${room.h * CELL}" fill="${ROOM_FILL[room.key]}"/>`,
    );
  }

  // Cell grid, drawn thin.
  for (let i = 1; i < scene.size; i++) {
    parts.push(
      `<path d="M${i * CELL} 0V${size}" class="grid"/>`,
      `<path d="M0 ${i * CELL}H${size}" class="grid"/>`,
    );
  }

  // Furniture.
  for (const obj of scene.objects) {
    obj.cells.forEach((cell, i) => {
      const prev = i > 0 ? dirBetween(cell, obj.cells[i - 1]) : null;
      const next = i < obj.cells.length - 1 ? dirBetween(cell, obj.cells[i + 1]) : null;
      parts.push(
        `<g transform="translate(${cell.x * CELL} ${cell.y * CELL})">${tileBody({
          type: obj.type,
          index: i,
          total: obj.cells.length,
          prev,
          next,
        })}</g>`,
      );
    });
  }

  // Walls: a wall exists wherever two neighbouring cells belong to different
  // rooms. They are derived, never authored.
  const wall: string[] = [];
  for (let y = 0; y < scene.size; y++) {
    for (let x = 0; x < scene.size; x++) {
      const here = idx.roomAt.get(key({ x, y }));
      const right = idx.roomAt.get(key({ x: x + 1, y }));
      const below = idx.roomAt.get(key({ x, y: y + 1 }));
      if (x + 1 < scene.size && here !== right)
        wall.push(`M${(x + 1) * CELL} ${y * CELL}v${CELL}`);
      if (y + 1 < scene.size && here !== below)
        wall.push(`M${x * CELL} ${(y + 1) * CELL}h${CELL}`);
    }
  }
  parts.push(`<path d="${wall.join(' ')}" class="wall"/>`);
  parts.push(`<rect x="0" y="0" width="${size}" height="${size}" class="wall" fill="none"/>`);

  // Windows sit on wall segments, not in cells.
  for (const w of scene.windows) {
    let x1: number;
    let y1: number;
    let horizontal: boolean;

    if (w.b) {
      horizontal = w.a.y !== w.b.y;
      const cx = Math.max(w.a.x, w.b.x);
      const cy = Math.max(w.a.y, w.b.y);
      x1 = horizontal ? w.a.x * CELL : cx * CELL;
      y1 = horizontal ? cy * CELL : w.a.y * CELL;
    } else {
      // Border window: pick the outer edge this cell touches.
      const last = scene.size - 1;
      horizontal = w.a.y === 0 || w.a.y === last;
      x1 = horizontal ? w.a.x * CELL : (w.a.x === 0 ? 0 : scene.size) * CELL;
      y1 = horizontal ? (w.a.y === 0 ? 0 : scene.size) * CELL : w.a.y * CELL;
    }

    const inset = CELL * 0.18;
    const len = CELL - inset * 2;
    parts.push(
      horizontal
        ? `<rect x="${x1 + inset}" y="${y1 - 3}" width="${len}" height="6" class="window"/>`
        : `<rect x="${x1 - 3}" y="${y1 + inset}" width="6" height="${len}" class="window"/>`,
    );
  }

  // Room labels.
  if (options.roomLabel) {
    for (const room of scene.rooms) {
      const label = esc(options.roomLabel(room.key).toUpperCase());
      const cx = (room.x + room.w / 2) * CELL;
      const cy = (room.y + room.h) * CELL - 11;
      const w = label.length * 6.2 + 14;
      parts.push(
        `<g class="room-label"><rect x="${cx - w / 2}" y="${cy - 9}" width="${w}" height="16" rx="8"/>` +
          `<text x="${cx}" y="${cy + 2.5}" text-anchor="middle">${label}</text></g>`,
      );
    }
  }

  // Character markers.
  if (options.reveal) {
    puzzle.characters.forEach((ch) => {
      const cell = puzzle.solution[ch.id];
      const cx = cell.x * CELL + CELL / 2;
      const cy = cell.y * CELL + CELL / 2;
      const cls = ch.isVictim ? 'marker victim' : ch.id === puzzle.murdererId ? 'marker murderer' : 'marker';
      parts.push(
        `<g class="${cls}"><circle cx="${cx}" cy="${cy}" r="14"/>` +
          `<text x="${cx}" y="${cy + 5}" text-anchor="middle">${esc(options.initial?.(ch.id) ?? '')}</text></g>`,
      );
    });
  }

  return (
    `<svg viewBox="${-pad} ${-pad} ${size + pad * 2} ${size + pad * 2}" xmlns="http://www.w3.org/2000/svg" class="murdoku-map">` +
    parts.join('') +
    `</svg>`
  );
}
