const clone = (value) => JSON.parse(JSON.stringify(value));
const SUITS = Object.freeze(['C', 'D', 'H', 'S']);
const RANKS = Object.freeze(['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']);

function normalizePlayers(players) {
  const input = Array.isArray(players) && players.length ? players : [
    { id: 'p1', name: 'Player 1' },
    { id: 'p2', name: 'Player 2' }
  ];
  if (input.length < 2 || input.length > 8) throw new RangeError('Slapjack requires 2 to 8 players.');
  const result = input.map((player, index) => {
    const id = String(typeof player === 'string' ? player : player?.id ?? `p${index + 1}`).trim();
    if (!id) throw new TypeError('Player ids must be non-empty strings.');
    return { id, name: String(typeof player === 'object' && player?.name ? player.name : `Player ${index + 1}`), hand: [] };
  });
  if (new Set(result.map((player) => player.id)).size !== result.length) throw new RangeError('Slapjack player ids must be unique.');
  return result;
}

function shuffled(values, rng) {
  const result = values.slice();
  for (let index = result.length - 1; index > 0; index -= 1) {
    const sample = Number(rng());
    if (!Number.isFinite(sample) || sample < 0 || sample >= 1) throw new RangeError('Slapjack RNG must return a number in [0, 1).');
    const target = Math.floor(sample * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function nextPlayerWithCards(state, fromPlayerId) {
  const start = state.players.findIndex((player) => player.id === fromPlayerId);
  if (start < 0) return null;
  for (let step = 1; step <= state.players.length; step += 1) {
    const player = state.players[(start + step) % state.players.length];
    if (player.hand.length > 0 && !state.eliminatedIds.includes(player.id)) return player.id;
  }
  return null;
}

function resolveWinner(state) {
  const active = state.players.filter((player) => player.hand.length > 0 && !state.eliminatedIds.includes(player.id));
  if (active.length === 1) {
    state.phase = 'finished';
    state.winnerId = active[0].id;
    state.draw = false;
    state.currentPlayerId = active[0].id;
    active[0].hand.push(...state.pile);
    state.pile = [];
    state.topCard = null;
    return true;
  }
  if (active.length === 0) {
    state.phase = 'finished';
    state.winnerId = null;
    state.draw = true;
    state.currentPlayerId = null;
    return true;
  }
  return false;
}

export class SlapjackModel {
  createGame({ players, rng = Math.random, slapRanks = ['J'], falseSlapPenalty = 1 } = {}) {
    if (typeof rng !== 'function') throw new TypeError('Slapjack RNG must be a function.');
    if (!Number.isInteger(falseSlapPenalty) || falseSlapPenalty < 0 || falseSlapPenalty > 5) {
      throw new RangeError('falseSlapPenalty must be an integer between 0 and 5.');
    }
    if (!Array.isArray(slapRanks) || !slapRanks.length || slapRanks.some((rank) => !RANKS.includes(rank))) {
      throw new TypeError('slapRanks must contain one or more valid card ranks.');
    }
    const seats = normalizePlayers(players);
    const deck = shuffled(SUITS.flatMap((suit) => RANKS.map((rank) => ({ id: `${rank}${suit}`, rank, suit }))), rng);
    seats.forEach((player, index) => {
      player.hand = deck.filter((_, cardIndex) => cardIndex % seats.length === index).reverse();
    });
    return {
      gameType: 'slapjack',
      phase: 'playing',
      players: seats,
      currentPlayerId: seats[0].id,
      pile: [],
      topCard: null,
      windowId: 0,
      windowOpen: false,
      windowClaimed: false,
      falseSlappedPlayerIds: [],
      eliminatedIds: [],
      lastPlayedBy: null,
      winnerId: null,
      draw: false,
      rules: { slapRanks: [...new Set(slapRanks)], falseSlapPenalty },
      playCount: 0,
      lastAction: null
    };
  }

  playCard(game, playerId) {
    if (!this.isValidSnapshot(game) || game.phase !== 'playing' || game.windowOpen
      || playerId !== game.currentPlayerId || game.eliminatedIds.includes(playerId)) return null;
    const playerIndex = game.players.findIndex((seat) => seat.id === playerId);
    if (playerIndex < 0 || !game.players[playerIndex].hand.length) return null;
    const next = clone(game);
    const player = next.players[playerIndex];
    next.topCard = player.hand.pop();
    next.pile.push(next.topCard);
    next.windowId += 1;
    next.windowOpen = true;
    next.windowClaimed = false;
    next.falseSlappedPlayerIds = [];
    next.lastPlayedBy = playerId;
    next.currentPlayerId = nextPlayerWithCards(next, playerId) || playerId;
    next.playCount += 1;
    next.lastAction = { type: 'play', playerId, card: clone(next.topCard), windowId: next.windowId };
    return next;
  }

  canSlap(game) {
    return Boolean(this.isValidSnapshot(game) && game.phase === 'playing' && game.windowOpen
      && !game.windowClaimed && game.topCard && game.rules.slapRanks.includes(game.topCard.rank));
  }

  slap(game, playerId, windowId = game?.windowId) {
    if (!this.isValidSnapshot(game) || game.phase !== 'playing' || !game.windowOpen
      || game.windowClaimed || windowId !== game.windowId
      || !game.players.some((player) => player.id === playerId)
      || game.eliminatedIds.includes(playerId)
      || game.falseSlappedPlayerIds.includes(playerId)) return null;
    const next = clone(game);
    const player = next.players.find((seat) => seat.id === playerId);
    const isValidSlap = next.topCard && next.rules.slapRanks.includes(next.topCard.rank);

    if (isValidSlap) {
      player.hand.push(...next.pile);
      next.pile = [];
      next.windowOpen = false;
      next.windowClaimed = true;
      next.topCard = null;
      next.eliminatedIds = next.eliminatedIds.filter((id) => id !== playerId);
      for (const seat of next.players) {
        if (!seat.hand.length && seat.id !== playerId && !next.eliminatedIds.includes(seat.id)) next.eliminatedIds.push(seat.id);
      }
      next.currentPlayerId = playerId;
      next.lastAction = { type: 'slap', playerId, correct: true, windowId };
      resolveWinner(next);
      return next;
    }

    next.falseSlappedPlayerIds.push(playerId);
    let penaltyCards = 0;
    for (let count = 0; count < next.rules.falseSlapPenalty && player.hand.length > 0; count += 1) {
      next.pile.unshift(player.hand.pop());
      penaltyCards += 1;
    }
    next.lastAction = { type: 'slap', playerId, correct: false, penaltyCards, windowId };
    return next;
  }

  closeSlapWindow(game, windowId = game?.windowId) {
    if (!this.isValidSnapshot(game) || game.phase !== 'playing' || !game.windowOpen || windowId !== game.windowId) return null;
    const next = clone(game);
    next.windowOpen = false;
    next.windowClaimed = true;
    next.falseSlappedPlayerIds = [];
    for (const player of next.players) {
      if (!player.hand.length && !next.eliminatedIds.includes(player.id)) next.eliminatedIds.push(player.id);
    }
    next.lastAction = { type: 'window-closed', windowId };
    if (!resolveWinner(next)) next.currentPlayerId = nextPlayerWithCards(next, next.lastPlayedBy);
    return next;
  }

  getPublicState(game, viewerId) {
    if (!this.isValidSnapshot(game)) return null;
    const snapshot = clone(game);
    snapshot.players = snapshot.players.map((player) => ({
      ...player,
      hand: player.id === viewerId || game.phase === 'finished' ? [...player.hand] : null,
      cardCount: player.hand.length
    }));
    return snapshot;
  }

  isValidSnapshot(game) {
    if (!game || game.gameType !== 'slapjack' || !['playing', 'finished'].includes(game.phase)
      || !Array.isArray(game.players) || game.players.length < 2 || game.players.length > 8
      || new Set(game.players.map((player) => player?.id)).size !== game.players.length
      || !Array.isArray(game.pile) || !Array.isArray(game.eliminatedIds)
      || !game.rules || !Array.isArray(game.rules.slapRanks)
      || !Number.isInteger(game.rules.falseSlapPenalty) || game.rules.falseSlapPenalty < 0
      || game.rules.slapRanks.some((rank) => !RANKS.includes(rank))
      || !Number.isInteger(game.windowId) || game.windowId < 0
      || !Number.isInteger(game.playCount) || game.playCount < 0
      || game.players.some((player) => !player || typeof player.id !== 'string' || !Array.isArray(player.hand))) return false;
    const cards = [...game.pile, ...game.players.flatMap((player) => player.hand)];
    if (cards.length !== 52 || cards.some((card) => !card || !card.id || !RANKS.includes(card.rank) || !SUITS.includes(card.suit))) return false;
    if (new Set(cards.map((card) => card.id)).size !== 52) return false;
    if (game.pile.length ? game.pile[game.pile.length - 1]?.id !== game.topCard?.id : game.topCard !== null) return false;
    if (game.windowOpen && (!game.topCard || !game.pile.length || game.windowClaimed)) return false;
    if (game.phase === 'playing') return game.players.some((player) => player.id === game.currentPlayerId);
    return typeof game.draw === 'boolean' && (game.winnerId === null || game.players.some((player) => player.id === game.winnerId));
  }
}
