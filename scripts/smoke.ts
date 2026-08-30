import { generatePuzzle } from '../src/engine/generate';
import { solve } from '../src/engine/solver';
import { indexScene } from '../src/engine/scene';
import { key } from '../src/engine/types';
import { en, renderClue } from '../src/content/locales/en';

const COUNT = Number(process.argv[2] ?? 200);
const SIZE = Number(process.argv[3] ?? 8);

const bands: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
const tiers: Record<number, number> = {};
let clueAtoms = 0;
let clueCount = 0;
let failures = 0;

const t0 = Date.now();

for (let i = 0; i < COUNT; i++) {
  const puzzle = generatePuzzle({ size: SIZE, seed: 1000 + i * 7919 });
  const idx = indexScene(puzzle.scene);

  // Uniqueness must hold with no knowledge of the murderer rule.
  const solutions = solve({ scene: puzzle.scene, characters: puzzle.characters, idx }, 2);
  if (solutions.length !== 1) failures++;

  // The stored solution must be the one the solver finds.
  const found = solutions[0];
  if (found && found.some((c, j) => key(c) !== key(puzzle.solution[j]))) failures++;

  // Latin square check.
  const rows = new Set(puzzle.solution.map((c) => c.y));
  const cols = new Set(puzzle.solution.map((c) => c.x));
  if (rows.size !== SIZE || cols.size !== SIZE) failures++;

  // Exactly one suspect shares the victim's room.
  const victimRoom = idx.roomAt.get(key(puzzle.solution[puzzle.victimId]));
  const together = puzzle.solution.filter(
    (c, j) => j !== puzzle.victimId && idx.roomAt.get(key(c)) === victimRoom,
  );
  if (together.length !== 1) failures++;

  bands[puzzle.difficulty.band]++;
  tiers[puzzle.difficulty.highestTier] = (tiers[puzzle.difficulty.highestTier] ?? 0) + 1;
  for (const ch of puzzle.characters) {
    if (!ch.clue) continue;
    clueAtoms += ch.clue.atoms.length;
    clueCount++;
  }
}

const ms = Date.now() - t0;

console.log(`generated ${COUNT} puzzles at ${SIZE}x${SIZE} in ${ms}ms (${(ms / COUNT).toFixed(1)}ms each)`);
console.log(`invariant failures: ${failures}`);
console.log('difficulty bands:', bands);
console.log('highest tier required:', tiers);
console.log(`average atoms per clue: ${(clueAtoms / clueCount).toFixed(2)}`);

// Print one puzzle in full.
const sample = generatePuzzle({ size: SIZE, seed: 42 });
const sidx = indexScene(sample.scene);
const roomName = (id: number) => en.rooms[sample.scene.rooms.find((r) => r.id === id)!.key];

console.log(`\n--- sample seed 42 (${sample.difficulty.band}, tier ${sample.difficulty.highestTier}) ---`);
console.log('rooms:', sample.scene.rooms.map((r) => `${en.rooms[r.key]} ${r.w}x${r.h}@${r.x},${r.y}`).join(' | '));
console.log('objects:', sample.scene.objects.map((o) => `${o.type}[${o.cells.map((c) => key(c)).join(' ')}]`).join(' '));
console.log('windows:', sample.scene.windows.map((w) => `${key(w.a)}${w.b ? `/${key(w.b)}` : ' (border)'}`).join(' '));
for (const ch of sample.characters) {
  const pos = sample.solution[ch.id];
  const mark = ch.id === sample.murdererId ? '  <- murderer' : '';
  console.log(
    `  ${en.names[ch.nameIndex].padEnd(9)} @${key(pos)} ${roomName(sidx.roomAt.get(key(pos))!).padEnd(12)} ${renderClue(en, ch.clue, { roomName })}${mark}`,
  );
}
