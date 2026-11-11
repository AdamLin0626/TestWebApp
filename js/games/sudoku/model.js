const DEFAULT_PUZZLE =
  "530070000" +
  "600195000" +
  "098000060" +
  "800060003" +
  "400803001" +
  "700020006" +
  "060000280" +
  "000419005" +
  "000080079";

const SOLUTION =
  "534678912" +
  "672195348" +
  "198342567" +
  "859761423" +
  "426853791" +
  "713924856" +
  "961537284" +
  "287419635" +
  "345286179";

function parsePuzzle(puzzle) {
  const cells = Array.isArray(puzzle)
    ? puzzle.flat().map(Number)
    : String(puzzle).replace(/\s/g, "").split("").map(Number);
  if (cells.length !== 81 || cells.some((value) => !Number.isInteger(value) || value < 0 || value > 9)) {
    throw new TypeError("A Sudoku puzzle must contain 81 digits from 0 to 9.");
  }
  return cells;
}

export class SudokuModel {
  constructor({ puzzle = DEFAULT_PUZZLE } = {}) {
    this.solution = SOLUTION.split("").map(Number);
    this.puzzle = parsePuzzle(puzzle);
    if (this.puzzle.some((value, index) => value && value !== this.solution[index])) {
      throw new TypeError("The supplied puzzle must match the bundled Sudoku solution.");
    }
    this.restart();
  }

  restart() {
    this.values = [...this.puzzle];
    this.notes = Array.from({ length: 81 }, () => []);
    this.selectedCell = this.values.findIndex((value) => value === 0);
    if (this.selectedCell < 0) this.selectedCell = 0;
    this.notesMode = false;
    this.elapsedSeconds = 0;
    this.solved = this.values.every((value, index) => value === this.solution[index]);
    this.remoteProgress = 0;
    this.remoteSolved = false;
    this.remoteElapsedSeconds = 0;
    this.updateProgress();
    return this.getSnapshot();
  }

  selectCell(index) {
    if (Number.isInteger(index) && index >= 0 && index < 81) {
      this.selectedCell = index;
    }
    return this.getSnapshot();
  }

  enterDigit(digit) {
    if (!Number.isInteger(digit) || digit < 1 || digit > 9 || this.solved) return this.getSnapshot();
    const index = this.selectedCell;
    if (this.puzzle[index] !== 0) return this.getSnapshot();

    if (this.notesMode) {
      const notes = this.notes[index];
      this.notes[index] = notes.includes(digit)
        ? notes.filter((candidate) => candidate !== digit)
        : [...notes, digit].sort((a, b) => a - b);
    } else {
      this.values[index] = digit;
      this.notes[index] = [];
    }
    this.updateProgress();
    return this.getSnapshot();
  }

  clearCell() {
    const index = this.selectedCell;
    if (this.puzzle[index] !== 0 || this.solved) return this.getSnapshot();
    this.values[index] = 0;
    this.notes[index] = [];
    this.updateProgress();
    return this.getSnapshot();
  }

  toggleNotes() {
    this.notesMode = !this.notesMode;
    return this.getSnapshot();
  }

  tick() {
    if (!this.solved) this.elapsedSeconds += 1;
    return this.getSnapshot();
  }

  applyRemoteProgress(progress) {
    const value = typeof progress === "number"
      ? progress
      : Number(progress && (progress.progress ?? progress.percent));
    if (Number.isFinite(value)) {
      this.remoteProgress = Math.max(0, Math.min(100, value));
    }
    return this.getSnapshot();
  }

  receiveSnapshot(snapshot) {
    if (snapshot && typeof snapshot === "object") {
      this.applyRemoteProgress(snapshot.progress);
      this.remoteSolved = Boolean(snapshot.solved);
      if (Number.isFinite(snapshot.elapsedSeconds)) {
        this.remoteElapsedSeconds = Math.max(0, Math.floor(snapshot.elapsedSeconds));
      }
    }
    return this.getSnapshot();
  }

  getSnapshot() {
    return {
      puzzle: [...this.puzzle],
      values: [...this.values],
      notes: this.notes.map((notes) => [...notes]),
      selectedCell: this.selectedCell,
      notesMode: this.notesMode,
      elapsedSeconds: this.elapsedSeconds,
      solved: this.solved,
      progress: this.progress,
      remoteProgress: this.remoteProgress,
      remoteSolved: this.remoteSolved,
      remoteElapsedSeconds: this.remoteElapsedSeconds,
    };
  }

  updateProgress() {
    const editableCount = this.puzzle.filter((value) => value === 0).length;
    const filledCount = this.values.reduce(
      (count, value, index) => count + (this.puzzle[index] === 0 && value !== 0 ? 1 : 0),
      0,
    );
    this.progress = editableCount ? Math.round((filledCount / editableCount) * 100) : 100;
    this.solved = this.values.every((value, index) => value === this.solution[index]);
  }
}

export { DEFAULT_PUZZLE, SOLUTION };
