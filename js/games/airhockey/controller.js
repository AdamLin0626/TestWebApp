import { AirHockeyModel } from './model.js';
import { AirHockeyView } from './view.js';

const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

export class AirHockeyController {
  constructor({ root, mode = '1P', playerId = 'p1', playerName = 'Player', players = [], transport = null, onError = () => {}, onAction = () => {}, onOutcome = () => {}, t = (value) => value } = {}) {
    if (!root) throw new TypeError('AirHockeyController requires a root element');
    this.root = root;
    this.mode = mode === '2P' ? '2P' : '1P';
    this.playerId = this.mode === '1P' ? 'p1' : (playerId === 'p2' ? 'p2' : 'p1');
    this.playerName = playerName;
    this.players = players;
    this.transport = transport;
    this.onError = onError;
    this.onAction = onAction;
    this.onOutcome = onOutcome;
    this.model = new AirHockeyModel();
    this.view = new AirHockeyView(root, { t });
    this.state = null;
    this.unsubscribe = null;
    this.frame = 0;
    this.lastFrame = 0;
    this.lastPublish = 0;
    this.inputSequence = 0;
    this.lastRemoteInput = 0;
    this.lastSelfSound = 0;
    this.lastOpponentSound = 0;
    this.awaitingHostSnapshot = this.mode === '2P' && this.playerId === 'p2';
    this.disposed = false;
  }

  start() {
    if (this.disposed) return this;
    this.state = this.model.createGame(this.players, { localName: this.playerName });
    this.view.mountHandlers({
      onMove: ({ x, y }) => this._movePaddle(x, y),
      onKeyMove: (dx, dy) => {
        const paddle = this.state?.paddles[this.playerId];
        if (paddle) this._movePaddle(paddle.x + dx, paddle.y + dy);
      }
    });
    if (this.mode === '2P' && typeof this.transport?.subscribe === 'function') {
      this.unsubscribe = this.transport.subscribe((message) => this.receive(message));
    }
    this.render();
    if (this.mode === '2P' && this.playerId === 'p1') this._publishState(true);
    this.frame = window.requestAnimationFrame((time) => this._tick(time));
    return this;
  }

  _tick(time) {
    if (this.disposed) return;
    const delta = this.lastFrame ? Math.min(0.035, (time - this.lastFrame) / 1000) : 1 / 60;
    this.lastFrame = time;
    if (this.mode === '1P') {
      const previousPaddle = this.state.paddles.p2;
      this.state = this.model.moveComputerPaddle(this.state, delta);
      this._maybePaddleSound('opponent', previousPaddle, this.state.paddles.p2);
      this.state = this.model.step(this.state, delta);
    } else if (this.playerId === 'p1') {
      this.state = this.model.step(this.state, delta);
      if (time - this.lastPublish >= 85) {
        this.lastPublish = time;
        this._publishState(false);
      }
    }
    this.render();
    this.frame = window.requestAnimationFrame((nextTime) => this._tick(nextTime));
  }

  _movePaddle(x, y) {
    if (this.disposed || this.state?.phase !== 'playing') return;
    const previousPaddle = this.state.paddles[this.playerId];
    const authoritativeMoveCount = this.state.moveCount;
    this.state = this.model.setPaddle(this.state, this.playerId, x, y);
    this._maybePaddleSound('self', previousPaddle, this.state.paddles[this.playerId]);
    if (this.mode === '2P' && this.playerId === 'p2') this.state.moveCount = authoritativeMoveCount;
    this.render();
    if (this.mode === '2P' && this.playerId === 'p2') {
      this._publish({ kind: 'input', x: this.state.paddles.p2.x, y: this.state.paddles.p2.y, sequence: ++this.inputSequence }, false);
    }
  }

  _maybePaddleSound(actor, before, after) {
    if (!before || !after || Math.hypot(after.x - before.x, after.y - before.y) < 0.12) return;
    const key = actor === 'self' ? 'lastSelfSound' : 'lastOpponentSound';
    const now = Date.now();
    if (now - this[key] < 450) return;
    this[key] = now;
    this.onAction(actor);
  }

  _publishState(retain) {
    this._publish({ kind: 'state', state: this.state, retain });
  }

  _publish(message, retain = false) {
    if (typeof this.transport?.publish !== 'function') return;
    try {
      const result = this.transport.publish({ ...message, retain });
      if (result && typeof result.catch === 'function') result.catch((error) => this.onError(error));
    } catch (error) {
      this.onError(error);
    }
  }

  receive(message) {
    if (this.disposed || this.mode !== '2P' || !message) return false;
    if (message.kind === 'input' && this.playerId === 'p1' && message.remotePlayerId === 'p2'
      && Number.isFinite(message.x) && Number.isFinite(message.y)
      && Number(message.sequence) > this.lastRemoteInput) {
      this.lastRemoteInput = Number(message.sequence);
      const previousPaddle = this.state.paddles.p2;
      this.state = this.model.setPaddle(this.state, 'p2', message.x, message.y);
      this._maybePaddleSound('opponent', previousPaddle, this.state.paddles.p2);
      return true;
    }
    if (message.kind === 'restart' && this.playerId === 'p1' && message.remotePlayerId === 'p2') {
      const restartAt = Math.max(Date.now(), this.state.restartAt + 1, Number(message.restartAt) || 0);
      this.state = this.model.createGame(this.players, { restartAt, localName: this.playerName });
      this.lastRemoteInput = 0;
      this.render();
      this._publishState(true);
      return true;
    }
    if (message.kind !== 'state' || !this.model.isValidSnapshot(message.state)) return false;
    if (this.playerId === 'p2' && message.remotePlayerId !== 'p1') return false;
    const incoming = message.state;
    const isInitialHostSnapshot = this.awaitingHostSnapshot;
    this.awaitingHostSnapshot = false;
    if (!isInitialHostSnapshot && (incoming.restartAt < this.state.restartAt
      || (incoming.restartAt === this.state.restartAt && incoming.moveCount <= this.state.moveCount))) return false;
    this.state = incoming;
    this.render();
    return true;
  }

  async restart() {
    if (!this.state || this.disposed) return;
    const restartAt = Math.max(Date.now(), this.state.restartAt + 1);
    if (this.mode === '2P' && this.playerId === 'p2') {
      this._publish({ kind: 'restart', restartAt }, false);
      return;
    }
    this.state = this.model.createGame(this.players, { restartAt, localName: this.playerName });
    this.lastRemoteInput = 0;
    this.render();
    if (this.mode === '2P') this._publishState(true);
  }

  render() {
    if (this.state) {
      this.view.render(this.state, this.playerId, { mode: this.mode });
      this.onOutcome(this.state);
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.frame) window.cancelAnimationFrame(this.frame);
    if (typeof this.unsubscribe === 'function') this.unsubscribe();
    this.unsubscribe = null;
    this.view.dispose();
  }
}
