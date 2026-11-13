import { SudokuModel } from './model.js';

const clone = (value) => JSON.parse(JSON.stringify(value));

export class SudokuController {
  constructor({ model = new SudokuModel(), onChange = () => {} } = {}) {
    if (!model || typeof model.createGame !== 'function' || typeof onChange !== 'function') {
      throw new TypeError('SudokuController requires a model and onChange callback.');
    }
    this.model = model;
    this.onChange = onChange;
    this.state = null;
    this.version = 0;
    this.options = { difficulty: 'medium' };
    this.listeners = new Set();
  }

  start(options = this.options) {
    this.options = { ...options };
    this.state = this.model.createGame(this.options);
    this.version += 1;
    this._emit('start');
    return this.getState();
  }

  setValue(index, value) {
    return this._commit(this.model.setValue(this.state, index, value), 'set-value');
  }

  setCell(row, column, value) {
    if (!Number.isInteger(row) || row < 0 || row > 8 || !Number.isInteger(column) || column < 0 || column > 8) return false;
    return this.setValue(row * 9 + column, value);
  }

  getCandidates(index) {
    return this.model.getCandidates(this.state?.grid, index);
  }

  getConflicts() {
    return this.state ? this.model.getConflicts(this.state.grid) : [];
  }

  hint(index) {
    if (!this.state || !Number.isInteger(index) || index < 0 || index > 80 || this.state.grid[index] !== 0) return false;
    return this.setValue(index, this.state.solution[index]);
  }

  revealSolution() {
    if (!this.state || this.state.phase !== 'playing') return false;
    const next = clone(this.state);
    next.grid = next.solution.slice();
    next.conflicts = [];
    next.phase = 'finished';
    next.moveCount += 1;
    return this._commit(next, 'reveal-solution');
  }

  restart(options = this.options) {
    return this.start(options);
  }

  getState() {
    return this.state ? clone(this.state) : null;
  }

  subscribe(listener) {
    if (typeof listener !== 'function') throw new TypeError('Listener must be a function.');
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _commit(next, action) {
    if (!next || !this.model.isValidSnapshot(next)) return false;
    this.state = next;
    this.version += 1;
    this._emit(action);
    return this.getState();
  }

  _emit(action) {
    const snapshot = this.getState();
    const meta = { action, version: this.version };
    this.onChange(snapshot, meta);
    for (const listener of this.listeners) listener(clone(snapshot), { ...meta });
  }
}
