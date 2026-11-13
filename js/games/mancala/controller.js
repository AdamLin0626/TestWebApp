import { MancalaModel } from './model.js';

const clone = (value) => JSON.parse(JSON.stringify(value));

export class MancalaController {
  constructor({ model = new MancalaModel(), onChange = () => {} } = {}) {
    if (!model || typeof model.createGame !== 'function' || typeof onChange !== 'function') {
      throw new TypeError('MancalaController requires a model and onChange callback.');
    }
    this.model = model;
    this.onChange = onChange;
    this.state = null;
    this.version = 0;
    this.listeners = new Set();
  }

  start(options = {}) {
    this.state = this.model.createGame(options);
    this.version += 1;
    this._emit('start');
    return this.getState();
  }

  move(pitIndex, playerId = this.state?.currentPlayerId) {
    return this._commit(this.model.applyMove(this.state, playerId, pitIndex), 'move');
  }

  getValidMoves(playerId = this.state?.currentPlayerId) {
    return this.model.getValidMoves(this.state, playerId);
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
