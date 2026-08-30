# Murdoku — Complete Rules Specification

Source: scanned pages 4–7 (tutorial + object list + solving tips) and cases 1–2 of the Italian edition. Italian keywords are kept in parentheses because clue text must be generated in the game's language.

---

## 1. Premise

A murder was committed last night. The player is the detective. There is a list of characters: several **suspects** (*sospettati*) and one **victim** (*vittima*).

**Objective:** identify the murderer by determining who was in the **same room as the victim**. The murderer is the person who was **alone** with the victim.

The mechanism for finding out is a logic-grid deduction puzzle: place every character on the crime scene map using their clues, then read off who ended up with the victim.

---

## 2. Board anatomy

### 2.1 Map (*scena del crimine*)

- The map is a square grid of N × N cells. Width always equals height.
- The tutorial case uses 4×4. The published cases use 6×6.
- **Production target: 8×8** (7 suspects + 1 victim). 10×10 is a possible future ceiling; see §11.4 for why grid size is a poor difficulty lever.
- **Invariant observed in every case: N equals the total number of characters (suspects + victim).** In case 1 there are 5 suspects + 1 victim on a 6×6 grid; case 2 is identical. This is what makes the row/column rule solvable (see §4.1) and it is the single most important constraint for a generator.

### 2.2 Rooms (*stanze*)

- The grid is partitioned into rooms. Every cell belongs to exactly one room.
- Rooms are drawn with **thick borders**. Thin lines are ordinary cell divisions.
- The tutorial uses 2 rooms; real cases use 4–5 (e.g. `INGRESSO`, `SALOTTO`, `SOGGIORNO`, `CAMERA`, `BAGNO`, `CAMERETTA`).
- Rooms are named, and room names are used directly in clues.

### 2.3 Cells (*caselle*)

A cell is either:
- **Empty floor** — a person may stand there.
- **Covered by an object** — occupiable or not, depending on the object type.

### 2.4 Objects (*oggetti*)

Objects sit on the grid and may span one or more cells:
- **Single cell:** chair, plant.
- **Multi-cell:** bed, table, rug, shelf, box, TV unit (footprint varies).

An object never spans two rooms.

---

## 3. Object catalogue

### 3.1 Can be occupied (*possono essere occupati*)

| Object | Italian | Notes |
|---|---|---|
| Chair | *sedia* | 1 cell |
| Rug | *tappeto* | multi-cell |
| Bed | *letto* | multi-cell |

A person standing on one of these is described as being *on* it: "Era sul letto", "Era seduto sulla sedia", "Era sul tappeto".

### 3.2 Cannot be occupied (*non possono essere occupati*)

| Object | Italian |
|---|---|
| Table | *tavolo* |
| TV | *TV* |
| Plant | *pianta* |
| Shelf | *scaffale* |
| Box | *scatola* |

These cells are permanently blocked for all characters, including the victim. They exist purely as reference points for adjacency clues.

### 3.3 Window (*finestra*) — special case

A window is not a cell object. Quoting the rules directly:

> A window is a special type of object that appears only on the thicker grid lines. A window can be located on the edge of the grid, or between two cells, in which case it is adjacent to both.

Implications:
- A window lives on an **edge**, not in a cell.
- Windows only appear on thick lines, i.e. on the outer wall or on a wall between two rooms.
- Outer-wall window → faced by exactly 1 cell.
- Interior-wall window → faced by exactly 2 cells, one in each adjoining room.

---

## 4. Placement rules

### 4.1 Row and column uniqueness (the Sudoku constraint)

> Every person is in a different row and a different column.

No two characters share a row; no two share a column. Because N characters are placed on an N×N grid, this becomes a strict permutation: **exactly one person per row and exactly one per column**.

The book's own tip softens this to "in most grids", so treat "exactly one per row/column" as a consequence of N = character count rather than as an axiom. If you ever generate a puzzle with fewer characters than N, only the weaker "all different" version holds.

### 4.2 Occupancy

A character may stand on:
- an empty floor cell, or
- a cell belonging to a chair, rug, or bed.

A character may never stand on a table, TV, plant, shelf, or box.

### 4.3 One person per cell

Two characters never share a cell. (This is already implied by §4.1, but state it explicitly in the model.)

### 4.4 Victim placement

> The victim is in the last available cell.

The victim is not given a positional clue. Once all suspects are placed, the row/column constraint leaves exactly one row and one column free, and their intersection is the victim's cell. That cell must be legally occupiable.

### 4.5 Murderer determination

> Whoever was alone with the victim in the same room is the murderer.

For a valid puzzle: the victim's room contains exactly two characters, the victim and one suspect. That suspect is the answer.

---

## 5. Clue system

### 5.1 The `accanto` (adjacent) definition

> The keyword 'accanto' means directly above, below, to the left of, or to the right of something, **and in the same room**.

Two consequences that are easy to get wrong:
- **No diagonals.** Orthogonal only.
- **Adjacency does not cross room walls.** A cell next to a plant that sits on the other side of a thick line is *not* adjacent to that plant.

### 5.2 Clue types observed

| Type | Italian pattern | Meaning |
|---|---|---|
| On an object | "Era sul **letto**" / "Era seduto sulla **sedia**" / "Era sul **tappeto**" | Occupies a cell of an object of that type |
| Adjacent to an object | "Era **accanto** a una **pianta**" / "a un **letto**" / "a una **TV**" / "a un **tavolo**" | Orthogonally adjacent, same room |
| In a room | "Era nell'**Ingresso**" / "Era in **Bagno**" | Any legal cell in that named room |
| Facing a window | "Era di fronte a una **finestra**" | Occupies a cell touching a window edge |
| Compound | "Era **accanto** a una **pianta** ed era sul **letto**" | Logical AND of two conditions |
| Victim marker | "La vittima. Era nell'ultima casella rimasta." | See §4.4 |
| Global | "Non c'è nessuna stanza vuota" | Referenced in the solving tips: every room contains at least one character |

Note that "adjacent to a bed" and "on a bed" are distinct clues and both appear in case 2 (Enzo vs. Daniele). Adjacency to an occupiable object does not mean being on it.

### 5.3 Clue quantities

Each suspect gets exactly one clue line, which may itself be compound. The victim gets the fixed "last remaining cell" line.

---

## 6. Solving techniques (as published)

**1. Row by row, column by column.** In most grids there is exactly one person per row and per column. If a row or column has only one available cell left, someone must be there, even if you don't yet know who.

**2. Room by room.** Instead of asking where each person can be, ask who can and cannot be in each room. Especially useful with the "no empty room" clue.

**3. Eliminate intersection cells.** If a person can only occupy two cells, treat them as two corners of a rectangle: nobody else can occupy the remaining two corners. Two published corollaries:
- A can be on one of two chairs → nobody can be in a cell aligned with both.
- Two beds perpendicular to each other, A is on one of them → the cell where the beds' lines intersect is excluded for everyone else.

---

## 7. Worked example (tutorial case, 4×4, 2 rooms)

Characters: Aurelio, Brizio, Cristina (suspects), Vinny (victim). Rooms: `CAMERA`, `SALOTTO`.

Clues:
- Aurelio — adjacent to a table.
- Cristina — facing a window.
- Brizio — on a bed.
- Vinny — the victim, last remaining cell.

Deduction:
1. Mark all cells satisfying each suspect's clue.
2. Cristina has only one candidate cell. Fix her, then eliminate her whole row and column.
3. That leaves Brizio a single legal bed cell. Fix him, eliminate his row and column.
4. One cell adjacent to the table remains for Aurelio. Fix him, eliminate.
5. The single remaining cell is Vinny's.
6. Aurelio is alone with Vinny in the `SALOTTO`. **Aurelio is the murderer.**

---

## 8. Reference cases

### Case 1 — "Il tuo primo caso" (6×6, rooms: Ingresso, Salotto, Soggiorno, Camera)
- Alex — facing a window
- Dario — on the bed
- Ella — adjacent to a plant
- Bella — in the Ingresso
- Corinna — on the rug
- Vinicio — victim, last remaining cell

Solution: **Ella**.

### Case 2 — "Casa vacanze" (6×6, rooms: Camera, Bagno, Cameretta, Salotto)
- Arianna — adjacent to a TV
- Brizio — seated on the chair
- Cloe — in the Bagno
- Daniele — adjacent to a plant AND on the bed
- Enzo — adjacent to a bed
- Virgilio — victim, last remaining cell

Solution: **Arianna**.

---

## 9. Formal model (for implementation)

### Entities

```
Map        : N × N cells, N = number of characters
Room       : id, name, set<Cell>          // partition of the grid
Object     : id, type, occupiable: bool, set<Cell>, room_id
Window     : id, edge(cell_a, cell_b?)    // cell_b null if on outer wall
Character  : id, name, is_victim: bool, clue
Solution   : map<Character, Cell>         // a permutation
```

### Constraints

```
C1  All characters occupy distinct cells.
C2  All characters occupy distinct rows.
C3  All characters occupy distinct columns.
C4  No character occupies a cell of a non-occupiable object.
C5  Each suspect's cell satisfies their clue predicate.
C6  The victim's cell is the unique cell in the one free row × one free column.
C7  The victim's room contains exactly one suspect.
```

### Clue predicates

```
on(type)        : cell ∈ object.cells where object.type = type ∧ object.occupiable
adjacent(type)  : ∃ object of type, ∃ c ∈ object.cells,
                  orthogonally_adjacent(cell, c) ∧ room(cell) = room(c)
in_room(r)      : room(cell) = r
faces_window    : ∃ window w, cell ∈ {w.cell_a, w.cell_b}
no_empty_room   : ∀ room r, ∃ character in r      // global, not per-character
```

---

## 10. Solver and generator architecture

### 10.1 Solver interface

Keep the solver behind a single narrow interface so the algorithm underneath can be swapped without touching the generator.

```
solve(puzzle, limit: int = 2) -> List[Solution]
```

`limit` exists so uniqueness checks can abort as soon as a second solution appears. Every caller in the pipeline wants either "is there exactly one?" or "give me the one".

### 10.2 Algorithm

Backtracking with bitmasks, not permutation enumeration.

1. Precompute each character's candidate cell set from their clue predicate (§9).
2. Order characters most-constrained-first.
3. Walk the characters, tracking used rows and used columns as integer bitmasks.
4. Prune a branch as soon as a row or column collides, or a remaining character's candidate set becomes empty.

At 8×8 this resolves in well under a millisecond. Naïve permutation enumeration would be 40,320 arrangements at 8×8 and 3.6 million at 10×10, which is why it is not used.

### 10.3 Generation loop

Solve-first, then reduce. Never sample clues and hope.

1. **Build the scene.** Rooms, then objects, then windows. Validate that the map is playable (enough occupiable cells, no room without a reachable cell).
2. **Place a valid arrangement.** A random permutation satisfying C1–C4.
3. **Derive the full clue pool.** For every character, every clue predicate that is true of their cell.
4. **Pick the murderer configuration.** Enforce C7: exactly one suspect shares the victim's room. Retry the arrangement if no assignment satisfies it.
5. **Minimise.** Shuffle the pool, then greedily drop clues, keeping a clue only if removing it makes the solution non-unique.
6. **Verify.** `solve(puzzle, limit=2)` must return exactly one solution, and C6 must hold: the victim's forced cell is legally occupiable.
7. **Score.** Run the human solver (§11) and attach the difficulty metrics.

Steps 2–6 are rejection sampling, so runtime per puzzle is variable. This is the main argument for generating ahead of time (§12).

### 10.4 When to reconsider a constraint solver

CP-SAT (Google OR-Tools) or Z3 would let the constraints in §9 be declared almost verbatim, with all-solutions enumeration for free. They are not worth the dependency at 8×8. Revisit only if grid size passes 10×10, or if new clue types are added that prune poorly under backtracking — for example clues quantifying over other characters ("was in the same room as exactly one other person").

---

## 11. Difficulty model

### 11.1 Principle

Difficulty is the reasoning a puzzle demands, not the size of the grid. Score it by solving the puzzle the way a player would.

### 11.2 Human solver

Build a second solver that applies only the published techniques from §6, in escalating order:

| Tier | Technique | Description |
|---|---|---|
| 1 | Direct placement | A character has exactly one candidate cell |
| 2 | Row/column elimination | A row or column has one remaining legal cell |
| 3 | Room reasoning | Deduce who can and cannot be in each room |
| 4 | Intersection elimination | Rectangle-corner and perpendicular-bed exclusions |
| 5 | Global clue reasoning | "No empty room" and similar |

The solver repeatedly applies the lowest tier that produces progress, and records what it used.

### 11.3 Metrics

Attach to every generated puzzle:

```
difficulty: {
  highest_tier: int,        // deepest technique required
  tier_counts: {},          // how often each tier fired
  step_count: int,          // total deductions to reach a full solution
  score: int                // derived, used for ordering
}
```

`highest_tier` is the primary sort key. A 6×6 that needs tier 4 is genuinely harder than an 8×8 solvable entirely at tier 2.

### 11.4 Why grid size is a weak lever

N equals the character count (§2.1). Growing the grid therefore grows the clue list: 8×8 means 8 clues to read and hold in mind, 10×10 means 10. Past a point this adds bookkeeping fatigue rather than deductive challenge.

It also breaks the victim rule. §4.4 works because N characters fill N rows and N columns, leaving exactly one free row and one free column. Placing fewer characters on a larger grid leaves several rows and columns open, the victim's cell is no longer forced, and a different victim rule would be required. Do not decouple N from the character count without redesigning that rule.

---

## 12. Content pipeline

### 12.1 Publication model

| Slot | Cadence | Count |
|---|---|---|
| Daily puzzle | one per day | 7 per week |
| Weekly set | replaced each week | 10 per week |

17 puzzles per week. Generation cost is negligible at this volume.

### 12.2 Generate ahead, publish on a schedule

Do not generate at publication time. Produce large batches in advance, store them, and let the application query by date.

```
puzzle {
  id, seed, created_at,
  publish_date, slot: "daily" | "weekly_set",
  scene, characters, clues, solution, difficulty,
  rendered: { en: {...}, it: {...}, nl: {...} }
}
```

Reasons this matters:

- **Variable runtime.** Rejection sampling has no fixed cost per puzzle. That variance should never sit on the critical path of a scheduled job.
- **Curation.** A stock lets you order the week by difficulty — a rising curve Monday to Sunday, a deliberate spread across the ten weekly puzzles. A job that generates on the spot has to accept whatever it produces.
- **Failure isolation.** A generator bug costs one regenerated batch, not a broken daily puzzle.

### 12.3 Store puzzles fully expanded

Persist the complete puzzle as JSON, not just the seed. Keep the seed for reproducibility and debugging, but never rely on regeneration: a later change to the generator would silently alter an already-published puzzle.

### 12.4 Story layer

Themes and narrative are a presentation layer over a solved puzzle. The order is fixed:

```
solution → structured clues → rendered text → story wrapper
```

A language model may name characters, name rooms, and write flavour text. It must never author or alter clues. Generated clue text that is not derived from the structured clue objects will eventually produce an unsolvable puzzle, and the failure surfaces only when a player is already stuck.

---

## 13. Internationalisation

### 13.1 English is a renderer, not a pivot

The structured clue is the source of truth. Every locale renders directly from it. English is one output among several, never an intermediate that other languages are translated from.

```json
{ "character": 3, "clue": { "type": "adjacent", "object": "plant" } }
```

### 13.2 Grammar lives in the locale, not the puzzle

Flat key-value translation fails immediately, because clue templates need the object's grammatical gender:

- Italian: *accanto a **una** pianta* vs. *accanto a **un** letto*
- Dutch: *naast **de** plant* vs. *naast **het** bed*
- Italian rooms contract the preposition: *nell'Ingresso*, *in Bagno*

Each locale file therefore carries, per object type, its gender and article forms; and per clue type, one template that selects on them. Use ICU MessageFormat (i18next or FormatJS) so gender can act as a selector.

### 13.3 Keys, not strings

- **Rooms** are stored as keys — `room: "bathroom"` renders as Bathroom / Bagno / Badkamer.
- **Objects** are stored as type keys — `"plant"`, `"bed"`, `"chair"`.
- **Characters** are stored as ids with an index into a per-locale name pool, so each language gets plausible names. The answer is a character id, so the solution is locale-independent.

### 13.4 Freeze the rendering at publication

Because puzzles are generated ahead (§12.2), render every locale at publication time and store the result in the puzzle record. A later edit to a translation file then cannot alter or break a live puzzle.

---

## 14. Open specification questions

These are not resolved by the printed rules and need a decision before implementation:

1. **Two people on the same multi-cell object.** Can two characters occupy different cells of the same bed or rug? Not prohibited by the text, and not demonstrated in any case.
2. **Does `di fronte a` mean anything other than "touching the window edge"?** A stricter reading would be "directly opposite across the window", which for an interior window would mean the two cells face each other. The printed definition ("adjacent to both") supports the looser reading.
3. **Room shapes.** All published rooms are rectangles. Confirm whether non-rectangular rooms are permitted.
4. **Object footprints.** Beds appear as 2 cells, tables and rugs vary. Fix a canonical footprint table if you intend to render maps programmatically.
5. **Negative clues.** No published case uses "was not in…". Decide whether to support them.
6. **Multiple objects of the same type in one room.** Supported implicitly, but clue phrasing uses the indefinite article ("una pianta"), so it stays ambiguous by design.
