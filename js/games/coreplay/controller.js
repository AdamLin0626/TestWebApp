import { SudokuModel } from "../sudoku/model.js";
import { MancalaModel } from "../mancala/model.js";
import { SlapjackModel } from "../slapjack/model.js";
import { BlackjackModel } from "../blackjack/model.js";
import { LiarsDiceModel } from "../liarsdice/model.js";
import { NinetyNineModel } from "../ninetynine/model.js";
import { CorePlayView } from "./view.js";

const MODEL_FACTORIES = Object.freeze({
  sudoku: () => new SudokuModel(),
  mancala: () => new MancalaModel(),
  slapjack: () => new SlapjackModel(),
  blackjack: () => new BlackjackModel(),
  liarsdice: () => new LiarsDiceModel(),
  ninetynine: () => new NinetyNineModel()
});
const PRIVATE_GAMES = new Set(["slapjack", "liarsdice", "ninetynine"]);
const clone = (value) => JSON.parse(JSON.stringify(value));

export class CorePlayController {
  constructor({
    gameType,
    root,
    mode = "1P",
    playerId = "p1",
    playerName = "Player",
    players = [],
    transport = null,
    onAction = () => {},
    onOutcome = () => {},
    onError = () => {},
    t = (source) => source
  } = {}) {
    if (!MODEL_FACTORIES[gameType]) throw new RangeError(`Unsupported core game: ${gameType}`);
    if (!root || !["1P", "2P"].includes(mode) || !["p1", "p2"].includes(playerId)) {
      throw new TypeError("CorePlayController requires a root, a mode and a player seat.");
    }
    if (mode === "2P" && (!transport || typeof transport.subscribe !== "function" || typeof transport.publish !== "function")) {
      throw new TypeError("2P CorePlayController requires a room transport.");
    }
    if (mode === "2P" && PRIVATE_GAMES.has(gameType) && typeof transport.publishPrivate !== "function") {
      throw new TypeError("This 2P game requires private snapshot transport.");
    }
    this.gameType = gameType;
    this.model = MODEL_FACTORIES[gameType]();
    this.root = root;
    this.mode = mode;
    this.playerId = playerId;
    this.playerName = playerName;
    this.transport = transport;
    this.onAction = onAction;
    this.onOutcome = onOutcome;
    this.onError = onError;
    this.difficulty = "medium";
    this.engine = null;
    this.remoteEngine = null;
    this.players = [];
    this.sudokuTurn = "p1";
    this.sudokuWinner = "";
    this.version = 0;
    this.epoch = 0;
    this.lastActorId = "";
    this.pending = false;
    this.disposed = false;
    this.outcomeEpoch = 0;
    this.windowTimer = 0;
    this.windowTimerId = 0;
    this.aiTimer = 0;
    this.aiSlapTimer = 0;
    this.aiSlapWindowId = 0;
    this.unsubscribe = null;
    this.view = new CorePlayView(root, gameType, {
      setSudokuValue: (index, value) => this.setSudokuValue(index, value),
      hint: (index) => this.hint(index),
      changeDifficulty: (difficulty) => this.changeDifficulty(difficulty),
      movePit: (pitIndex) => this.movePit(pitIndex),
      playCard: () => this.playCard(),
      slap: (windowId) => this.slap(windowId),
      blackjackAction: (action) => this.blackjackAction(action),
      bid: (quantity, face) => this.bid(quantity, face),
      challenge: () => this.challenge(),
      playNinetyNine: (handIndex, chosenTotal) => this.playNinetyNine(handIndex, chosenTotal)
    }, t);
    this.players = this._makeSeats(players);
  }

  _makeSeats(roomPlayers = []) {
    const bySeat = this.mode === "2P" ? roomPlayers : [];
    const first = bySeat[0];
    const second = bySeat[1];
    return [
      { id: "p1", name: this.mode === "1P" ? this.playerName : first?.name || "Player 1" },
      { id: "p2", name: this.mode === "1P" ? "Computer" : second?.name || "Player 2" }
    ];
  }

  start() {
    if (this.mode === "2P") this.unsubscribe = this.transport.subscribe((message) => this.receive(message));
    if (this.mode === "2P" && this.playerId !== "p1") {
      this._render(true);
      return this;
    }
    this.restart();
    return this;
  }

  _newEngine() {
    const seats = this.gameType === "blackjack" && this.mode === "1P" ? [this.players[0]] : this.players;
    if (this.gameType === "sudoku") return this.model.createGame({ difficulty: this.difficulty });
    if (this.gameType === "mancala") return this.model.createGame({ players: seats });
    if (this.gameType === "slapjack") return this.model.createGame({ players: seats });
    if (this.gameType === "blackjack") return this.model.createGame({ players: seats });
    if (this.gameType === "liarsdice") return this.model.createGame({ players: seats });
    return this.model.createGame({ players: seats });
  }

  restart() {
    if (this.disposed || (this.mode === "2P" && this.playerId !== "p1")) return false;
    this._clearTimers();
    const previousEpoch = this.epoch;
    this.engine = this._newEngine();
    this.remoteEngine = null;
    this.sudokuTurn = "p1";
    this.sudokuWinner = "";
    this.pending = false;
    this.lastActorId = "";
    this.epoch = Math.max(Date.now(), previousEpoch + 1);
    this.version = 1;
    this.outcomeEpoch = 0;
    this._render();
    if (this.mode === "2P") this._publishState("");
    this._scheduleAfterState();
    return true;
  }

  changeDifficulty(difficulty) {
    if (this.gameType !== "sudoku" || this.mode !== "1P" || !["easy", "medium", "hard", "expert"].includes(difficulty)) return false;
    if (difficulty === this.difficulty) return true;
    this.difficulty = difficulty;
    return this.restart();
  }

  setSudokuValue(index, value) {
    return this._sendAction("sudoku-value", { index, value });
  }

  hint(index) {
    if (this.gameType !== "sudoku" || this.mode !== "1P" || !this.engine || this.pending) return false;
    const solution = this.model.solve(this.engine.grid);
    const value = solution?.[index];
    if (!Number.isInteger(value) || value < 1 || value > 9) {
      this.onError(new Error("A hint is unavailable while the grid contains conflicts."));
      return false;
    }
    return this._applyAction("sudoku-value", { index, value }, this.playerId);
  }

  movePit(pitIndex) { return this._sendAction("mancala-move", { pitIndex }); }
  playCard() { return this._sendAction("slapjack-play", {}); }
  slap(windowId) { return this._sendAction("slapjack-slap", { windowId }); }
  blackjackAction(action) { return this._sendAction(`blackjack-${action}`, {}); }
  bid(quantity, face) { return this._sendAction("liars-bid", { quantity, face }); }
  challenge() { return this._sendAction("liars-challenge", {}); }
  playNinetyNine(handIndex, chosenTotal) { return this._sendAction("ninetynine-play", { handIndex, chosenTotal }); }

  _sendAction(action, data) {
    const visibleEngine = this._displayEngine();
    if (this.disposed || !visibleEngine || this.pending || visibleEngine.phase === "finished") return false;
    if (this.mode === "2P" && this.playerId === "p2") {
      this.pending = true;
      this._render();
      Promise.resolve(this.transport.publish({
        kind: "action",
        epoch: this.epoch,
        version: this.version,
        actorId: this.playerId,
        action,
        data,
        retain: false
      })).catch((error) => {
        this.pending = false;
        this._render();
        this.onError(error);
      });
      return true;
    }
    return this._applyAction(action, data, this.playerId);
  }

  _applyAction(action, data, actorId, internal = false) {
    if (!this.engine || this.engine.phase === "finished") return false;
    const active = this._activePlayer();
    if (action !== "slapjack-slap" && action !== "slapjack-close" && action !== "blackjack-deal" && actorId !== active) return false;
    if (this.gameType === "sudoku" && action === "sudoku-value") {
      const next = this.model.setValue(this.engine, data.index, data.value);
      if (!next) return false;
      this.engine = next;
      if (next.phase === "finished") this.sudokuWinner = actorId || this.playerId;
      else if (this.mode === "2P") this.sudokuTurn = actorId === "p1" ? "p2" : "p1";
      this._commit(actorId);
      return true;
    }

    let next = null;
    if (this.gameType === "mancala" && action === "mancala-move") {
      next = this.model.applyMove(this.engine, actorId, data.pitIndex);
    } else if (this.gameType === "slapjack") {
      if (action === "slapjack-play") next = this.model.playCard(this.engine, actorId);
      else if (action === "slapjack-slap") next = this.model.slap(this.engine, actorId, data.windowId);
      else if (action === "slapjack-close" && internal) next = this.model.closeSlapWindow(this.engine, data.windowId);
    } else if (this.gameType === "blackjack") {
      if (action === "blackjack-deal" && actorId === "p1" && this.engine.phase === "betting") {
        next = this.model.startRound(this.engine, this.engine.rules.minimumBet);
      } else if (action === "blackjack-hit") next = this.model.hit(this.engine, actorId);
      else if (action === "blackjack-stand") next = this.model.stand(this.engine, actorId);
      else if (action === "blackjack-split") next = this.model.split(this.engine, actorId);
      else if (action === "blackjack-double") next = this.model.doubleDown(this.engine, actorId);
    } else if (this.gameType === "liarsdice") {
      if (action === "liars-bid") next = this.model.placeBid(this.engine, actorId, data.quantity, data.face);
      else if (action === "liars-challenge") next = this.model.challenge(this.engine, actorId);
    } else if (this.gameType === "ninetynine" && action === "ninetynine-play") {
      next = this.model.playCard(this.engine, actorId, data.handIndex, { chosenTotal: data.chosenTotal });
    }
    if (!next) return false;
    this.engine = next;
    this._commit(actorId);
    return true;
  }

  _commit(actorId) {
    this.pending = false;
    this.lastActorId = actorId || "";
    this.version += 1;
    this._render();
    if (actorId) this.onAction(actorId === this.playerId ? "self" : "opponent");
    if (this.mode === "2P" && this.playerId === "p1") this._publishState(actorId || "");
    this._resolveOutcome();
    this._scheduleAfterState();
  }

  _activePlayer(engine = this.engine) {
    if (!engine) return "";
    if (this.gameType === "sudoku") return this.sudokuTurn;
    if (this.gameType === "blackjack") {
      return engine.phase === "player-turn" ? engine.players[engine.currentPlayerIndex]?.id || "" : "";
    }
    return engine.currentPlayerId || "";
  }

  _publicState(viewerId = this.playerId) {
    if (!this.engine) return null;
    if (this.gameType === "sudoku") {
      const { solution, ...publicState } = this.engine;
      return {
        ...publicState,
        currentPlayerId: this.sudokuTurn,
        winnerId: this.sudokuWinner || null,
        players: this.players.map((player) => ({ ...player }))
      };
    }
    if (typeof this.model.getPublicState === "function") {
      return this.model.getPublicState(this.engine, viewerId) || clone(this.engine);
    }
    return clone(this.engine);
  }

  _publishState(actorId) {
    if (!this.transport || this.mode !== "2P" || this.playerId !== "p1") return;
    const message = {
      kind: "state",
      epoch: this.epoch,
      version: this.version,
      actorId,
      state: this._publicState("p2"),
      retain: true
    };
    const pending = PRIVATE_GAMES.has(this.gameType)
      ? this.transport.publishPrivate("p2", message)
      : this.transport.publish(message);
    Promise.resolve(pending).catch((error) => this.onError(error));
  }

  receive(message) {
    if (this.disposed || this.mode !== "2P" || !message || typeof message !== "object") return false;
    if (message.remotePlayerId === this.playerId) return false;
    if (this.playerId === "p1" && message.kind === "action" && message.remotePlayerId === "p2") {
      if (message.actorId !== "p2" || message.epoch !== this.epoch || message.version !== this.version) {
        this._publishState("");
        this._publishAck();
        return false;
      }
      const accepted = this._applyAction(message.action, message.data || {}, "p2");
      if (!accepted) this._publishAck();
      return accepted;
    }
    if (this.playerId === "p2" && message.kind === "ack" && message.remotePlayerId === "p1" &&
      message.epoch === this.epoch && message.version === this.version) {
      this.pending = false;
      this._render();
      return true;
    }
    if (this.playerId !== "p2" || message.kind !== "state" || message.remotePlayerId !== "p1") return false;
    if (PRIVATE_GAMES.has(this.gameType) !== Boolean(message.privateSnapshot)) return false;
    if (!Number.isSafeInteger(message.epoch) || !Number.isSafeInteger(message.version) || !message.state) return false;
    if (message.epoch < this.epoch || (message.epoch === this.epoch && message.version <= this.version)) return false;
    if (message.epoch > this.epoch && message.version < 1) return false;
    this.epoch = message.epoch;
    this.version = message.version;
    this.remoteEngine = message.state;
    if (this.gameType === "sudoku") {
      this.sudokuTurn = message.state.currentPlayerId || this.sudokuTurn;
      this.sudokuWinner = message.state.winnerId || "";
    }
    this.pending = false;
    this._render();
    if (message.actorId) this.onAction(message.actorId === this.playerId ? "self" : "opponent");
    this._resolveOutcome(this.remoteEngine);
    return true;
  }

  _publishAck() {
    if (!this.transport || this.playerId !== "p1") return;
    Promise.resolve(this.transport.publish({
      kind: "ack",
      actorId: "p1",
      epoch: this.epoch,
      version: this.version,
      retain: false
    })).catch((error) => this.onError(error));
  }

  _displayEngine() {
    if (this.mode === "2P" && this.playerId === "p2") return this.remoteEngine;
    return this._publicState(this.playerId);
  }

  _render(waiting = false) {
    const engine = waiting ? null : this._displayEngine();
    if (!engine) {
      this.view.render({ waiting, engine: null, gameType: this.gameType, mode: this.mode, playerId: this.playerId, playerName: this.playerName });
      return;
    }
    this.view.render({
      gameType: this.gameType,
      mode: this.mode,
      playerId: this.playerId,
      playerName: this.playerName,
      players: this.players,
      engine,
      activePlayerId: this.gameType === "sudoku" ? engine.currentPlayerId || this.sudokuTurn : this._activePlayer(engine),
      pending: this.pending,
      difficulty: this.difficulty
    });
  }

  _resolveOutcome(engine = this.engine) {
    if (!engine || this.outcomeEpoch === this.epoch) return;
    let winnerId = "";
    let draw = false;
    let finished = engine.phase === "finished";
    if (this.gameType === "sudoku" && finished) {
      winnerId = engine.winnerId || this.sudokuWinner || "p1";
    } else if (this.gameType === "blackjack" && engine.phase === "settled") {
      finished = true;
      if (this.mode === "1P") {
        const outcomes = engine.roundResult?.hands?.filter((hand) => hand.playerId === "p1").map((hand) => hand.outcome) || [];
        const wins = outcomes.filter((outcome) => ["win", "blackjack"].includes(outcome)).length;
        const losses = outcomes.filter((outcome) => outcome === "loss").length;
        winnerId = wins === losses ? "" : wins > losses ? "p1" : "p2";
        draw = !winnerId;
      } else {
        const ranked = [...engine.players].sort((left, right) => right.bankroll - left.bankroll);
        draw = ranked.length > 1 && ranked[0].bankroll === ranked[1].bankroll;
        winnerId = draw ? "" : ranked[0]?.id || "";
      }
    } else if (finished) {
      winnerId = engine.winnerId || "";
      draw = Boolean(engine.draw) || !winnerId;
    }
    if (!finished) return;
    this.outcomeEpoch = this.epoch;
    const snapshot = {
      ...engine,
      phase: "finished",
      winnerId: winnerId || null,
      draw,
      restartAt: this.epoch,
      moveCount: this.version
    };
    this.onOutcome(snapshot);
  }

  _scheduleAfterState() {
    if (this.disposed || !this.engine || this.engine.phase === "finished") {
      this._clearTimers();
      return;
    }
    if (this.gameType === "blackjack" && this.engine.phase === "settled") {
      this._resolveOutcome();
      return;
    }
    if (this.gameType === "slapjack") {
      if (this.engine.windowOpen) {
        if (this.windowTimerId !== this.engine.windowId) {
          if (this.windowTimer) clearTimeout(this.windowTimer);
          this.windowTimerId = this.engine.windowId;
          const windowId = this.engine.windowId;
          this.windowTimer = setTimeout(() => {
            this.windowTimer = 0;
            this._applyAction("slapjack-close", { windowId }, "", true);
          }, 850);
        }
        if (this.mode === "1P" && this.model.canSlap(this.engine) && this.aiSlapWindowId !== this.engine.windowId) {
          this.aiSlapWindowId = this.engine.windowId;
          const windowId = this.engine.windowId;
          this.aiSlapTimer = setTimeout(() => {
            this.aiSlapTimer = 0;
            if (!this.disposed && this.engine?.windowOpen && this.engine.windowId === windowId && this.model.canSlap(this.engine)) {
              this._applyAction("slapjack-slap", { windowId }, "p2", true);
            }
          }, 260);
        }
        return;
      }
      if (this.windowTimer) clearTimeout(this.windowTimer);
      if (this.aiSlapTimer) clearTimeout(this.aiSlapTimer);
      this.windowTimer = 0;
      this.aiSlapTimer = 0;
      this.windowTimerId = 0;
      this.aiSlapWindowId = 0;
    }
    if (this.mode !== "1P" || this._activePlayer() !== "p2" || this.aiTimer) return;
    const epoch = this.epoch;
    this.aiTimer = setTimeout(() => {
      this.aiTimer = 0;
      if (this.disposed || this.epoch !== epoch || this._activePlayer() !== "p2") return;
      const move = this._computerMove();
      if (move) this._applyAction(move.action, move.data, "p2", true);
    }, 480);
  }

  _computerMove() {
    if (this.gameType === "mancala") {
      const moves = this.model.getValidMoves(this.engine, "p2");
      let best = null;
      for (const pitIndex of moves) {
        const next = this.model.applyMove(this.engine, "p2", pitIndex);
        const score = (next.board[13] - this.engine.board[13]) + next.lastMove.captured * 1.4 + (next.currentPlayerId === "p2" ? 5 : 0);
        if (!best || score > best.score) best = { action: "mancala-move", data: { pitIndex }, score };
      }
      return best;
    }
    if (this.gameType === "liarsdice") {
      const bid = this.engine.currentBid;
      if (!bid) return { action: "liars-bid", data: { quantity: 1, face: 3 } };
      const total = this.model.totalDice(this.engine);
      const actual = this.model.countBid(this.engine, bid);
      if (actual < bid.quantity || bid.quantity >= total && bid.face >= 6) {
        return { action: "liars-challenge", data: {} };
      }
      const quantity = bid.face >= 6 ? bid.quantity + 1 : bid.quantity;
      const face = bid.face >= 6 ? 1 : bid.face + 1;
      if (quantity > total) return { action: "liars-challenge", data: {} };
      return { action: "liars-bid", data: { quantity, face } };
    }
    if (this.gameType === "ninetynine") {
      const player = this.engine.players.find((seat) => seat.id === "p2");
      const candidates = [];
      for (let handIndex = 0; handIndex < (player?.hand?.length || 0); handIndex += 1) {
        const next = this.model.playCard(this.engine, "p2", handIndex, { chosenTotal: 99 });
        if (!next) continue;
        const savedLife = next.lastAction?.bust ? -100 : 0;
        const sameTurn = next.currentPlayerId === "p2" ? 8 : 0;
        candidates.push({ action: "ninetynine-play", data: { handIndex, chosenTotal: 99 }, score: savedLife + sameTurn + next.total / 100 });
      }
      candidates.sort((left, right) => right.score - left.score);
      return candidates[0] || null;
    }
    return null;
  }

  _clearTimers() {
    if (this.windowTimer) clearTimeout(this.windowTimer);
    if (this.aiTimer) clearTimeout(this.aiTimer);
    if (this.aiSlapTimer) clearTimeout(this.aiSlapTimer);
    this.windowTimer = 0;
    this.aiTimer = 0;
    this.aiSlapTimer = 0;
    this.windowTimerId = 0;
    this.aiSlapWindowId = 0;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this._clearTimers();
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.view.dispose();
  }
}
