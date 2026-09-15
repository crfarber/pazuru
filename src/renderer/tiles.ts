import type { Cell, Dir, ObjectType } from '../engine/types';

export const CELL = 48;

/**
 * Every tile is drawn in a 48x48 cell with the origin top-left, with no baked
 * background and no baked colour. The supplied art carried a solid fill rect
 * (#1AFF00 / #0004FF) which is stripped here: the floor belongs to the room,
 * not to the object.
 *
 * Each tile declares the direction its surface connects toward, in its
 * unrotated form. The renderer rotates from there.
 *
 * Sofa and table are drawn as one continuous run (see `runBody`), not sliced
 * into start/middle/end cells — that avoids seam mismatch at cell boundaries.
 */

const rot = (deg: number, body: string): string =>
  deg === 0 ? body : `<g transform="rotate(${deg} 24 24)">${body}</g>`;

/** Rotation needed to point a tile whose default connection is `from` toward `to`. */
const turn = (from: Dir, to: Dir): number => {
  const order: Dir[] = ['N', 'E', 'S', 'W'];
  return ((order.indexOf(to) - order.indexOf(from) + 4) % 4) * 90;
};

const INK = 'var(--ink)';
const SURFACE = 'var(--tile-surface)';

// --- supplied art, background stripped -------------------------------------

/** Head end of a bed. Connects East. */
const bedPillow = `
  <path d="M43.5 4H5.5V44.5H43.5" stroke="${INK}" fill="none"/>
  <rect x="8" y="7" width="22" height="34" fill="${SURFACE}"/>
  <rect x="33" y="7" width="15" height="34" fill="${SURFACE}"/>`;

/** Foot end of a bed. Connects West. */
const bedFeet = `
  <path d="M4.5 44L42.5 44L42.5 3.5L4.5 3.5" stroke="${INK}" fill="none"/>
  <rect x="0" y="7" width="40" height="34" fill="${SURFACE}"/>`;

/** End of a desk run. Connects West. Fill/stroke y-values match deskMiddle. */
const deskEnd = `
  <path d="M4.5 45L42.5 45L42.5 4L4.5 4" stroke="${INK}" fill="none"/>
  <rect x="0" y="7" width="40" height="34" fill="${SURFACE}"/>`;

/** Middle of a desk run. Connects West and East. */
const deskMiddle = `
  <rect x="0" y="7" width="48" height="34" fill="${SURFACE}"/>
  <path d="M43.5 4H4" stroke="${INK}" fill="none"/>
  <path d="M43.5 45H4" stroke="${INK}" fill="none"/>`;

/** Bend in a desk run. Connects North and East. */
const deskCorner = `
  <rect x="25" y="7" width="23" height="34" fill="${SURFACE}"/>
  <rect x="7" y="0" width="34" height="41" fill="${SURFACE}"/>
  <path d="M43.5 45H4" stroke="${INK}" fill="none"/>
  <path d="M4 4L4 43.5" stroke="${INK}" fill="none"/>`;

// --- placeholders, drawn in code until real tiles arrive --------------------

const PLACEHOLDER = 'var(--tile-placeholder)';

const plant = `
  <path d="M24 42V26" stroke="${INK}" stroke-width="2" fill="none"/>
  <path d="M24 28C24 18 17 12 10 12c0 10 7 16 14 16z" fill="${PLACEHOLDER}" stroke="${INK}"/>
  <path d="M24 30c0-10 7-16 14-16 0 10-7 16-14 16z" fill="${PLACEHOLDER}" stroke="${INK}"/>
  <path d="M15 34h18l-2.5 10h-13z" fill="${SURFACE}" stroke="${INK}"/>`;

const chair = `
  <rect x="12" y="10" width="24" height="6" rx="2" fill="${PLACEHOLDER}" stroke="${INK}"/>
  <rect x="11" y="20" width="26" height="18" rx="3" fill="${PLACEHOLDER}" stroke="${INK}"/>
  <path d="M14 38v4M34 38v4" stroke="${INK}" stroke-width="2"/>`;

const tv = `
  <rect x="6" y="12" width="36" height="22" rx="2" fill="${PLACEHOLDER}" stroke="${INK}"/>
  <path d="M18 40h12M24 34v6" stroke="${INK}" stroke-width="2"/>`;

/**
 * One continuous silhouette for a straight multi-cell run. Drawn in local
 * coords of the first cell; length spans `cells` along the run axis.
 */
export function runBody(
  kind: 'sofa' | 'table',
  cells: number,
  vertical: boolean,
): string {
  const inset = kind === 'sofa' ? 6 : 8;
  const len = cells * CELL;
  const x0 = inset;
  const y0 = inset;
  const w = vertical ? CELL - inset * 2 : len - inset * 2;
  const h = vertical ? len - inset * 2 : CELL - inset * 2;

  if (kind === 'sofa') {
    // Back cushion along the far long edge, seat body in front.
    const back = vertical
      ? `<rect x="${x0}" y="${y0}" width="10" height="${h}" fill="${PLACEHOLDER}" stroke="${INK}"/>`
      : `<rect x="${x0}" y="${y0}" width="${w}" height="10" fill="${PLACEHOLDER}" stroke="${INK}"/>`;
    const seat = vertical
      ? `<rect x="${x0 + 10}" y="${y0}" width="${w - 10}" height="${h}" rx="2" fill="${SURFACE}" stroke="${INK}"/>`
      : `<rect x="${x0}" y="${y0 + 10}" width="${w}" height="${h - 10}" rx="2" fill="${SURFACE}" stroke="${INK}"/>`;
    return `${back}${seat}`;
  }

  // Table: single slab with a cross line so it reads as furniture, not floor.
  return `
    <rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="2" fill="${PLACEHOLDER}" stroke="${INK}"/>
    <path d="M${x0 + 4} ${y0 + h / 2}H${x0 + w - 4}" stroke="${INK}" fill="none"/>`;
}

// --- public API -------------------------------------------------------------

export interface TileRequest {
  type: ObjectType;
  /** Position of this cell within its object's ordered cell list. */
  index: number;
  total: number;
  /** Direction toward the previous cell of the object, if any. */
  prev: Dir | null;
  /** Direction toward the next cell of the object, if any. */
  next: Dir | null;
}

/** Returns the SVG body for one cell of one object, already rotated. */
export function tileBody(req: TileRequest): string {
  const { type, index, prev, next } = req;

  switch (type) {
    case 'bed':
      return index === 0
        ? rot(turn('E', next!), bedPillow)
        : rot(turn('W', prev!), bedFeet);

    case 'desk': {
      if (prev && next) {
        const straight =
          (prev === 'N' && next === 'S') ||
          (prev === 'S' && next === 'N') ||
          (prev === 'E' && next === 'W') ||
          (prev === 'W' && next === 'E');
        if (straight) return rot(prev === 'N' || prev === 'S' ? 90 : 0, deskMiddle);

        // Bend: corner tile connects North and East by default.
        const pairs: Array<[Dir, Dir]> = [
          ['N', 'E'],
          ['E', 'S'],
          ['S', 'W'],
          ['W', 'N'],
        ];
        const have = new Set([prev, next]);
        const idx = pairs.findIndex(([a, b]) => have.has(a) && have.has(b));
        return rot(idx * 90, deskCorner);
      }
      return rot(turn('W', (next ?? prev)!), deskEnd);
    }

    case 'plant':
      return plant;
    case 'chair':
      return chair;
    case 'tv':
      return tv;

    // Sofa and table are rendered once per object via `runBody`, not per cell.
    case 'sofa':
    case 'table':
      return '';
  }
}

/** Whether this object type is drawn as one continuous run instead of per-cell. */
export const isRunObject = (t: ObjectType): t is 'sofa' | 'table' =>
  t === 'sofa' || t === 'table';

/** Axis of a straight run from its ordered cells. */
export function runVertical(cells: Cell[]): boolean {
  if (cells.length < 2) return false;
  return cells[0].x === cells[1].x;
}
