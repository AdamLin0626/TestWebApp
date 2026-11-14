import { DominoesModel } from "./model.js";

const clone = (value) => JSON.parse(JSON.stringify(value));

export class DominoesController {
  constructor({ model = new DominoesModel(), onChange = () => {} } = {}) {
    if (!model || typeof model.createGame !== "function" || typeof onChange !== "function") {
      throw new TypeError("DominoesController requires a model and onChange callback.");
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
    this._emit("start");
    return this.getState();
  }

  play(tileId, side = "right", playerId = this.state?.currentPlayerId) {
    return this._commit(this.model.playTile(this.state, playerId, tileId, side), "play");
  }

  draw(playerId = this.state?.currentPlayerId) {
    return this._commit(this.model.drawTile(this.state, playerId), "draw");
  }

  pass(playerId = this.state?.currentPlayerId) {
    return this._commit(this.model.passTurn(this.state, playerId), "pass");
  }

  getPlayableMoves(playerId = this.state?.currentPlayerId) {
    return this.model.getPlayableMoves(this.state, playerId);
  }

  getPublicState(viewerId) { return this.model.getPublicState(this.state, viewerId); }
  getState() { return this.state ? clone(this.state) : null; }

  subscribe(listener) {
    if (typeof listener !== "function") throw new TypeError("Listener must be a function.");
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
