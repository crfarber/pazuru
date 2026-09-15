import { indexScene, cellIsOccupiable } from '../engine/scene';
import { key } from '../engine/types';
import type { Cell, Dir, Puzzle, RoomKey } from '../engine/types';
import { CELL, isRunObject, runBody, runVertical, tileBody } from './tiles';

/**
 * The board, as a component tree. Phase 1 rendered to an SVG string so the app
 * and the standalone preview could share one renderer; cell interaction is what
 * that arrangement was waiting for, so the string builder is gone.
 */

export const ROOM_FILL: Record<RoomKey, string> = {
  bedroom: '#D9E2EA',
  kids: '#E6DEEA',
  living: '#DCE8DE',
  office: '#EDE3D2',
  hall: '#E3E5E8',
  bathroom: '#D6E7E9',
};

/**
 * What the player has written down. Neither layer is checked against the
 * solution: the board records what you believe, not what is true.
 *
 * `notes` are pencil marks — a character may be pencilled into every cell their
 * clue allows, and a cell may hold several characters at once. `placed` is the
 * committed layer, one cell per character at most.
 */
export interface BoardState {
  notes: Record<string, number[]>;
  placed: Record<number, string>;
}

export const emptyBoard = (): BoardState => ({ notes: {}, placed: {} });

export const parseKey = (k: string): Cell => {
  const [x, y] = k.split(',').map(Number);
  return { x, y };
};

/**
 * Characters whose committed cells break the one-per-row / one-per-column rule.
 * This flags a contradiction inside the player's own notes; it says nothing
 * about whether any of them is in the right place.
 */
export function conflictingPlacements(placed: Record<number, string>): Set<number> {
  const at = Object.entries(placed).map(([id, k]) => ({ id: Number(id), ...parseKey(k) }));
  const bad = new Set<number>();
  for (const a of at) {
    for (const b of at) {
      if (a.id === b.id) continue;
      if (a.x === b.x || a.y === b.y) {
        bad.add(a.id);
        bad.add(b.id);
      }
    }
  }
  return bad;
}

const dirBetween = (from: Cell, to: Cell): Dir => {
  if (to.y < from.y) return 'N';
  if (to.y > from.y) return 'S';
  if (to.x > from.x) return 'E';
  return 'W';
};

export interface PazuruMapProps {
  puzzle: Puzzle;
  board: BoardState;
  /** The character a click applies to. Nothing is placeable without one. */
  selected: number | null;
  /** Show the solution on top of whatever the player has written. */
  reveal?: boolean;
  roomLabel?: (key: RoomKey) => string;
  initial: (characterId: number) => string;
  name: (characterId: number) => string;
  /** `definitive` is the committed layer; otherwise it is a pencil mark. */
  onCellClick?: (cell: Cell, definitive: boolean) => void;
  onCellClear?: (cell: Cell) => void;
}

export function PazuruMap({
  puzzle,
  board,
  selected,
  reveal = false,
  roomLabel,
  initial,
  name,
  onCellClick,
  onCellClear,
}: PazuruMapProps) {
  const { scene } = puzzle;
  const idx = indexScene(scene);
  const n = scene.size;
  const size = n * CELL;
  const pad = 10;

  // Pencil marks keep a fixed slot per character, the way sudoku candidates do:
  // the position in the cell identifies who it is before the letter is legible.
  // The grid is inset at the foot of the cell so the bottom row of a room never
  // collides with the room label sitting on the wall below it.
  const noteCols = Math.ceil(Math.sqrt(n));
  const noteRows = Math.ceil(n / noteCols);
  const NOTE_PAD = { top: 4, bottom: 11, side: 3 };
  const noteW = CELL - NOTE_PAD.side * 2;
  const noteH = CELL - NOTE_PAD.top - NOTE_PAD.bottom;
  const noteSize = Math.min((noteH / noteRows) * 0.72, (noteW / noteCols) * 0.8);
  const noteSlot = (id: number) => ({
    x: NOTE_PAD.side + ((id % noteCols) + 0.5) * (noteW / noteCols),
    y: NOTE_PAD.top + (Math.floor(id / noteCols) + 0.5) * (noteH / noteRows) + noteSize / 3,
  });

  const placedAt = new Map<string, number>();
  for (const [id, k] of Object.entries(board.placed)) placedAt.set(k, Number(id));
  const conflicts = conflictingPlacements(board.placed);

  const walls: string[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const here = idx.roomAt.get(key({ x, y }));
      if (x + 1 < n && here !== idx.roomAt.get(key({ x: x + 1, y })))
        walls.push(`M${(x + 1) * CELL} ${y * CELL}v${CELL}`);
      if (y + 1 < n && here !== idx.roomAt.get(key({ x, y: y + 1 })))
        walls.push(`M${x * CELL} ${(y + 1) * CELL}h${CELL}`);
    }
  }

  return (
    <svg
      viewBox={`${-pad} ${-pad} ${size + pad * 2} ${size + pad * 2}`}
      xmlns="http://www.w3.org/2000/svg"
      className="pazuru-map"
    >
      {scene.rooms.map((room) => (
        <rect
          key={`floor-${room.id}`}
          x={room.x * CELL}
          y={room.y * CELL}
          width={room.w * CELL}
          height={room.h * CELL}
          fill={ROOM_FILL[room.key]}
        />
      ))}

      {Array.from({ length: n - 1 }, (_, i) => i + 1).map((i) => (
        <g key={`grid-${i}`}>
          <path d={`M${i * CELL} 0V${size}`} className="grid" />
          <path d={`M0 ${i * CELL}H${size}`} className="grid" />
        </g>
      ))}

      {scene.objects.map((obj) => {
        // Sofa and table: one continuous silhouette from the bounding origin so
        // cell seams never break the outline.
        if (isRunObject(obj.type)) {
          const ox = Math.min(...obj.cells.map((c) => c.x));
          const oy = Math.min(...obj.cells.map((c) => c.y));
          return (
            <g
              key={`obj-${obj.id}`}
              transform={`translate(${ox * CELL} ${oy * CELL})`}
              dangerouslySetInnerHTML={{
                __html: runBody(obj.type, obj.cells.length, runVertical(obj.cells)),
              }}
            />
          );
        }

        return obj.cells.map((cell, i) => (
          <g
            key={`obj-${obj.id}-${i}`}
            transform={`translate(${cell.x * CELL} ${cell.y * CELL})`}
            dangerouslySetInnerHTML={{
              __html: tileBody({
                type: obj.type,
                index: i,
                total: obj.cells.length,
                prev: i > 0 ? dirBetween(cell, obj.cells[i - 1]) : null,
                next: i < obj.cells.length - 1 ? dirBetween(cell, obj.cells[i + 1]) : null,
              }),
            }}
          />
        ));
      })}

      {/* Walls are derived from the room partition, never authored. */}
      <path d={walls.join(' ')} className="wall" />
      <rect x={0} y={0} width={size} height={size} className="wall" fill="none" />

      {scene.windows.map((w) => {
        let x1: number;
        let y1: number;
        let horizontal: boolean;

        if (w.b) {
          horizontal = w.a.y !== w.b.y;
          x1 = horizontal ? w.a.x * CELL : Math.max(w.a.x, w.b.x) * CELL;
          y1 = horizontal ? Math.max(w.a.y, w.b.y) * CELL : w.a.y * CELL;
        } else {
          const last = n - 1;
          horizontal = w.a.y === 0 || w.a.y === last;
          x1 = horizontal ? w.a.x * CELL : (w.a.x === 0 ? 0 : n) * CELL;
          y1 = horizontal ? (w.a.y === 0 ? 0 : n) * CELL : w.a.y * CELL;
        }

        // Kozijn on the wall edge: outer frame + pane. Never a cell object.
        const inset = CELL * 0.18;
        const len = CELL - inset * 2;
        const frame = 5;
        const pane = 2;
        if (horizontal) {
          const x = x1 + inset;
          const y = y1 - frame / 2;
          return (
            <g key={`win-${w.id}`} className="window">
              <rect x={x} y={y} width={len} height={frame} />
              <rect x={x + pane} y={y + pane} width={len - pane * 2} height={frame - pane * 2} className="window-pane" />
              <path d={`M${x + len / 2} ${y + pane}V${y + frame - pane}`} />
            </g>
          );
        }
        const x = x1 - frame / 2;
        const y = y1 + inset;
        return (
          <g key={`win-${w.id}`} className="window">
            <rect x={x} y={y} width={frame} height={len} />
            <rect x={x + pane} y={y + pane} width={frame - pane * 2} height={len - pane * 2} className="window-pane" />
            <path d={`M${x + pane} ${y + len / 2}H${x + frame - pane}`} />
          </g>
        );
      })}

      {roomLabel &&
        scene.rooms.map((room) => {
          const label = roomLabel(room.key).toUpperCase();
          const cx = (room.x + room.w / 2) * CELL;
          // Straddling the wall rather than sitting inside the last row: the
          // bottom row of every room is a cell the player writes in too.
          const cy = (room.y + room.h) * CELL;
          const w = label.length * 6.2 + 14;
          return (
            <g key={`label-${room.id}`} className="room-label">
              <rect x={cx - w / 2} y={cy - 9} width={w} height={16} rx={8} />
              <text x={cx} y={cy + 2.5} textAnchor="middle">
                {label}
              </text>
            </g>
          );
        })}

      <g className={reveal ? 'player-layer dim' : 'player-layer'}>
        {Object.entries(board.notes).map(([k, ids]) => {
          const cell = parseKey(k);
          return ids.map((id) => {
            const slot = noteSlot(id);
            return (
              <text
                key={`note-${k}-${id}`}
                className={id === selected ? 'note active' : 'note'}
                x={cell.x * CELL + slot.x}
                y={cell.y * CELL + slot.y}
                textAnchor="middle"
                style={{ fontSize: noteSize }}
              >
                {initial(id)}
              </text>
            );
          });
        })}

        {Object.entries(board.placed).map(([rawId, k]) => {
          const id = Number(rawId);
          const cell = parseKey(k);
          const cx = cell.x * CELL + CELL / 2;
          const cy = cell.y * CELL + CELL / 2;
          const cls = [
            'placed',
            id === selected ? 'active' : '',
            conflicts.has(id) ? 'conflict' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <g key={`placed-${id}`} className={cls}>
              <circle cx={cx} cy={cy} r={15} />
              <text x={cx} y={cy + 5} textAnchor="middle">
                {initial(id)}
              </text>
            </g>
          );
        })}
      </g>

      {reveal &&
        puzzle.characters.map((ch) => {
          const cell = puzzle.solution[ch.id];
          const cx = cell.x * CELL + CELL / 2;
          const cy = cell.y * CELL + CELL / 2;
          const cls = ch.isVictim
            ? 'marker victim'
            : ch.id === puzzle.murdererId
              ? 'marker murderer'
              : 'marker';
          return (
            <g key={`sol-${ch.id}`} className={cls}>
              <circle cx={cx} cy={cy} r={14} />
              <text x={cx} y={cy + 5} textAnchor="middle">
                {initial(ch.id)}
              </text>
            </g>
          );
        })}

      {/* Hit targets sit last so nothing below can swallow a click. Cells no
          character may ever stand on are inert; that is a printed rule of the
          game, not a hint about this puzzle. */}
      <g className="hit-layer">
        {Array.from({ length: n * n }, (_, i) => {
          const cell = { x: i % n, y: Math.floor(i / n) };
          const k = key(cell);
          if (!cellIsOccupiable(idx, cell)) {
            return <rect key={`hit-${k}`} className="hit blocked" x={cell.x * CELL} y={cell.y * CELL} width={CELL} height={CELL} />;
          }
          const here = placedAt.get(k);
          const label =
            here !== undefined
              ? `${name(here)} at ${k}`
              : `empty square ${k}`;
          return (
            <rect
              key={`hit-${k}`}
              className="hit"
              x={cell.x * CELL}
              y={cell.y * CELL}
              width={CELL}
              height={CELL}
              role="button"
              tabIndex={0}
              aria-label={label}
              onClick={(e) => onCellClick?.(cell, e.shiftKey)}
              onContextMenu={(e) => {
                e.preventDefault();
                onCellClear?.(cell);
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                onCellClick?.(cell, e.shiftKey);
              }}
            />
          );
        })}
      </g>
    </svg>
  );
}
