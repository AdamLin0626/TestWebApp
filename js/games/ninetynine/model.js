const clone = (value) => JSON.parse(JSON.stringify(value));
const SUITS = Object.freeze(['C', 'D', 'H', 'S']);
const RANKS = Object.freeze(['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']);

function normalizePlayers(players) {
  const input = Array.isArray(players) && players.length ? players : [
    { id: 'p1', name: 'Player 1' },
    { id: 'p2', name: 'Player 2' }
  ];
  if (input.length < 2 || input.length > 8) throw new RangeError('99 requires 2 to 8 players.');
  const result = input.map((player, index) => {
    const id = String(typeof player === 'string' ? player : player?.id ?? `p${index + 1}`).trim();
    if (!id) throw new TypeError('Player ids must be non-empty strings.');
    return { id, name: String(typeof player === 'object' && player?.name ? player.name : `Player ${index + 1}`), hand: [], lives: 3, eliminated: false };
  });
  if (new Set(result.map((player) => player.id)).size !== result.length) throw new RangeError('99 player ids must be unique.');
  return result;
}

function shuffle(cards, rng) {
  const result = cards.slice();
  for (let index = result.length - 1; index > 0; index -= 1) {
    const sample = Number(rng());
    if (!Number.isFinite(sample) || sample < 0 || sample >= 1) throw new RangeError('99 RNG must return a number in [0, 1).');
    const target = Math.floor(sample * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function createDeck() {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ id: `${rank}${suit}`, rank, suit })));
}

function refillIfNeeded(state, rng) {
  if (!state.drawPile.length && state.discardPile.length) {
    state.drawPile = shuffle(state.discardPile, rng);
    state.discardPile = [];
  }
}

function drawCard(state, rng) {
  refillIfNeeded(state, rng);
  return state.drawPile.pop() ?? null;
}

function nextPlayerIndex(players, fromIndex, direction, steps = 1) {
  let index = fromIndex;
  let remaining = steps;
  while (remaining > 0) {
    let examined = 0;
    do {
      index = (index + direction + players.length) % players.length;
      examined += 1;
    } while (players[index].eliminated && examined < players.length);
    if (players[index].eliminated) return -1;
    remaining -= 1;
  }
  return index;
}

function effectFor(card) {
  if (card.rank === '4') return { type: 'reverse' };
  if (card.rank === '5') return { type: 'skip' };
  if (card.rank === '9') return { type: 'choose' };
  if (card.rank === '10') return { type: 'set', value: 0 };
  if (card.rank === 'K') return { type: 'set', value: 99 };
  if (card.rank === 'J' || card.rank === 'Q') return { type: 'add', value: 10 };
  if (card.rank === 'A') return { type: 'add', value: 1 };
  return { type: 'add', value: Number(card.rank) };
}

export class NinetyNineModel {
  constructor({ rng = Math.random } = {}) {
    if (typeof rng !== 'function') throw new TypeError('99 RNG must be a function.');
    this.rng = rng;
  }

  createGame({ players, handSize = 3, startingTotal = 0, lives = 3, rng = this.rng } = {}) {
    if (typeof rng !== 'function') throw new TypeError('99 RNG must be a function.');
    if (!Number.isInteger(handSize) || handSize < 1 || handSize > 7
      || !Number.isInteger(startingTotal) || startingTotal < 0 || startingTotal > 99
      || !Number.isInteger(lives) || lives < 1 || lives > 10) throw new RangeError('Invalid 99 starting rules.');
    this.rng = rng;
    const seats = normalizePlayers(players);
    if (seats.length * handSize > 52) throw new RangeError('Initial hands cannot exceed the 52-card deck.');
    for (const player of seats) player.lives = lives;
    const deck = shuffle(createDeck(), rng);
    for (let round = 0; round < handSize; round += 1) {
      for (const player of seats) player.hand.push(deck.pop());
    }
    return {
      gameType: 'ninetynine',
      phase: 'playing',
      players: seats,
      drawPile: deck,
      discardPile: [],
      total: startingTotal,
      direction: 1,
      currentPlayerId: seats[0].id,
      handSize,
      startingLives: lives,
      turnCount: 0,
      winnerId: null,
      lastAction: null
    };
  }

  playCard(game, playerId, handIndex, { chosenTotal } = {}) {
    if (!this.isValidSnapshot(game) || game.phase !== 'playing' || playerId !== game.currentPlayerId
      || !Number.isInteger(handIndex) || handIndex < 0) return null;
    const playerIndex = game.players.findIndex((seat) => seat.id === playerId);
    const player = game.players[playerIndex];
    if (!player || player.eliminated || handIndex >= player.hand.length) return null;
    const card = player.hand[handIndex];
    const effect = effectFor(card);
    if (effect.type === 'choose' && (!Number.isInteger(chosenTotal) || chosenTotal < 0 || chosenTotal > 99)) return null;

    const next = clone(game);
    const actor = next.players[playerIndex];
    const playedCard = actor.hand.splice(handIndex, 1)[0];
    const previousTotal = next.total;
    let skipCount = 1;
    let bust = false;

    if (effect.type === 'add') {
      const candidate = next.total + effect.value;
      if (candidate > 99) {
        bust = true;
        actor.lives -= 1;
        if (actor.lives === 0) actor.eliminated = true;
      } else {
        next.total = candidate;
      }
    } else if (effect.type === 'set') {
      next.total = effect.value;
    } else if (effect.type === 'choose') {
      next.total = chosenTotal;
    } else if (effect.type === 'reverse') {
      next.direction *= -1;
    } else if (effect.type === 'skip') {
      skipCount = 2;
    }

    next.discardPile.push(playedCard);
    if (!actor.eliminated) {
      const replacement = drawCard(next, this.rng);
      if (replacement) actor.hand.push(replacement);
    }
    next.turnCount += 1;
    next.lastAction = {
      type: 'play',
      playerId,
      card: clone(playedCard),
      effect: clone(effect),
      previousTotal,
      total: next.total,
      bust,
      livesRemaining: actor.lives,
      direction: next.direction,
      skipCount
    };

    const activePlayers = next.players.filter((seat) => !seat.eliminated);
    if (activePlayers.length <= 1) {
      next.phase = 'finished';
      next.winnerId = activePlayers[0]?.id ?? null;
      next.currentPlayerId = null;
      return next;
    }
    const nextIndex = nextPlayerIndex(next.players, playerIndex, next.direction, skipCount);
    if (nextIndex < 0) return null;
    next.currentPlayerId = next.players[nextIndex].id;
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
    delete snapshot.rng;
    return snapshot;
  }

  isValidSnapshot(game) {
    if (!game || game.gameType !== 'ninetynine' || !['playing', 'finished'].includes(game.phase)
      || !Array.isArray(game.players) || game.players.length < 2 || game.players.length > 8
      || !Array.isArray(game.drawPile) || !Array.isArray(game.discardPile)
      || !Number.isInteger(game.total) || game.total < 0 || game.total > 99
      || ![1, -1].includes(game.direction) || !Number.isInteger(game.handSize) || game.handSize < 1
      || !Number.isInteger(game.turnCount) || game.turnCount < 0
      || game.players.some((player) => !player || typeof player.id !== 'string' || !Array.isArray(player.hand)
        || !Number.isInteger(player.lives) || player.lives < 0 || typeof player.eliminated !== 'boolean'
        || player.eliminated !== (player.lives === 0))) return false;
    const cards = [...game.drawPile, ...game.discardPile, ...game.players.flatMap((player) => player.hand)];
    if (cards.length !== 52 || cards.some((card) => !card || !card.id || !RANKS.includes(card.rank) || !SUITS.includes(card.suit))
      || new Set(cards.map((card) => card.id)).size !== 52) return false;
    if (game.phase === 'playing') return game.players.some((player) => player.id === game.currentPlayerId && !player.eliminated);
    return game.currentPlayerId === null && (game.winnerId === null || game.players.some((player) => player.id === game.winnerId));
  }
}
