import * as fs from 'fs';
import * as path from 'path';
import { generatePuzzle } from '../src/engine/generate';
import { renderMap } from '../src/renderer/renderMap';
import { en, renderClue } from '../src/content/locales/en';
import type { DifficultyBand, Puzzle } from '../src/engine/types';

/**
 * Generation is rejection sampling, so cost per puzzle varies. Producing a
 * stock ahead of publication keeps that variance off the critical path, and
 * lets a week be curated rather than accepted as it comes out.
 *
 * usage: npm run generate -- --weeks 8 --start 2026-09-07 --out content/puzzles
 */

const arg = (name: string, fallback: string): string => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};

const WEEKS = Number(arg('weeks', '4'));
const SIZE = Number(arg('size', '8'));
const OUT = arg('out', 'content/puzzles');
const START = new Date(arg('start', new Date().toISOString().slice(0, 10)));

/** A rising curve across the week, so Monday is gentler than Sunday. */
const DAILY_CURVE: DifficultyBand[] = [
  'easy', 'easy', 'medium', 'medium', 'medium', 'hard', 'hard',
];

/** A deliberate spread for the ten puzzles that sit alongside the daily one. */
const WEEKLY_SPREAD: DifficultyBand[] = [
  'easy', 'easy', 'easy', 'medium', 'medium', 'medium', 'medium', 'hard', 'hard', 'hard',
];

interface Published {
  id: string;
  publishDate: string;
  slot: 'daily' | 'weekly_set';
  size: number;
  seed: number;
  difficulty: Puzzle['difficulty'];
  scene: Puzzle['scene'];
  characters: Puzzle['characters'];
  solution: Puzzle['solution'];
  victimId: number;
  murdererId: number;
  /** Rendered once, at publication, so a later translation edit cannot break a live puzzle. */
  rendered: Record<string, { names: string[]; clues: string[]; rooms: Record<number, string> }>;
  svg: string;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

function publish(puzzle: Puzzle, date: Date, slot: Published['slot'], n: number): Published {
  const roomName = (roomId: number) =>
    en.rooms[puzzle.scene.rooms.find((r) => r.id === roomId)!.key];

  const rooms: Record<number, string> = {};
  for (const r of puzzle.scene.rooms) rooms[r.id] = en.rooms[r.key];

  return {
    id: `${iso(date)}-${slot}-${n}`,
    publishDate: iso(date),
    slot,
    size: puzzle.scene.size,
    seed: puzzle.seed,
    difficulty: puzzle.difficulty,
    scene: puzzle.scene,
    characters: puzzle.characters,
    solution: puzzle.solution,
    victimId: puzzle.victimId,
    murdererId: puzzle.murdererId,
    rendered: {
      en: {
        names: puzzle.characters.map((c) => en.names[c.nameIndex]),
        clues: puzzle.characters.map((c) => renderClue(en, c.clue, { roomName })),
        rooms,
      },
    },
    svg: renderMap(puzzle, { roomLabel: (k) => en.rooms[k] }),
  };
}

fs.mkdirSync(OUT, { recursive: true });

const all: Published[] = [];
const t0 = Date.now();

for (let w = 0; w < WEEKS; w++) {
  const weekStart = new Date(START);
  weekStart.setDate(weekStart.getDate() + w * 7);

  DAILY_CURVE.forEach((band, d) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + d);
    all.push(publish(generatePuzzle({ size: SIZE, band }), date, 'daily', d));
  });

  WEEKLY_SPREAD.forEach((band, i) => {
    all.push(publish(generatePuzzle({ size: SIZE, band }), weekStart, 'weekly_set', i));
  });
}

for (const p of all) {
  fs.writeFileSync(path.join(OUT, `${p.id}.json`), JSON.stringify(p, null, 2));
}
fs.writeFileSync(
  path.join(OUT, 'index.json'),
  JSON.stringify(
    all.map(({ id, publishDate, slot, size, seed, difficulty }) => ({
      id, publishDate, slot, size, seed, band: difficulty.band,
    })),
    null,
    2,
  ),
);

console.log(`wrote ${all.length} puzzles to ${OUT} in ${Date.now() - t0}ms`);
