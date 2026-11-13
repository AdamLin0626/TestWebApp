import { BlackjackModel } from './model.js';

const clone = (value) => JSON.parse(JSON.stringify(value));

export class BlackjackController {
  constructor({ model = new BlackjackModel(), onChange = () => {} } = {}) {
    if (!model || typeof model.createGame !== 'function' || typeof onChange !== 'function') {
      throw new TypeError('BlackjackController requires a model and onChange callback.');
    }
    this.model = model;
    this.onChange = onChange;
    this.state = null;
    this.version = 0;
    this.options = {};
    this.listeners = new Set();
  }

  start(options = {}) {
    this.options = { ...options };
    this.state = this.model.createGame(this.options);
    this.version += 1;
    this._emit('start');
    return this.getState();
  }

  deal(bets = 10) {
    return this._commit(this.model.startRound(this.state, bets), 'deal');
  }

  hit(playerId) {
    return this._commit(this.model.hit(this.state, playerId), 'hit');
  }

  stand(playerId) {
    return this._commit(this.model.stand(this.state, playerId), 'stand');
  }

  split(playerId) {
    return this._commit(this.model.split(this.state, playerId), 'split');
  }

  doubleDown(playerId) {
    return this._commit(this.model.doubleDown(this.state, playerId), 'double');
  }

  canSplit(playerId) {
    return this.model.canSplit(this.state, playerId);
  }

  canDouble(playerId) {
    return this.model.canDouble(this.state, playerId);
  }

  restart(options = this.options) {
    return this.start(options);
  }

  getState() {
    return this.state ? clone(this.state) : null;
  }

  getPublicState() {
    return this.model.getPublicState(this.state);
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
