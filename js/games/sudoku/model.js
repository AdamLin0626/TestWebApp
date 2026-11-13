const SIZE = 9;
const CELL_COUNT = SIZE * SIZE;
const FULL_MASK = 0x3fe;
const EMPTY = 0;
const BLANKS_BY_DIFFICULTY = Object.freeze({ easy: 36, medium: 46, hard: 54 });
const clone = (value) => JSON.parse(JSON.stringify(value));

function isGrid(grid) {
  return Array.isArray(grid) && grid.length === CELL_COUNT
    && grid.every((value) => Number.isInteger(value) && value >= 0 && value <= 9);
}

function readRandom(rng) {
  const value = Number(rng());
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError('Sudoku RNG must return a number in [0, 1).');
  }
  return value;
}

function shuffled(values, rng) {
  const result = values.slice();
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(readRandom(rng) * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function bitCount(mask) {
  let count = 0;
  for (let remaining = mask; remaining; remaining &= remaining - 1) count += 1;
  return count;
}

function valuesFromMask(mask) {
  const values = [];
  for (let value = 1; value <= 9; value += 1) {
    if (mask & (1 << value)) values.push(value);
  }
  return values;
}

function buildMasks(grid) {
  const rows = Array(SIZE).fill(0);
  const columns = Array(SIZE).fill(0);
  const boxes = Array(SIZE).fill(0);
  for (let index = 0; index < CELL_COUNT; index += 1) {
    const value = grid[index];
    if (value === EMPTY) continue;
    const row = Math.floor(index / SIZE);
    const column = index % SIZE;
    const box = Math.floor(row / 3) * 3 + Math.floor(column / 3);
    const bit = 1 << value;
    if ((rows[row] & bit) || (columns[column] & bit) || (boxes[box] & bit)) return null;
    rows[row] |= bit;
    columns[column] |= bit;
    boxes[box] |= bit;
  }
  return { rows, columns, boxes };
}

function candidatesFor(grid, masks, index) {
  const row = Math.floor(index / SIZE);
  const column = index % SIZE;
  const box = Math.floor(row / 3) * 3 + Math.floor(column / 3);
  return FULL_MASK & ~(masks.rows[row] | masks.columns[column] | masks.boxes[box]);
}

function searchSolutions(grid, masks, limit, rng, randomize, result) {
  if (result.count >= limit) return;
  let bestIndex = -1;
  let bestMask = 0;
  let bestCount = 10;

  for (let index = 0; index < CELL_COUNT; index += 1) {
    if (grid[index] !== EMPTY) continue;
    const mask = candidatesFor(grid, masks, index);
    const count = bitCount(mask);
    if (!count) return;
    if (count < bestCount) {
      bestIndex = index;
      bestMask = mask;
      bestCount = count;
      if (count === 1) break;
    }
  }

  if (bestIndex < 0) {
    result.count += 1;
    if (!result.first) result.first = grid.slice();
    return;
  }

  let candidates = valuesFromMask(bestMask);
  if (randomize) candidates = shuffled(candidates, rng);
  const row = Math.floor(bestIndex / SIZE);
  const column = bestIndex % SIZE;
  const box = Math.floor(row / 3) * 3 + Math.floor(column / 3);

  for (const value of candidates) {
    const bit = 1 << value;
    grid[bestIndex] = value;
    masks.rows[row] |= bit;
    masks.columns[column] |= bit;
    masks.boxes[box] |= bit;
    searchSolutions(grid, masks, limit, rng, randomize, result);
    grid[bestIndex] = EMPTY;
    masks.rows[row] &= ~bit;
    masks.columns[column] &= ~bit;
    masks.boxes[box] &= ~bit;
    if (result.count >= limit) return;
  }
}

function countSolutionsInternal(grid, limit = 2, rng = Math.random, randomize = false) {
  if (!isGrid(grid)) return { count: 0, first: null };
  const masks = buildMasks(grid);
  if (!masks) return { count: 0, first: null };
  const result = { count: 0, first: null };
  searchSolutions(grid.slice(), masks, Math.max(1, Math.floor(limit)), rng, randomize, result);
  return result;
}

function findConflicts(grid) {
  if (!isGrid(grid)) return null;
  const conflicts = new Set();
  const groups = [];
  for (let row = 0; row < SIZE; row += 1) {
    groups.push(Array.from({ length: SIZE }, (_, column) => row * SIZE + column));
  }
  for (let column = 0; column < SIZE; column += 1) {
    groups.push(Array.from({ length: SIZE }, (_, row) => row * SIZE + column));
  }
  for (let boxRow = 0; boxRow < 3; boxRow += 1) {
    for (let boxColumn = 0; boxColumn < 3; boxColumn += 1) {
      const group = [];
      for (let row = 0; row < 3; row += 1) {
        for (let column = 0; column < 3; column += 1) {
          group.push((boxRow * 3 + row) * SIZE + boxColumn * 3 + column);
        }
      }
      groups.push(group);
    }
  }

  for (const group of groups) {
    const seen = new Map();
    for (const index of group) {
      const value = grid[index];
      if (!value) continue;
      if (!seen.has(value)) seen.set(value, []);
      seen.get(value).push(index);
    }
    for (const duplicateCells of seen.values()) {
      if (duplicateCells.length > 1) duplicateCells.forEach((index) => conflicts.add(index));
    }
  }
  return [...conflicts].sort((a, b) => a - b);
}

export class SudokuModel {
  createGame({ difficulty = 'medium', rng = Math.random } = {}) {
    const generated = this.generatePuzzle(difficulty, { rng });
    return {
      gameType: 'sudoku',
      phase: 'playing',
      difficulty,
      grid: generated.puzzle,
      solution: generated.solution,
      givens: generated.puzzle.map((value) => value !== EMPTY),
      requestedBlanks: generated.requestedBlanks,
      actualBlanks: generated.actualBlanks,
      conflicts: [],
      moveCount: 0
    };
  }

  generateSolution(rng = Math.random) {
    if (typeof rng !== 'function') throw new TypeError('Sudoku RNG must be a function.');
    const grid = Array(CELL_COUNT).fill(EMPTY);
    const masks = buildMasks(grid);
    const result = { count: 0, first: null };
    searchSolutions(grid, masks, 1, rng, true, result);
    if (!result.first) throw new Error('Could not generate a complete Sudoku solution.');
    return result.first;
  }

  generatePuzzle(difficulty = 'medium', { rng = Math.random } = {}) {
    if (!Object.prototype.hasOwnProperty.call(BLANKS_BY_DIFFICULTY, difficulty)) {
      throw new RangeError(`Unknown Sudoku difficulty: ${difficulty}`);
    }
    if (typeof rng !== 'function') throw new TypeError('Sudoku RNG must be a function.');
    const solution = this.generateSolution(rng);
    const puzzle = solution.slice();
    const targetBlanks = BLANKS_BY_DIFFICULTY[difficulty];
    const pairs = shuffled(Array.from({ length: 40 }, (_, index) => index), rng);
    let actualBlanks = 0;

    for (const index of pairs) {
      if (actualBlanks + 2 > targetBlanks) continue;
      const mirror = CELL_COUNT - 1 - index;
      const firstValue = puzzle[index];
      const mirrorValue = puzzle[mirror];
      puzzle[index] = EMPTY;
      puzzle[mirror] = EMPTY;
      if (countSolutionsInternal(puzzle, 2).count === 1) {
        actualBlanks += 2;
      } else {
        puzzle[index] = firstValue;
        puzzle[mirror] = mirrorValue;
      }
      if (actualBlanks >= targetBlanks) break;
    }

    if (targetBlanks % 2 === 1 && actualBlanks < targetBlanks) {
      const center = Math.floor(CELL_COUNT / 2);
      const centerValue = puzzle[center];
      puzzle[center] = EMPTY;
      if (countSolutionsInternal(puzzle, 2).count === 1) actualBlanks += 1;
      else puzzle[center] = centerValue;
    }

    return { puzzle, solution, requestedBlanks: targetBlanks, actualBlanks };
  }

  countSolutions(grid, limit = 2) {
    if (!Number.isInteger(limit) || limit < 1) throw new RangeError('Solution limit must be a positive integer.');
    return countSolutionsInternal(grid, limit).count;
  }

  solve(grid) {
    return countSolutionsInternal(grid, 1).first;
  }

  getCandidates(grid, index) {
    if (!isGrid(grid) || !Number.isInteger(index) || index < 0 || index >= CELL_COUNT) return [];
    const working = grid.slice();
    working[index] = EMPTY;
    const masks = buildMasks(working);
    if (!masks) return [];
    return valuesFromMask(candidatesFor(working, masks, index));
  }

  getConflicts(grid) {
    return findConflicts(grid);
  }

  setValue(game, index, value) {
    if (!this.isValidSnapshot(game) || game.phase !== 'playing'
      || !Number.isInteger(index) || index < 0 || index >= CELL_COUNT
      || !Number.isInteger(value) || value < 0 || value > 9 || game.givens[index]) return null;
    if (game.grid[index] === value) return null;
    const next = clone(game);
    next.grid[index] = value;
    next.moveCount += 1;
    next.conflicts = findConflicts(next.grid);
    next.phase = this.isSolved(next) ? 'finished' : 'playing';
    return next;
  }

  isSolved(game) {
    return Boolean(game && isGrid(game.grid) && game.grid.every((value) => value !== EMPTY)
      && findConflicts(game.grid)?.length === 0
      && game.solution?.every((value, index) => value === game.grid[index]));
  }

  isValidSnapshot(game) {
    return Boolean(game && game.gameType === 'sudoku'
      && ['playing', 'finished'].includes(game.phase)
      && isGrid(game.grid) && isGrid(game.solution)
      && game.solution.every((value) => value !== EMPTY)
      && (game.phase !== 'finished' || this.isSolved(game))
      && Array.isArray(game.givens) && game.givens.length === CELL_COUNT
      && game.givens.every((given, index) => typeof given === 'boolean'
        && (!given || game.grid[index] === game.solution[index]))
      && findConflicts(game.solution)?.length === 0
      && Number.isInteger(game.moveCount) && game.moveCount >= 0
      && Number.isInteger(game.actualBlanks) && game.actualBlanks >= 0);
  }
}
