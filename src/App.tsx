import { useCallback, useMemo, useState } from 'react';
import { generatePuzzle } from './engine/generate';
import { renderMap } from './renderer/renderMap';
import { en, renderClue } from './content/locales/en';
import type { Puzzle } from './engine/types';

export default function App() {
  const [size, setSize] = useState(8);
  const [seedInput, setSeedInput] = useState('');
  const [puzzle, setPuzzle] = useState<Puzzle>(() => generatePuzzle({ size: 8, seed: 42 }));
  const [revealed, setRevealed] = useState(false);

  const newCase = useCallback(
    (seed?: number) => {
      setPuzzle(generatePuzzle({ size, seed }));
      setRevealed(false);
    },
    [size],
  );

  const roomName = useCallback(
    (roomId: number) => en.rooms[puzzle.scene.rooms.find((r) => r.id === roomId)!.key],
    [puzzle],
  );

  const svg = useMemo(
    () =>
      renderMap(puzzle, {
        reveal: revealed,
        roomLabel: (k) => en.rooms[k],
        initial: (id) => en.names[puzzle.characters[id].nameIndex].charAt(0),
      }),
    [puzzle, revealed],
  );

  return (
    <div className="wrap">
      <header>
        <h1>Murdoku</h1>
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
            setPuzzle(generatePuzzle({ size: next }));
            setRevealed(false);
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
        {/* Phase 1 renders to markup so the app and the standalone preview
            share one renderer. This becomes a component tree when cell
            interaction lands. */}
        <div id="map" dangerouslySetInnerHTML={{ __html: svg }} />

        <div>
          <ul>
            {puzzle.characters.map((ch) => {
              const name = en.names[ch.nameIndex];
              const role = ch.isVictim
                ? 'victim'
                : revealed && ch.id === puzzle.murdererId
                  ? 'murderer'
                  : 'suspect';
              return (
                <li key={ch.id} className={`card ${role}`}>
                  <div className="card-head">
                    <span className="avatar">{name.charAt(0)}</span>
                    <span className="name">{name}</span>
                    {revealed && (
                      <span className="coord">
                        {puzzle.solution[ch.id].x},{puzzle.solution[ch.id].y}
                      </span>
                    )}
                  </div>
                  <p className="clue">{renderClue(en, ch.clue, { roomName })}</p>
                  {role === 'murderer' && <span className="stamp">Murderer</span>}
                </li>
              );
            })}
          </ul>
          <p className="note">
            Solid black furniture uses the supplied tiles. Outlined furniture is a coded
            placeholder awaiting art. Walls are derived from the room partition.
          </p>
        </div>
      </div>
    </div>
  );
}
