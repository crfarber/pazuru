import { generatePuzzle } from '../src/engine/generate';
import { renderMap } from '../src/renderer/renderMap';
import { en, renderClue } from '../src/content/locales/en';
import type { Puzzle } from '../src/engine/types';

let current: Puzzle | null = null;
let revealed = false;

const $ = (id: string) => document.getElementById(id)!;

const roomName = (roomId: number) =>
  en.rooms[current!.scene.rooms.find((r) => r.id === roomId)!.key];

function draw() {
  if (!current) return;
  const puzzle = current;

  $('map').innerHTML = renderMap(puzzle, {
    reveal: revealed,
    roomLabel: (k) => en.rooms[k],
    initial: (id) => en.names[puzzle.characters[id].nameIndex].charAt(0),
  });

  $('seed-out').textContent = String(puzzle.seed);
  $('band').textContent = puzzle.difficulty.band;
  $('band').className = `band band-${puzzle.difficulty.band}`;
  $('tier').textContent = `tier ${puzzle.difficulty.highestTier} · ${puzzle.difficulty.steps} deductions`;

  $('suspects').innerHTML = puzzle.characters
    .map((ch) => {
      const name = en.names[ch.nameIndex];
      const role = ch.isVictim
        ? 'victim'
        : revealed && ch.id === puzzle.murdererId
          ? 'murderer'
          : 'suspect';
      const pos = revealed
        ? `<span class="coord">${puzzle.solution[ch.id].x},${puzzle.solution[ch.id].y}</span>`
        : '';
      return `<li class="card ${role}">
        <div class="card-head"><span class="avatar">${name.charAt(0)}</span>
          <span class="name">${name}</span>${pos}</div>
        <p class="clue">${renderClue(en, ch.clue, { roomName })}</p>
        ${role === 'murderer' ? '<span class="stamp">Murderer</span>' : ''}
      </li>`;
    })
    .join('');

  $('reveal').textContent = revealed ? 'Hide the answer' : 'Reveal the answer';
}

function newCase(seed?: number) {
  const size = Number((<HTMLSelectElement>$('size')).value);
  const t0 = performance.now();
  current = generatePuzzle({ size, seed });
  revealed = false;
  $('timing').textContent = `${(performance.now() - t0).toFixed(0)} ms`;
  draw();
}

$('new').addEventListener('click', () => newCase());
$('reveal').addEventListener('click', () => {
  revealed = !revealed;
  draw();
});
$('size').addEventListener('change', () => newCase());
$('replay').addEventListener('click', () => {
  const raw = (<HTMLInputElement>$('seed-in')).value.trim();
  if (raw) newCase(Number(raw));
});

newCase(42);
