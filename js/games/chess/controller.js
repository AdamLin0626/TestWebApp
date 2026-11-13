import { ChessModel, squareIndex } from './model.js';
import { ChessView } from './view.js';

export class ChessController {
  constructor({ root, mode = '1P', playerId = 'p1', transport = null, onError = () => {}, onAction = () => {}, onOutcome = () => {}, t = (value) => value } = {}) {
    if (!root) throw new TypeError('A root element is required');
    this.root = root;
    this.mode = mode;
    this.playerId = playerId;
    this.transport = transport;
    this.onError = onError;
    this.onAction = onAction;
    this.onOutcome = onOutcome;
    this.model = new ChessModel();
    this.view = new ChessView(root, { t });
    this.selectedSquare = null;
    this.pendingPromotion = null;
    this.unsubscribe = null;
    this.aiTimer = null;
    this.started = false;
    this.disposed = false;
  }

  start() {
    if (this.disposed) throw new Error('A disposed chess controller cannot be restarted');
    if (this.started) return this.model.getSnapshot();
    this.started = true;
    this.model.createGame();
    this.view.mountHandlers({
      onSquare: (square) => this.handleSquare(square),
      onPromotion: (piece) => this.handlePromotion(piece),
    });
    this.render();
    if (this.transport?.subscribe) {
      this.unsubscribe = this.transport.subscribe((snapshot) => this.receive(snapshot));
    }
    this.scheduleComputerMove();
    return this.model.getSnapshot();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.aiTimer !== null) clearTimeout(this.aiTimer);
    this.aiTimer = null;
    if (typeof this.unsubscribe === 'function') this.unsubscribe();
    this.unsubscribe = null;
    this.view.dispose();
  }

  receive(snapshot) {
    if (this.disposed || !snapshot) return null;
    try {
      const remotePlayerId = snapshot.remotePlayerId || '';
      const payload = snapshot.snapshot || snapshot;
      const previousFen = this.model.getSnapshot().fen;
      const state = this.model.loadSnapshot(payload);
      if (remotePlayerId && remotePlayerId !== this.playerId && payload.lastMove && state.fen !== previousFen) {
        this.onAction('opponent');
      }
      this.selectedSquare = null;
      this.pendingPromotion = null;
      this.render();
      this.scheduleComputerMove();
      return state;
    } catch (error) {
      this.onError(error);
      return null;
    }
  }

  restart() {
    if (this.disposed) return;
    if (this.aiTimer !== null) clearTimeout(this.aiTimer);
    this.aiTimer = null;
    this.selectedSquare = null;
    this.pendingPromotion = null;
    const snapshot = this.model.createGame();
    this.render();
    this.publish(snapshot);
    this.scheduleComputerMove();
  }

  getPlayerColor() {
    return this.playerId === 'p2' || this.playerId === 'b' ? 'b' : 'w';
  }

  isPlayersTurn() {
    if (this.mode === '1P') return this.model.position.turn === 'w';
    if (!this.transport) return true;
    return this.model.position.turn === this.getPlayerColor();
  }

  handleSquare(square) {
    if (this.disposed || this.model.getSnapshot().status.over || !this.isPlayersTurn() || this.pendingPromotion) return;
    if (this.selectedSquare) {
      const candidates = this.model.getLegalMoves(this.selectedSquare).filter((move) => move.to === square);
      if (candidates.length) {
        if (candidates.some((move) => move.promotion)) {
          this.pendingPromotion = { from: this.selectedSquare, to: square };
          this.render();
          return;
        }
        this.commitMove(this.selectedSquare, square);
        return;
      }
    }
    const piece = this.model.position.board[squareIndex(square)];
    if (piece && (piece === piece.toUpperCase() ? 'w' : 'b') === this.model.position.turn) {
      this.selectedSquare = square;
    } else {
      this.selectedSquare = null;
    }
    this.render();
  }

  handlePromotion(piece) {
    if (!this.pendingPromotion || !['q', 'r', 'b', 'n'].includes(piece)) return;
    this.commitMove(this.pendingPromotion.from, this.pendingPromotion.to, piece);
  }

  commitMove(from, to, promotion) {
    const result = this.model.makeMove(from, to, promotion);
    if (!result) return false;
    this.onAction('self');
    this.selectedSquare = null;
    this.pendingPromotion = null;
    this.render();
    this.publish(result);
    this.scheduleComputerMove();
    return true;
  }

  publish(state) {
    if (typeof this.transport?.publish !== 'function') return;
    try {
      const publication = this.transport.publish(state);
      if (publication && typeof publication.catch === 'function') publication.catch((error) => this.onError(error));
    } catch (error) {
      this.onError(error);
    }
  }

  scheduleComputerMove() {
    if (this.disposed || !this.started || this.mode !== '1P' ||
      this.model.position.turn !== 'b' || this.model.getSnapshot().status.over) return;
    if (this.aiTimer !== null) clearTimeout(this.aiTimer);
    this.aiTimer = setTimeout(() => {
      this.aiTimer = null;
      if (this.disposed || this.model.position.turn !== 'b' || this.model.getSnapshot().status.over) return;
      const move = this.model.chooseComputerMove();
      if (!move) return;
      this.onAction('opponent');
      const state = this.model.getSnapshot();
      this.render();
      this.publish(state);
      this.scheduleComputerMove();
    }, 180);
  }

  render() {
    const state = this.model.getSnapshot();
    state.mode = this.mode;
    state.playerId = this.playerId;
    state.selectedSquare = this.selectedSquare;
    state.promotionPending = Boolean(this.pendingPromotion);
    const legalMoves = this.selectedSquare && this.isPlayersTurn()
      ? this.model.getLegalMoves(this.selectedSquare) : [];
    this.view.render(state, legalMoves);
    this.onOutcome(state);
  }
}

export default ChessController;
