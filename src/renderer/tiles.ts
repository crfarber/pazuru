import type { Dir, ObjectType } from '../engine/types';

export const CELL = 48;

/**
 * Every tile is drawn in a 48x48 cell with the origin top-left, with no baked
 * background and no baked colour. The supplied art carried a solid fill rect
 * (#1AFF00 / #0004FF) which is stripped here: the floor belongs to the room,
 * not to the object.
 *
 * Each tile declares the direction its surface connects toward, in its
 * unrotated form. The renderer rotates from there.
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

/** End of a desk run. Connects West. */
const deskEnd = `
  <path d="M4.5 44.5L42.5 44.5L42.5 4L4.5 4" stroke="${INK}" fill="none"/>
  <rect x="0" y="7.5" width="40" height="34" fill="${SURFACE}"/>`;

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

type Edge = 'single' | 'start' | 'middle' | 'end';

/**
 * A run of cells has to read as one object, so only the extremities draw an end
 * cap. Drawing a closed outline per cell would slice a rug into loose tiles.
 */
const runTile = (edge: Edge, vertical: boolean, inset: number, extra = ''): string => {
  const x0 = edge === 'start' || edge === 'single' ? 4 : 0;
  const x1 = edge === 'end' || edge === 'single' ? 44 : 48;
  const y0 = inset;
  const y1 = 48 - inset;

  const caps: string[] = [];
  if (edge === 'start' || edge === 'single') caps.push(`M${x0} ${y0}V${y1}`);
  if (edge === 'end' || edge === 'single') caps.push(`M${x1} ${y0}V${y1}`);

  const body = `
    <rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="${PLACEHOLDER}"/>
    <path d="M${x0} ${y0}H${x1} M${x0} ${y1}H${x1} ${caps.join(' ')}" stroke="${INK}" fill="none"/>
    ${extra.replace(/\{x0\}/g, String(x0)).replace(/\{x1\}/g, String(x1))}`;

  return vertical ? rot(90, body) : body;
};

const shelfTile = (edge: Edge, vertical: boolean): string =>
  runTile(edge, vertical, 10, `<path d="M{x0} 24H{x1}" stroke="${INK}" fill="none"/>`);

const rugTile = (edge: Edge, vertical: boolean): string =>
  runTile(edge, vertical, 6, `<path d="M{x0} 11H{x1} M{x0} 37H{x1}" stroke="${INK}" stroke-dasharray="4 4" fill="none"/>`);

const edgeOf = (index: number, total: number): Edge =>
  total === 1 ? 'single' : index === 0 ? 'start' : index === total - 1 ? 'end' : 'middle';

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
  const { type, index, total, prev, next } = req;
  const vertical = (next ?? prev) === 'N' || (next ?? prev) === 'S';

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
    case 'shelf':
      return shelfTile(edgeOf(index, total), vertical);
    case 'rug':
      return rugTile(edgeOf(index, total), vertical);
  }
}
