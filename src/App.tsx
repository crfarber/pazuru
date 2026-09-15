import { useCallback, useEffect, useState } from 'react';
import { generatePuzzle } from './engine/generate';
import { PazuruMap, emptyBoard, conflictingPlacements } from './renderer/PazuruMap';
import type { BoardState } from './renderer/PazuruMap';
import { en, renderClue } from './content/locales/en';
import { key } from './engine/types';
import type { Cell, Puzzle } from './engine/types';

type Mode = 'note' | 'place';

export default function App() {
  const [size, setSize] = useState(8);
  const [seedInput, setSeedInput] = useState('');
  const [puzzle, setPuzzle] = useState<Puzzle>(() => generatePuzzle({ size: 8, seed: 42 }));
  const [revealed, setRevealed] = useState(false);
  const [board, setBoard] = useState<BoardState>(emptyBoard);
  const [selected, setSelected] = useState<number | null>(0);
  const [mode, setMode] = useState<Mode>('note');

  const load = useCallback((next: Puzzle) => {
    setPuzzle(next);
    setBoard(emptyBoard());
    setSelected(0);
    setRevealed(false);
  }, []);

  const newCase = useCallback(
    (seed?: number) => load(generatePuzzle({ size, seed })),
    [load, size],
  );

  const roomName = useCallback(
    (roomId: number) => en.rooms[puzzle.scene.rooms.find((r) => r.id === roomId)!.key],
    [puzzle],
  );

  const nameOf = useCallback(
    (id: number) => en.names[puzzle.characters[id].nameIndex],
    [puzzle],
  );

  /**
   * A pencil mark is a thought, not a move: several characters may share a
   * cell and one character may be pencilled into every cell their clue allows.
   */
  const toggleNote = useCallback((cell: Cell, id: number) => {
    setBoard((prev) => {
      const k = key(cell);
      const here = prev.notes[k] ?? [];
      const next = here.includes(id) ? here.filter((n) => n !== id) : [...here, id].sort((a, b) => a - b);
      const notes = { ...prev.notes };
      if (next.length) notes[k] = next;
      else delete notes[k];
      return { ...prev, notes };
    });
  }, []);

  /**
   * Committing is still not a claim of correctness. It only means one cell per
   * character, so a second commit moves them and displaces whoever was there.
   */
  const commit = useCallback((cell: Cell, id: number) => {
    setBoard((prev) => {
      const k = key(cell);
      const placed = { ...prev.placed };

      if (placed[id] === k) {
        delete placed[id];
        return { ...prev, placed };
      }

      for (const [other, at] of Object.entries(placed)) {
        if (at === k) delete placed[Number(other)];
      }
      placed[id] = k;

      // The character's own pencil marks have served their purpose.
      const notes: BoardState['notes'] = {};
      for (const [cellKey, ids] of Object.entries(prev.notes)) {
        const kept = ids.filter((n) => n !== id);
        if (kept.length) notes[cellKey] = kept;
      }
      return { notes, placed };
    });
  }, []);

  const clearCell = useCallback((cell: Cell) => {
    setBoard((prev) => {
      const k = key(cell);
      const notes = { ...prev.notes };
      delete notes[k];
      const placed = { ...prev.placed };
      for (const [id, at] of Object.entries(placed)) {
        if (at === k) delete placed[Number(id)];
      }
      return { notes, placed };
    });
  }, []);

  const handleCell = useCallback(
    (cell: Cell, definitive: boolean) => {
      if (selected === null) return;
      if (definitive || mode === 'place') commit(cell, selected);
      else toggleNote(cell, selected);
    },
    [commit, mode, selected, toggleNote],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT')) return;

      if (e.key >= '1' && e.key <= '9') {
        const i = Number(e.key) - 1;
        if (i < puzzle.characters.length) setSelected(i);
      } else if (e.key === 'n') setMode('note');
      else if (e.key === 'p') setMode('place');
      else if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [puzzle]);

  const conflicts = conflictingPlacements(board.placed);
  const placedCount = Object.keys(board.placed).length;

  return (
    <div className="wrap">
      <header>
        <h1>Pazuru</h1>
        <p className="tagline">Generator preview · phase 1</p>
      </header>

      <div className="controls">
        <button className="primary" onClick={() => newCase()}>
          New case
        </button>
        <button onClick={() => setRevealed((r) => !r)}>
          {revealed ? 'Hide the answer' : 'Reveal the answer'}
        </button>
        <select
          aria-label="Grid size"
          value={size}
          onChange={(e) => {
            const next = Number(e.target.value);
            setSize(next);
            load(generatePuzzle({ size: next }));
          }}
        >
          <option value={6}>6 × 6</option>
          <option value={8}>8 × 8</option>
          <option value={10}>10 × 10</option>
        </select>
        <input
          aria-label="Seed"
          placeholder="seed"
          value={seedInput}
          onChange={(e) => setSeedInput(e.target.value)}
        />
        <button onClick={() => seedInput.trim() && newCase(Number(seedInput))}>Replay seed</button>
        <span className="meta">
          <span>
            tier {puzzle.difficulty.highestTier} · {puzzle.difficulty.steps} deductions
          </span>
          <span className={`band band-${puzzle.difficulty.band}`}>{puzzle.difficulty.band}</span>
          <span>
            seed <b>{puzzle.seed}</b>
          </span>
        </span>
      </div>

      <div className="layout">
        <div>
          <div className="board-bar">
            <div className="modes" role="group" aria-label="Placement mode">
              <button
                className={mode === 'note' ? 'mode on' : 'mode'}
                onClick={() => setMode('note')}
                aria-pressed={mode === 'note'}
              >
                Pencil <kbd>N</kbd>
              </button>
              <button
                className={mode === 'place' ? 'mode on' : 'mode'}
                onClick={() => setMode('place')}
                aria-pressed={mode === 'place'}
              >
                Place <kbd>P</kbd>
              </button>
            </div>
            <span className="hint">
              {selected === null
                ? 'Pick someone from the list, then click a square.'
                : `${nameOf(selected)} · shift-click to place · right-click clears a square`}
            </span>
            <button onClick={() => setBoard(emptyBoard())} disabled={!placedCount && !Object.keys(board.notes).length}>
              Clear board
            </button>
          </div>

          <div id="map">
            <PazuruMap
              puzzle={puzzle}
              board={board}
              selected={selected}
              reveal={revealed}
              roomLabel={(k) => en.rooms[k]}
              initial={(id) => nameOf(id).charAt(0)}
              name={nameOf}
              onCellClick={handleCell}
              onCellClear={clearCell}
            />
          </div>
        </div>

        <div>
          <ul>
            {puzzle.characters.map((ch, i) => {
              const name = nameOf(ch.id);
              const role = ch.isVictim
                ? 'victim'
                : revealed && ch.id === puzzle.murdererId
                  ? 'murderer'
                  : 'suspect';
              const at = board.placed[ch.id];
              const cls = [
                'card',
                role,
                selected === ch.id ? 'selected' : '',
                conflicts.has(ch.id) ? 'conflict' : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <li key={ch.id}>
                  <button
                    className={cls}
                    onClick={() => setSelected(ch.id)}
                    aria-pressed={selected === ch.id}
                    aria-label={`${name}${at ? `, placed at ${at}` : ''}`}
                  >
                    <div className="card-head">
                      <span className="avatar">{name.charAt(0)}</span>
                      <span className="name">{name}</span>
                      <kbd className="slot">{i + 1}</kbd>
                      {at && <span className="coord">{at}</span>}
                      {revealed && !at && (
                        <span className="coord">
                          {puzzle.solution[ch.id].x},{puzzle.solution[ch.id].y}
                        </span>
                      )}
                    </div>
                    <p className="clue">{renderClue(en, ch.clue, { roomName })}</p>
                    {role === 'murderer' && <span className="stamp">Murderer</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="note">
            Nothing on the board is checked against the solution. A red ring only means two
            of your own placements share a row or a column.
          </p>
        </div>
      </div>
    </div>
  );
}
