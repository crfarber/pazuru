import type { ObjectType, RoomKey } from './types';

export interface ObjectSpec {
  /** Whether a character may stand on this object's cells. */
  occupiable: boolean;
  /** Allowed cell counts. */
  sizes: number[];
  /** Straight runs only, or may bend into an L. */
  canBend: boolean;
  /** False when the tile art is still a placeholder drawn in code. */
  hasArt: boolean;
}

/**
 * The rules define eight object types. Three have finished tiles; the rest use
 * placeholder vectors so the clue space is complete. Swapping a placeholder for
 * real art is one tile file and one renderer case.
 */
export const OBJECTS: Record<ObjectType, ObjectSpec> = {
  bed: { occupiable: true, sizes: [2], canBend: false, hasArt: true },
  desk: { occupiable: false, sizes: [2, 3], canBend: true, hasArt: true },
  plant: { occupiable: false, sizes: [1], canBend: false, hasArt: true },
  chair: { occupiable: true, sizes: [1], canBend: false, hasArt: false },
  rug: { occupiable: true, sizes: [2, 3], canBend: false, hasArt: false },
  tv: { occupiable: false, sizes: [1], canBend: false, hasArt: false },
  shelf: { occupiable: false, sizes: [2, 3], canBend: false, hasArt: false },
};

export const OBJECT_TYPES = Object.keys(OBJECTS) as ObjectType[];

export const isOccupiable = (t: ObjectType): boolean => OBJECTS[t].occupiable;

export interface FurniturePlan {
  type: ObjectType;
  min: number;
  max: number;
}

/** What furniture each kind of room tends to contain. */
export const ROOM_FURNITURE: Record<RoomKey, FurniturePlan[]> = {
  bedroom: [
    { type: 'bed', min: 1, max: 1 },
    { type: 'rug', min: 0, max: 1 },
    { type: 'plant', min: 0, max: 1 },
    { type: 'shelf', min: 0, max: 1 },
  ],
  kids: [
    { type: 'bed', min: 1, max: 1 },
    { type: 'desk', min: 0, max: 1 },
    { type: 'chair', min: 0, max: 1 },
    { type: 'plant', min: 0, max: 1 },
  ],
  living: [
    { type: 'rug', min: 1, max: 1 },
    { type: 'tv', min: 1, max: 1 },
    { type: 'chair', min: 1, max: 2 },
    { type: 'plant', min: 1, max: 2 },
  ],
  office: [
    { type: 'desk', min: 1, max: 2 },
    { type: 'chair', min: 1, max: 2 },
    { type: 'shelf', min: 0, max: 1 },
    { type: 'plant', min: 0, max: 1 },
  ],
  hall: [
    { type: 'plant', min: 0, max: 1 },
    { type: 'chair', min: 0, max: 1 },
    { type: 'shelf', min: 0, max: 1 },
  ],
  bathroom: [
    { type: 'plant', min: 0, max: 1 },
    { type: 'shelf', min: 0, max: 1 },
    { type: 'rug', min: 0, max: 1 },
  ],
};

export const ROOM_KEYS: RoomKey[] = ['bedroom', 'living', 'office', 'kids', 'hall', 'bathroom'];

/** A scene with more or fewer rooms than this is rejected. */
export const MIN_ROOMS = 4;
export const MAX_ROOMS = ROOM_KEYS.length;
