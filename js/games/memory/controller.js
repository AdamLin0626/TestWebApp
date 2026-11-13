import { MemoryModel } from './model.js';
import { MemoryView } from './view.js';

const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

export class MemoryController {
  constructor({ root, mode = '1P', playerId = 'p1', playerName = 'Player', players = [], transport = null, onError = () => {}, onAction = () => {}, onOutcome = () => {}, t = (value) => value } = {}) {
    if (!root) throw new TypeError('MemoryController requires a root element');
    this.root = root;
    this.mode = mode === '2P' ? '2P' : '1P';
    this.playerId = this.mode === '1P' ? 'p1' : (playerId === 'p2' ? 'p2' : 'p1');
    this.playerName = playerName;
    this.players = players;
    this.transport = transport;
    this.onError = onError;
    this.onAction = onAction;
    this.onOutcome = onOutcome;
    this.model = new MemoryModel();
    this.view = new MemoryView(root, { t });
    this.state = null;
    this.pending = false;
    this.disposed = false;
    this.unsubscribe = null;
    this.mismatchTimer = 0;
    this.computerMemory = new Map();
    this.awaitingHostSnapshot = this.mode === '2P' && this.playerId === 'p2';
  }

  start() {
    this.state = this.model.createGame(this.players, { localName: this.playerName });
    this.view.mountHandlers({ onFlip: (index) => this.flip(index) });
    if (this.mode === '2P' && typeof this.transport?.subscribe === 'function') {
      this.unsubscribe = this.transport.subscribe((message) => this.receive(message));
    }
    this.render();
    if (this.mode === '2P' && this.playerId === 'p1') this._publishState(true);
    return this;
  }

  async flip(index) {
    if (this.disposed || this.pending || this.state?.currentPlayerId !== this.playerId) return;
    const previous = this.state;
    const next = this.model.applyFlip(previous, this.playerId, index);
    if (!next) return;
    this.state = next;
    this.pending = this.mode === '2P';
    this._rememberVisible();
    this.render();
    if (next.phase === 'mismatch') {
      this._scheduleMismatch();
      if (this.mode === '2P') {
        try {
          await this._publish({ kind: 'state', state: next, retain: true });
          this.onAction('self');
        } catch (error) {
          if (this.state === next) this.state = previous;
          this.onError(error);
        } finally {
          this.pending = false;
          this.render();
        }
      } else {
        this.onAction('self');
      }
      return;
    }
    if (this.mode === '1P') {
      this.onAction('self');
      if (next.phase === 'playing' && next.currentPlayerId === 'p2') this._runComputerTurn();
      return;
    }
    try {
      await this._publish({ kind: 'state', state: next, retain: true });
      this.onAction('self');
    } catch (error) {
      if (this.state === next) this.state = previous;
      this.onError(error);
    } finally {
      this.pending = false;
      this.render();
    }
  }

  _scheduleMismatch() {
    window.clearTimeout(this.mismatchTimer);
    const expected = this.state;
    this.mismatchTimer = window.setTimeout(async () => {
      if (this.disposed || this.state !== expected || this.state.phase !== 'mismatch') return;
      this.state = this.model.hideMismatch(this.state);
      this.render();
      if (this.mode === '1P' && this.state.currentPlayerId === 'p2') {
        this._runComputerTurn();
      } else if (this.mode === '2P') {
        await this._publish({ kind: 'state', state: this.state, retain: true }).catch(this.onError);
      }
    }, 850);
  }

  async _runComputerTurn() {
    if (this.disposed || this.mode !== '1P' || this.state.phase !== 'playing'
      || this.state.currentPlayerId !== 'p2') return;
    this.pending = true;
    this.render();
    let moves = 0;
    while (!this.disposed && this.mode === '1P' && this.state.phase === 'playing'
      && this.state.currentPlayerId === 'p2' && moves < 32) {
      await delay(420);
      if (this.disposed || this.state.phase !== 'playing' || this.state.currentPlayerId !== 'p2') break;
      const index = this.model.chooseComputerFlip(this.state, this.computerMemory);
      const next = this.model.applyFlip(this.state, 'p2', index);
      if (!next) break;
      this.state = next;
      this.onAction('opponent');
      this._rememberVisible();
      this.render();
      moves += 1;
      if (next.phase === 'mismatch') {
        await delay(850);
        if (this.disposed || this.state !== next) break;
        this.state = this.model.hideMismatch(this.state);
        this._rememberVisible();
        this.render();
        break;
      }
      if (next.phase === 'finished') break;
    }
    this.pending = false;
    this.render();
  }

  _rememberVisible() {
    this.computerMemory = this.model.rememberVisibleCards(this.state, this.computerMemory);
  }

  receive(message) {
    if (this.disposed || this.mode !== '2P' || !message) return false;
    if (message.kind === 'restart' && this.playerId === 'p1' && message.remotePlayerId === 'p2') {
      window.clearTimeout(this.mismatchTimer);
      const restartAt = Math.max(Date.now(), this.state.restartAt + 1, Number(message.restartAt) || 0);
      this.state = this.model.createGame(this.players, { restartAt, localName: this.playerName });
      this.computerMemory.clear();
      this.render();
      this._publishState(true);
      return true;
    }
    if (message.kind !== 'state' || !this.model.isValidSnapshot(message.state)) return false;
    if (this.playerId === 'p2' && message.remotePlayerId !== 'p1') return false;
    const incoming = message.state;
    const isInitialHostSnapshot = this.awaitingHostSnapshot;
    this.awaitingHostSnapshot = false;
    const previous = this.state;
    if (!isInitialHostSnapshot && (incoming.restartAt < this.state.restartAt
      || (incoming.restartAt === this.state.restartAt && incoming.moveCount <= this.state.moveCount))) return false;
    window.clearTimeout(this.mismatchTimer);
    this.state = incoming;
    if (!isInitialHostSnapshot && incoming.restartAt === previous.restartAt && incoming.moveCount > previous.moveCount) {
      this.onAction('opponent');
    }
    this._rememberVisible();
    this.render();
    return true;
  }

  _publishState(retain) {
    this._publish({ kind: 'state', state: this.state, retain });
  }

  _publish(message) {
    if (typeof this.transport?.publish !== 'function') return Promise.resolve();
    try {
      return Promise.resolve(this.transport.publish(message));
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async restart() {
    if (!this.state || this.disposed) return;
    window.clearTimeout(this.mismatchTimer);
    this.pending = false;
    const restartAt = Math.max(Date.now(), this.state.restartAt + 1);
    if (this.mode === '2P' && this.playerId === 'p2') {
      await this._publish({ kind: 'restart', restartAt, retain: false }).catch(this.onError);
      return;
    }
    this.state = this.model.createGame(this.players, { restartAt, localName: this.playerName });
    this.computerMemory.clear();
    this.render();
    if (this.mode === '2P') this._publishState(true);
  }

  render() {
    if (this.state) {
      this.view.render(this.state, this.playerId, { pending: this.pending, mode: this.mode });
      if (!this.pending) this.onOutcome(this.state);
    }
  }

  dispose() {
    this.disposed = true;
    window.clearTimeout(this.mismatchTimer);
    if (typeof this.unsubscribe === 'function') this.unsubscribe();
    this.unsubscribe = null;
    this.view.dispose();
  }
}
