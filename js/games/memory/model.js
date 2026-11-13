const SYMBOLS = ['🍓', '🍋', '🍇', '🍉', '🍍', '🥝', '🍒', '🍊'];
const clone = (value) => JSON.parse(JSON.stringify(value));

function normalizePlayers(players = [], localName = 'Player') {
  return [
    { id: 'p1', name: players[0]?.name || localName || 'Player' },
    { id: 'p2', name: players[1]?.name || 'Computer' }
  ];
}

function shuffledDeck() {
  const deck = [...SYMBOLS, ...SYMBOLS];
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[other]] = [deck[other], deck[index]];
  }
  return deck;
}

export class MemoryModel {
  createGame(players = [], { restartAt = Date.now(), localName = 'Player' } = {}) {
    return {
      gameType: 'memory',
      phase: 'playing',
      deck: shuffledDeck(),
      flipped: [],
      matched: [],
      players: normalizePlayers(players, localName),
      scores: { p1: 0, p2: 0 },
      currentPlayerId: 'p1',
      winnerId: null,
      restartAt,
      moveCount: 0
    };
  }

  applyFlip(game, playerId, index) {
    if (!game || game.phase !== 'playing' || game.currentPlayerId !== playerId
      || !Number.isInteger(index) || index < 0 || index >= game.deck.length
      || game.matched.includes(index) || game.flipped.includes(index)) return null;
    const next = clone(game);
    next.flipped.push(index);
    next.moveCount += 1;
    if (next.flipped.length === 2) {
      const [first, second] = next.flipped;
      if (next.deck[first] === next.deck[second]) {
        next.matched.push(first, second);
        next.scores[playerId] += 1;
        next.flipped = [];
        if (next.matched.length === next.deck.length) {
          next.phase = 'finished';
          next.winnerId = next.scores.p1 === next.scores.p2
            ? null : next.scores.p1 > next.scores.p2 ? 'p1' : 'p2';
        }
      } else {
        next.phase = 'mismatch';
      }
    }
    return next;
  }

  hideMismatch(game) {
    if (!game || game.phase !== 'mismatch' || game.flipped.length !== 2) return game;
    const next = clone(game);
    next.flipped = [];
    next.phase = 'playing';
    next.currentPlayerId = next.currentPlayerId === 'p1' ? 'p2' : 'p1';
    next.moveCount += 1;
    return next;
  }

  chooseComputerFlip(game, knownCards = {}) {
    if (!game || game.phase !== 'playing') return null;
    const unavailable = new Set([...game.matched, ...game.flipped]);
    const candidates = game.deck.map((_, index) => index).filter((index) => !unavailable.has(index));
    if (!candidates.length) return null;
    const first = game.flipped[0];
    const known = knownCards instanceof Map ? Object.fromEntries(knownCards) : knownCards;
    if (first !== undefined) {
      const match = candidates.find((index) => known[index] === game.deck[first]);
      if (match !== undefined) return match;
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
    const seen = new Map();
    for (const index of candidates) {
      const symbol = known[index];
      if (!symbol) continue;
      if (seen.has(symbol)) return index;
      seen.set(symbol, index);
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  rememberVisibleCards(game, memory = new Map()) {
    const next = memory instanceof Map ? memory : new Map(Object.entries(memory || {}));
    for (const index of game?.flipped || []) next.set(index, game.deck[index]);
    for (const index of game?.matched || []) next.delete(index);
    return next;
  }

  isValidSnapshot(game) {
    return Boolean(game && game.gameType === 'memory' && Array.isArray(game.deck)
      && game.deck.length === 16 && Array.isArray(game.flipped) && Array.isArray(game.matched)
      && ['playing', 'mismatch', 'finished'].includes(game.phase)
      && ['p1', 'p2'].includes(game.currentPlayerId)
      && Number.isFinite(game.restartAt) && Number.isFinite(game.moveCount));
  }
}
