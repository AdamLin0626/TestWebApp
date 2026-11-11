import { BattleshipModel, BATTLESHIP_FLEET } from './model.js';
import { BattleshipView } from './view.js';

const PLAYER_IDS = ['p1', 'p2'];
const otherPlayer = (playerId) => playerId === 'p1' ? 'p2' : 'p1';

export class BattleshipController {
  constructor({
    root,
    mode = '1P',
    playerId = 'p1',
    transport = null,
    onError = () => {},
    t = (value) => value,
  } = {}) {
    if (!root) throw new TypeError('BattleshipController requires a root element');
    this.root = root;
    this.mode = mode === '2P' ? '2P' : '1P';
    this.playerId = this.mode === '1P' ? 'p1' : (PLAYER_IDS.includes(playerId) ? playerId : 'p1');
    this.transport = transport;
    this.onError = onError;
    this.t = t;
    this.model = new BattleshipModel({ mode: this.mode, playerId: this.playerId });
    this.readyPlayers = new Set();
    this.unsubscribe = null;
    this.started = false;
    this.disposed = false;
    this.view = new BattleshipView({
      root,
      t,
      onAction: (action) => this.handleAction(action),
    });
  }

  start() {
    if (this.disposed) return this;
    if (typeof this.unsubscribe === 'function') this.unsubscribe();
    this.unsubscribe = null;
    this.model.startNewGame({ mode: this.mode, playerId: this.playerId });
    this.readyPlayers.clear();
    this.started = false;
    if (this.mode === '2P' && typeof this.transport?.subscribe === 'function') {
      this.unsubscribe = this.transport.subscribe((message) => this.receive(message));
    }
    this.render();
    return this;
  }

  receive(message) {
    if (this.disposed || this.mode !== '2P' || !message || message.game !== 'battleship') return false;
    if (!PLAYER_IDS.includes(message.playerId) || message.playerId === this.playerId) return false;
    if (message.kind === 'ready') {
      this.readyPlayers.add(message.playerId);
      this._startIfReady();
      this.render();
      return true;
    }
    if (message.kind === 'restart') {
      this.model.startNewGame({ mode: this.mode, playerId: this.playerId });
      this.readyPlayers.clear();
      this.started = false;
      this.render();
      return true;
    }
    if (message.kind === 'start') {
      this.readyPlayers.add(message.playerId);
      this._startIfReady();
      return true;
    }
    if (message.kind === 'shot') {
      if (message.playerId !== this.model.state.currentPlayerId) return false;
      const result = this.model.fire(message.index, message.playerId);
      if (!result.accepted) return false;
      this._publish({
        kind: 'shot-result',
        playerId: this.playerId,
        by: message.playerId,
        index: message.index,
        result: result.result,
        sunkShipId: result.sunkShipId,
        winner: result.winner,
      });
      this.render();
      return true;
    }
    if (message.kind === 'shot-result') {
      if (message.playerId !== otherPlayer(this.playerId)
        || message.by !== this.playerId
        || !['hit', 'miss'].includes(message.result)) return false;
      if (!this.model.resolveShot(message.index, this.playerId, message.result, message.sunkShipId)) return false;
      if (message.winner && PLAYER_IDS.includes(message.winner)) {
        this.model.state.winner = message.winner;
        this.model.state.phase = 'finished';
      }
      this.render();
      return true;
    }
    return false;
  }

  handleAction(action) {
    if (this.disposed || !action) return;
    switch (action.type) {
      case 'select-ship':
        this.model.setSelectedShip(action.shipId);
        this.render();
        break;
      case 'drop-ship':
        this.model.setSelectedShip(action.shipId);
        this._handleCell({ board: 'own', index: action.index });
        break;
      case 'rotate':
        this.model.rotate();
        this.render();
        break;
      case 'auto-place':
        this.model.autoPlace(this.playerId);
        if (this.mode === '2P' && this._fleetReady()) this._markReady();
        this.render();
        break;
      case 'start':
        this._startSolo();
        break;
      case 'cell':
        this._handleCell(action);
        break;
      default:
        break;
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (typeof this.unsubscribe === 'function') this.unsubscribe();
    this.unsubscribe = null;
    this.view.dispose();
  }

  restart() {
    this._restart();
  }

  _handleCell(action) {
    if (this.model.state.phase === 'setup' && action.board === 'own') {
      const placed = this.model.placeShip(
        this.model.state.selectedShipId,
        action.index,
        this.model.state.orientation,
        this.playerId,
      );
      if (placed && this.mode === '2P' && this._fleetReady()) this._markReady();
      this.render();
      return;
    }
    if (this.model.state.phase !== 'playing' || action.board !== 'target') return;
    if (this.mode === '2P') {
      const result = this.model.fire(action.index, this.playerId);
      if (result.accepted) {
        this._publish({ kind: 'shot', playerId: this.playerId, index: action.index });
        this.render();
      }
      return;
    }

    const result = this.model.fire(action.index, this.playerId);
    if (!result.accepted) return;
    if (this.model.state.phase !== 'finished') {
      const computerIndex = this.model.chooseComputerShot();
      if (computerIndex !== null) this.model.fire(computerIndex, 'p2');
    }
    this.render();
  }

  _startSolo() {
    if (this.mode !== '1P' || this.model.state.phase !== 'setup') return;
    if (!this.model.state.players.p1.ready) return;
    this.model.autoPlace('p2');
    if (this.model.startGame()) this.render();
  }

  _markReady() {
    if (this.readyPlayers.has(this.playerId)) return;
    this.readyPlayers.add(this.playerId);
    this._publish({ kind: 'ready', playerId: this.playerId });
    this._startIfReady();
  }

  _startIfReady() {
    if (this.mode !== '2P' || this.started || !this._fleetReady()) return;
    if (!this.readyPlayers.has('p1') || !this.readyPlayers.has('p2')) return;
    this.started = this.model.startGame();
    if (this.started && this.playerId === 'p1') {
      this._publish({ kind: 'start', playerId: this.playerId });
    }
    this.render();
  }

  _fleetReady() {
    const ships = this.model.state.players[this.playerId].ships;
    return BATTLESHIP_FLEET.every((definition) =>
      ships.some((ship) => ship.id === definition.id && ship.coordinates.length === definition.length),
    );
  }

  _publish(message) {
    if (typeof this.transport?.publish !== 'function') return;
    try {
      const publication = this.transport.publish({ game: 'battleship', ...message });
      if (publication && typeof publication.catch === 'function') {
        publication.catch((error) => this.onError(error));
      }
    } catch (error) {
      this.onError(error);
    }
  }

  _restart() {
    this.model.startNewGame({ mode: this.mode, playerId: this.playerId });
    this.readyPlayers.clear();
    this.started = false;
    if (this.mode === '2P') this._publish({ kind: 'restart', playerId: this.playerId });
    this.render();
  }

  render() {
    this.view.render(this.model.getSnapshot({ privateFor: this.playerId }), this.playerId);
  }
}
