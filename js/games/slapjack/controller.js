import { SlapjackModel } from './model.js';

const clone = (value) => JSON.parse(JSON.stringify(value));

export class SlapjackController {
  constructor({ model = new SlapjackModel(), onChange = () => {}, windowMs = 1000, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
    if (!model || typeof model.createGame !== 'function' || typeof onChange !== 'function'
      || !Number.isInteger(windowMs) || windowMs < 100 || typeof setTimer !== 'function' || typeof clearTimer !== 'function') {
      throw new TypeError('SlapjackController requires a model, callback, and a valid slap-window timer.');
    }
    this.model = model;
    this.onChange = onChange;
    this.windowMs = windowMs;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.state = null;
    this.version = 0;
    this.options = {};
    this.listeners = new Set();
    this.timer = null;
  }

  start(options = {}) {
    this._clearTimer();
    this.options = { ...options };
    this.state = this.model.createGame(this.options);
    this.version += 1;
    this._emit('start');
    return this.getState();
  }

  playCard(playerId = this.state?.currentPlayerId) {
    const next = this.model.playCard(this.state, playerId);
    if (!this._commit(next, 'play')) return false;
    if (this.state?.windowOpen && this.state.windowId === next.windowId) this._armWindow(next.windowId);
    return this.getState();
  }

  slap(playerId, windowId = this.state?.windowId) {
    const next = this.model.slap(this.state, playerId, windowId);
    if (!this._commit(next, 'slap')) return false;
    if (!next.windowOpen) this._clearTimer();
    return this.getState();
  }

  closeSlapWindow(windowId = this.state?.windowId) {
    const next = this.model.closeSlapWindow(this.state, windowId);
    if (!this._commit(next, 'window-closed')) return false;
    this._clearTimer();
    return this.getState();
  }

  restart(options = this.options) {
    return this.start(options);
  }

  dispose() {
    this._clearTimer();
    this.listeners.clear();
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

  _armWindow(windowId) {
    this._clearTimer();
    this.timer = this.setTimer(() => {
      this.timer = null;
      const next = this.model.closeSlapWindow(this.state, windowId);
      if (next) this._commit(next, 'window-closed');
    }, this.windowMs);
  }

  _clearTimer() {
    if (this.timer !== null) this.clearTimer(this.timer);
    this.timer = null;
  }

  _commit(next, action) {
    if (!next || !this.model.isValidSnapshot(next)) return false;
    this.state = next;
    this.version += 1;
    this._emit(action);
    return true;
  }

  _emit(action) {
    const snapshot = this.getState();
    const meta = { action, version: this.version };
    this.onChange(snapshot, meta);
    for (const listener of this.listeners) listener(clone(snapshot), { ...meta });
  }
}
