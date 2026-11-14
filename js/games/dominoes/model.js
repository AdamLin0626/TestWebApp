const clone = (value) => JSON.parse(JSON.stringify(value));
const DEFAULT_PLAYERS = Object.freeze([
  { id: "p1", name: "Player 1" },
  { id: "p2", name: "Player 2" }
]);
const TARGET_SCORE = 150;
const pipSum = (tiles) => tiles.reduce((sum, tile) => sum + tile.a + tile.b, 0);

function makeSet() {
  const tiles = [];
  for (let a = 0; a <= 6; a += 1) {
    for (let b = a; b <= 6; b += 1) tiles.push({ id: `${a}-${b}`, a, b });
  }
  return tiles;
}

function shuffle(items, rng) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(rng() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export class DominoesModel {
  constructor({ rng = Math.random, targetScore = TARGET_SCORE } = {}) {
    if (typeof rng !== "function" || !Number.isInteger(targetScore) || targetScore < 1) {
      throw new TypeError("DominoesModel requires an RNG and positive target score.");
    }
    this.rng = rng;
    this.targetScore = targetScore;
  }

  createGame({ players = DEFAULT_PLAYERS, scores = null, roundNumber = 1, starter = "p1" } = {}) {
    if (!Array.isArray(players) || players.length !== 2 || players[0]?.id !== "p1" || players[1]?.id !== "p2") {
      throw new TypeError("Dominoes requires p1 and p2 seats.");
    }
    const deck = shuffle(makeSet(), this.rng);
    const hands = { p1: deck.splice(0, 7), p2: deck.splice(0, 7) };
    return {
      gameType: "dominoes", phase: "playing", players: clone(players), hands,
      boneyard: deck, chain: [], leftEnd: null, rightEnd: null,
      scores: { p1: Number(scores?.p1) || 0, p2: Number(scores?.p2) || 0 },
      targetScore: this.targetScore, roundNumber, currentPlayerId: starter,
      consecutivePasses: 0, lastAction: null, lastRound: null, winnerId: null
    };
  }

  getPlayableMoves(game, playerId = game?.currentPlayerId) {
    if (!this.isValidSnapshot(game) || game.phase !== "playing" || !["p1", "p2"].includes(playerId)) return [];
    const hand = game.hands[playerId] || [];
    const moves = [];
    for (const tile of hand) {
      for (const side of (game.chain.length === 0 ? ["right"] : ["left", "right"])) {
        if (game.chain.length === 0 || (side === "left" && [tile.a, tile.b].includes(game.leftEnd)) ||
          (side === "right" && [tile.a, tile.b].includes(game.rightEnd))) {
          moves.push({ tileId: tile.id, side });
        }
      }
    }
    return moves;
  }

  playTile(game, playerId, tileId, side = "right") {
    if (!this.isValidSnapshot(game) || game.phase !== "playing" || game.currentPlayerId !== playerId || !["left", "right"].includes(side)) return null;
    if (!this.getPlayableMoves(game, playerId).some((move) => move.tileId === tileId && move.side === side)) return null;
    const next = clone(game);
    const hand = next.hands[playerId];
    const tileIndex = hand.findIndex((tile) => tile.id === tileId);
    const [tile] = hand.splice(tileIndex, 1);
    let placed = { ...tile };
    if (next.chain.length === 0) {
      next.chain.push({ ...placed, placedBy: playerId });
      next.leftEnd = placed.a;
      next.rightEnd = placed.b;
    } else if (side === "left") {
      if (placed.b !== next.leftEnd) placed = { ...placed, a: tile.b, b: tile.a };
      next.chain.unshift({ ...placed, placedBy: playerId });
      next.leftEnd = placed.a;
    } else {
      if (placed.a !== next.rightEnd) placed = { ...placed, a: tile.b, b: tile.a };
      next.chain.push({ ...placed, placedBy: playerId });
      next.rightEnd = placed.b;
    }
    next.consecutivePasses = 0;
    next.lastAction = { type: "play", playerId, tile: placed, side };
    if (!hand.length) return this._finishRound(next, playerId, pipSum(next.hands[playerId === "p1" ? "p2" : "p1"]), "empty");
    next.currentPlayerId = playerId === "p1" ? "p2" : "p1";
    return next;
  }

  drawTile(game, playerId) {
    if (!this.isValidSnapshot(game) || game.phase !== "playing" || game.currentPlayerId !== playerId ||
      !game.boneyard.length || this.getPlayableMoves(game, playerId).length) return null;
    const next = clone(game);
    next.hands[playerId].push(next.boneyard.pop());
    next.lastAction = { type: "draw", playerId };
    return next;
  }

  passTurn(game, playerId) {
    if (!this.isValidSnapshot(game) || game.phase !== "playing" || game.currentPlayerId !== playerId ||
      game.boneyard.length || this.getPlayableMoves(game, playerId).length) return null;
    const next = clone(game);
    next.consecutivePasses += 1;
    next.lastAction = { type: "pass", playerId };
    if (next.consecutivePasses >= 2) {
      const p1 = pipSum(next.hands.p1);
      const p2 = pipSum(next.hands.p2);
      const winnerId = p1 === p2 ? null : p1 < p2 ? "p1" : "p2";
      if (!winnerId) {
        next.lastRound = { winnerId: null, points: 0, reason: "blocked", pips: { p1, p2 } };
        return this._startNextRound(next, "p1");
      }
      return this._finishRound(next, winnerId, Math.abs(p1 - p2), "blocked", { p1, p2 });
    }
    next.currentPlayerId = playerId === "p1" ? "p2" : "p1";
    return next;
  }

  _finishRound(game, winnerId, points, reason, pips = null) {
    const next = clone(game);
    next.consecutivePasses = 0;
    next.scores[winnerId] += points;
    next.lastRound = { winnerId, points, reason, pips: pips || { p1: pipSum(next.hands.p1), p2: pipSum(next.hands.p2) } };
    if (next.scores[winnerId] >= next.targetScore) {
      next.phase = "finished";
      next.currentPlayerId = null;
      next.winnerId = winnerId;
      return next;
    }
    return this._startNextRound(next, winnerId);
  }

  _startNextRound(game, starter) {
    const fresh = this.createGame({ players: game.players, scores: game.scores, roundNumber: game.roundNumber + 1, starter });
    fresh.lastRound = clone(game.lastRound);
    return fresh;
  }

  getPublicState(game, viewerId) {
    if (!this.isValidSnapshot(game) || !["p1", "p2"].includes(viewerId)) return null;
    const snapshot = clone(game);
    snapshot.hands = Object.fromEntries(["p1", "p2"].map((id) => [
      id, id === viewerId ? [...game.hands[id]] : null
    ]));
    snapshot.handCounts = { p1: game.hands.p1.length, p2: game.hands.p2.length };
    return snapshot;
  }

  isValidSnapshot(game) {
    if (!game || game.gameType !== "dominoes" || !["playing", "finished"].includes(game.phase)
      || !Array.isArray(game.players) || game.players.length !== 2 || game.players[0]?.id !== "p1" || game.players[1]?.id !== "p2" || !game.hands
      || !Array.isArray(game.hands.p1) || !Array.isArray(game.hands.p2) || !Array.isArray(game.boneyard)
      || !Array.isArray(game.chain) || !game.scores || !Number.isInteger(game.scores.p1) || game.scores.p1 < 0 || !Number.isInteger(game.scores.p2) || game.scores.p2 < 0
      || !Number.isInteger(game.targetScore) || game.targetScore < 1 || !Number.isInteger(game.roundNumber) || game.roundNumber < 1
      || !Number.isInteger(game.consecutivePasses) || game.consecutivePasses < 0 || game.consecutivePasses > 1) return false;
    const allTiles = [...game.hands.p1, ...game.hands.p2, ...game.boneyard, ...game.chain];
    if (allTiles.length !== 28 || allTiles.some((tile) => !tile || !Number.isInteger(tile.a) || !Number.isInteger(tile.b) ||
      tile.a < 0 || tile.a > 6 || tile.b < 0 || tile.b > 6 || tile.id !== `${Math.min(tile.a, tile.b)}-${Math.max(tile.a, tile.b)}`) ||
      new Set(allTiles.map((tile) => tile.id)).size !== 28) return false;
    if (!game.chain.length && (game.leftEnd !== null || game.rightEnd !== null)) return false;
    if (game.chain.length && (game.leftEnd !== game.chain[0].a || game.rightEnd !== game.chain[game.chain.length - 1].b)) return false;
    if (game.phase === "playing") return ["p1", "p2"].includes(game.currentPlayerId) && !game.winnerId;
    return game.currentPlayerId === null && ["p1", "p2"].includes(game.winnerId);
  }
}
