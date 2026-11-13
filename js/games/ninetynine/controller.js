import { NinetyNineModel } from './model.js';

const clone = (value) => JSON.parse(JSON.stringify(value));

export class NinetyNineController {
  constructor({ model = new NinetyNineModel(), onChange = () => {} } = {}) {
    if (!model || typeof model.createGame !== 'function' || typeof onChange !== 'function') {
      throw new TypeError('NinetyNineController requires a model and onChange callback.');
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

  play(handIndex, options = {}, playerId = this.state?.currentPlayerId) {
    return this._commit(this.model.playCard(this.state, playerId, handIndex, options), 'play');
  }

  restart(options = this.options) {
    return this.start(options);
  }

  getState() {
    return this.state ? clone(this.state) : null;
  }

  getPublicState(viewerId) {
    return this.model.getPublicState(this.state, viewerId);
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
