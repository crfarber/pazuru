import type { Atom, Clue, ObjectType, RoomKey } from '../../engine/types';

/**
 * English is a renderer, not a pivot. Italian and Dutch render from the same
 * structured clue objects, with their own article and gender tables.
 */
export interface Locale {
  code: string;
  rooms: Record<RoomKey, string>;
  objects: Record<ObjectType, { name: string; article: string }>;
  names: string[];
  atom: (atom: Atom, ctx: LocaleContext) => string;
  join: (parts: string[]) => string;
  victim: string;
}

export interface LocaleContext {
  roomName: (roomId: number) => string;
}

export const en: Locale = {
  code: 'en',

  rooms: {
    bedroom: 'Bedroom',
    kids: "Kids' room",
    living: 'Living room',
    office: 'Study',
    hall: 'Hallway',
    bathroom: 'Bathroom',
  },

  objects: {
    bed: { name: 'bed', article: 'a' },
    desk: { name: 'desk', article: 'a' },
    plant: { name: 'plant', article: 'a' },
    chair: { name: 'chair', article: 'a' },
    rug: { name: 'rug', article: 'a' },
    tv: { name: 'TV', article: 'a' },
    shelf: { name: 'shelf', article: 'a' },
  },

  names: [
    'Alex', 'Bella', 'Corinna', 'Dario', 'Ella', 'Felix', 'Greta', 'Hugo',
    'Iris', 'Jonas', 'Kira', 'Luca', 'Mara', 'Nils', 'Olive', 'Pieter',
  ],

  atom(atom, ctx) {
    switch (atom.kind) {
      case 'on': {
        const o = en.objects[atom.object];
        return `was on ${o.article} ${o.name}`;
      }
      case 'adjacent': {
        const o = en.objects[atom.object];
        return `was next to ${o.article} ${o.name}`;
      }
      case 'inRoom':
        return `was in the ${ctx.roomName(atom.roomId)}`;
      case 'facingWindow':
        return 'was facing a window';
    }
  },

  join(parts) {
    return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
  },

  victim: 'The victim. Was in the last remaining square.',
};

export function renderClue(locale: Locale, clue: Clue | null, ctx: LocaleContext): string {
  if (!clue) return locale.victim;
  const sentence = locale.join(clue.atoms.map((a) => locale.atom(a, ctx)));
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
}
