import { ConnectFourModel } from './model.js';
import { ConnectFourView } from './view.js';

const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

export class ConnectFourController {
  constructor({ root, mode = '1P', playerId = 'p1', playerName = 'Player', players = [], transport = null, onError = () => {}, onAction = () => {}, onOutcome = () => {}, t = (value) => value } = {}) {
    if (!root) throw new TypeError('ConnectFourController requires a root element');
    this.root = root;
    this.mode = mode === '2P' ? '2P' : '1P';
    this.playerId = this.mode === '1P' ? 'p1' : (playerId === 'p2' ? 'p2' : 'p1');
    this.playerName = playerName;
    this.players = players;
    this.transport = transport;
    this.onError = onError;
    this.onAction = onAction;
    this.onOutcome = onOutcome;
    this.model = new ConnectFourModel();
    this.view = new ConnectFourView(root, { t });
    this.state = null;
    this.pending = false;
    this.disposed = false;
    this.unsubscribe = null;
    this.timer = 0;
    this.awaitingHostSnapshot = this.mode === '2P' && this.playerId === 'p2';
  }

  start() {
    this.state = this.model.createGame(this.players, { localName: this.playerName });
    this.view.mountHandlers({ onDrop: (column) => this.drop(column) });
    if (this.mode === '2P' && typeof this.transport?.subscribe === 'function') {
      this.unsubscribe = this.transport.subscribe((message) => this.receive(message));
    }
    this.render();
    if (this.mode === '2P' && this.playerId === 'p1') this._publishState(true);
    return this;
  }

  async drop(column) {
    if (this.disposed || this.pending || this.state?.currentPlayerId !== this.playerId) return;
    const previous = this.state;
    const next = this.model.applyMove(previous, this.playerId, column);
    if (!next) return;
    this.state = next;
    this.pending = true;
    this.render();
    if (this.mode === '1P') {
      this.onAction('self');
      if (next.phase === 'playing' && next.currentPlayerId === 'p2') {
        const expected = this.state;
        this.timer = window.setTimeout(() => {
          if (this.disposed || this.state !== expected) return;
          const columnForComputer = this.model.chooseComputerMove(this.state, 'p2');
          const computerMove = this.model.applyMove(this.state, 'p2', columnForComputer);
          if (computerMove) {
            this.state = computerMove;
            this.onAction('opponent');
          }
          this.pending = false;
          this.render();
        }, 380);
        return;
      }
      this.pending = false;
      this.render();
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

  receive(message) {
    if (this.disposed || this.mode !== '2P' || !message) return false;
    if (message.kind === 'restart' && this.playerId === 'p1' && message.remotePlayerId === 'p2') {
      const restartAt = Math.max(Date.now(), this.state.restartAt + 1, Number(message.restartAt) || 0);
      this.state = this.model.createGame(this.players, { restartAt, localName: this.playerName });
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
    this.state = incoming;
    if (!isInitialHostSnapshot && incoming.restartAt === previous.restartAt && incoming.moveCount > previous.moveCount) {
      this.onAction('opponent');
    }
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
    const restartAt = Math.max(Date.now(), this.state.restartAt + 1);
    if (this.mode === '2P' && this.playerId === 'p2') {
      await this._publish({ kind: 'restart', restartAt, retain: false }).catch(this.onError);
      return;
    }
    this.state = this.model.createGame(this.players, { restartAt, localName: this.playerName });
    this.pending = false;
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
    window.clearTimeout(this.timer);
    if (typeof this.unsubscribe === 'function') this.unsubscribe();
    this.unsubscribe = null;
    this.view.dispose();
  }
}
