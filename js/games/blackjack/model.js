const clone = (value) => JSON.parse(JSON.stringify(value));
const SUITS = Object.freeze(['C', 'D', 'H', 'S']);
const RANKS = Object.freeze(['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']);
const DEFAULT_RULES = Object.freeze({
  decks: 6,
  dealerHitsSoft17: false,
  blackjackPayout: 1.5,
  minimumBet: 1,
  maxHands: 4,
  allowDoubleAfterSplit: false,
  splitAcesOneCard: true,
  allowResplitAces: false
});

function normalizePlayers(players, bankroll) {
  const input = Array.isArray(players) && players.length ? players : [{ id: 'p1', name: 'Player 1' }];
  if (input.length > 7) throw new RangeError('Blackjack supports at most 7 players per table.');
  const result = input.map((player, index) => {
    const id = String(typeof player === 'string' ? player : player?.id ?? `p${index + 1}`).trim();
    const chips = typeof player === 'object' && Number.isFinite(player?.bankroll) ? player.bankroll : bankroll;
    if (!id || !Number.isFinite(chips) || chips < 0) throw new TypeError('Each blackjack player needs an id and a non-negative bankroll.');
    return { id, name: String(typeof player === 'object' && player?.name ? player.name : `Player ${index + 1}`), bankroll: chips, hands: [] };
  });
  if (new Set(result.map((player) => player.id)).size !== result.length) throw new RangeError('Blackjack player ids must be unique.');
  return result;
}

function cardValue(card) {
  if (!card || !RANKS.includes(card.rank)) return 0;
  if (card.rank === 'A') return 11;
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  return Number(card.rank);
}

export function calculateHandValue(cards) {
  if (!Array.isArray(cards)) return { total: 0, hardTotal: 0, soft: false, bust: false, natural: false };
  let total = 0;
  let acesAsEleven = 0;
  for (const card of cards) {
    if (!card || !RANKS.includes(card.rank)) throw new TypeError('Blackjack hand contains an invalid card.');
    total += cardValue(card);
    if (card.rank === 'A') acesAsEleven += 1;
  }
  const hardTotal = total - acesAsEleven * 10;
  while (total > 21 && acesAsEleven > 0) {
    total -= 10;
    acesAsEleven -= 1;
  }
  return {
    total,
    hardTotal,
    soft: acesAsEleven > 0,
    bust: total > 21,
    natural: cards.length === 2 && total === 21
  };
}

function makeDeck(deckCount) {
  const cards = [];
  for (let deckIndex = 0; deckIndex < deckCount; deckIndex += 1) {
    for (const suit of SUITS) {
      for (const rank of RANKS) cards.push({ id: `${deckIndex}:${rank}${suit}`, deckIndex, rank, suit });
    }
  }
  return cards;
}

function shuffle(cards, rng) {
  const result = cards.slice();
  for (let index = result.length - 1; index > 0; index -= 1) {
    const sample = Number(rng());
    if (!Number.isFinite(sample) || sample < 0 || sample >= 1) throw new RangeError('Blackjack RNG must return a number in [0, 1).');
    const target = Math.floor(sample * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function normalizeBetInput(bets, playerId) {
  return typeof bets === 'number' ? bets : bets?.[playerId];
}

export class BlackjackModel {
  constructor({ rng = Math.random } = {}) {
    if (typeof rng !== 'function') throw new TypeError('Blackjack RNG must be a function.');
    this.rng = rng;
  }

  createGame({ players, bankroll = 1000, decks = DEFAULT_RULES.decks, rules = {}, rng = this.rng } = {}) {
    if (typeof rng !== 'function') throw new TypeError('Blackjack RNG must be a function.');
    if (!Number.isInteger(decks) || decks < 1 || decks > 8) throw new RangeError('Blackjack shoe must contain 1 to 8 decks.');
    if (!Number.isFinite(bankroll) || bankroll < 0) throw new RangeError('bankroll must be a non-negative number.');
    const mergedRules = { ...DEFAULT_RULES, ...rules, decks };
    if (typeof mergedRules.dealerHitsSoft17 !== 'boolean'
      || typeof mergedRules.splitAcesOneCard !== 'boolean'
      || typeof mergedRules.allowDoubleAfterSplit !== 'boolean'
      || typeof mergedRules.allowResplitAces !== 'boolean'
      || !Number.isFinite(mergedRules.blackjackPayout) || mergedRules.blackjackPayout <= 0
      || !Number.isFinite(mergedRules.minimumBet) || mergedRules.minimumBet <= 0
      || !Number.isInteger(mergedRules.maxHands) || mergedRules.maxHands < 2 || mergedRules.maxHands > 8) {
      throw new TypeError('Invalid blackjack rules.');
    }
    this.rng = rng;
    return {
      gameType: 'blackjack',
      phase: 'betting',
      rules: mergedRules,
      players: normalizePlayers(players, bankroll),
      dealer: { cards: [], holeCardHidden: true, status: 'waiting' },
      shoe: shuffle(makeDeck(decks), rng),
      discardPile: [],
      currentPlayerIndex: -1,
      currentHandIndex: -1,
      roundNumber: 0,
      roundResult: null
    };
  }

  startRound(game, bets = 10) {
    if (!this.isValidSnapshot(game) || !['betting', 'settled'].includes(game.phase)) return null;
    const next = clone(game);
    if (next.phase === 'settled') {
      for (const player of next.players) {
        next.discardPile.push(...player.hands.flatMap((hand) => hand.cards));
        player.hands = [];
      }
      next.discardPile.push(...next.dealer.cards);
      next.dealer = { cards: [], holeCardHidden: true, status: 'waiting' };
    }
    const wagerByPlayer = new Map();
    for (const player of next.players) {
      const wager = normalizeBetInput(bets, player.id);
      if (!Number.isFinite(wager) || !Number.isInteger(wager) || wager < next.rules.minimumBet || wager > player.bankroll) return null;
      wagerByPlayer.set(player.id, wager);
    }

    const requiredCards = next.players.length * 2 + 2;
    if (next.shoe.length < requiredCards) {
      next.shoe = shuffle([...next.shoe, ...next.discardPile], this.rng);
      next.discardPile = [];
    }
    if (next.shoe.length < requiredCards) return null;

    for (const player of next.players) {
      const wager = wagerByPlayer.get(player.id);
      player.bankroll -= wager;
      player.hands = [{ cards: [], bet: wager, status: 'active', doubled: false, fromSplit: false, natural: false, outcome: null }];
    }
    next.dealer = { cards: [], holeCardHidden: true, status: 'dealing' };
    for (const player of next.players) player.hands[0].cards.push(next.shoe.pop());
    next.dealer.cards.push(next.shoe.pop());
    for (const player of next.players) player.hands[0].cards.push(next.shoe.pop());
    next.dealer.cards.push(next.shoe.pop());
    next.roundNumber += 1;
    next.roundResult = null;
    next.phase = 'player-turn';
    next.currentPlayerIndex = 0;
    next.currentHandIndex = 0;

    const dealerNatural = calculateHandValue(next.dealer.cards).natural;
    for (const player of next.players) {
      const hand = player.hands[0];
      hand.natural = calculateHandValue(hand.cards).natural;
      if (hand.natural) hand.status = 'blackjack';
    }
    const activeHand = this._findActiveHand(next, 0, 0);
    if (dealerNatural || !activeHand) {
      next.phase = 'dealer-turn';
      this._settleRound(next, { dealerNatural });
    } else {
      next.currentPlayerIndex = activeHand.playerIndex;
      next.currentHandIndex = activeHand.handIndex;
    }
    return next;
  }

  hit(game, playerId) {
    const current = this._currentHand(game, playerId);
    if (!current || current.hand.status !== 'active') return null;
    const next = clone(game);
    const hand = next.players[current.playerIndex].hands[current.handIndex];
    const card = next.shoe.pop();
    if (!card) return null;
    hand.cards.push(card);
    const value = calculateHandValue(hand.cards);
    if (value.bust) hand.status = 'busted';
    else if (value.total === 21) hand.status = 'stood';
    if (hand.status !== 'active') this._advance(next, current.playerIndex, current.handIndex);
    return next;
  }

  stand(game, playerId) {
    const current = this._currentHand(game, playerId);
    if (!current || current.hand.status !== 'active') return null;
    const next = clone(game);
    next.players[current.playerIndex].hands[current.handIndex].status = 'stood';
    this._advance(next, current.playerIndex, current.handIndex);
    return next;
  }

  canSplit(game, playerId) {
    const current = this._currentHand(game, playerId);
    if (!current || current.hand.status !== 'active' || current.hand.cards.length !== 2) return false;
    const player = game.players[current.playerIndex];
    if (player.hands.length >= game.rules.maxHands || player.bankroll < current.hand.bet) return false;
    const [first, second] = current.hand.cards;
    if (cardValue(first) !== cardValue(second)) return false;
    const splitAces = first.rank === 'A';
    return !splitAces || !current.hand.fromSplit || game.rules.allowResplitAces;
  }

  split(game, playerId) {
    if (!this.canSplit(game, playerId)) return null;
    const current = this._currentHand(game, playerId);
    const next = clone(game);
    const player = next.players[current.playerIndex];
    const original = player.hands[current.handIndex];
    const splitAces = original.cards[0].rank === 'A';
    const extraBet = original.bet;
    if (player.bankroll < extraBet) return null;
    player.bankroll -= extraBet;
    const firstCard = original.cards[0];
    const secondCard = original.cards[1];
    const firstDraw = next.shoe.pop();
    const secondDraw = next.shoe.pop();
    if (!firstDraw || !secondDraw) return null;
    const firstHand = { ...original, cards: [firstCard, firstDraw], status: 'active', doubled: false, fromSplit: true, natural: false, outcome: null };
    const secondHand = { ...original, cards: [secondCard, secondDraw], status: 'active', doubled: false, fromSplit: true, natural: false, outcome: null };
    if (splitAces && next.rules.splitAcesOneCard) {
      firstHand.status = 'stood';
      secondHand.status = 'stood';
    }
    player.hands.splice(current.handIndex, 1, firstHand, secondHand);
    if (firstHand.status !== 'active') this._advance(next, current.playerIndex, current.handIndex);
    return next;
  }

  canDouble(game, playerId) {
    const current = this._currentHand(game, playerId);
    if (!current || current.hand.status !== 'active' || current.hand.cards.length !== 2) return false;
    const player = game.players[current.playerIndex];
    return player.bankroll >= current.hand.bet && (!current.hand.fromSplit || game.rules.allowDoubleAfterSplit);
  }

  doubleDown(game, playerId) {
    if (!this.canDouble(game, playerId)) return null;
    const current = this._currentHand(game, playerId);
    const next = clone(game);
    const player = next.players[current.playerIndex];
    const hand = player.hands[current.handIndex];
    player.bankroll -= hand.bet;
    hand.bet *= 2;
    hand.doubled = true;
    const card = next.shoe.pop();
    if (!card) return null;
    hand.cards.push(card);
    hand.status = calculateHandValue(hand.cards).bust ? 'busted' : 'stood';
    this._advance(next, current.playerIndex, current.handIndex);
    return next;
  }

  getCurrentHand(game) {
    const current = this._currentHand(game);
    return current ? clone(current.hand) : null;
  }

  getPublicState(game) {
    if (!this.isValidSnapshot(game)) return null;
    const snapshot = clone(game);
    if (snapshot.dealer.holeCardHidden && snapshot.dealer.cards.length > 1) {
      snapshot.dealer.cards[1] = { hidden: true };
    }
    return snapshot;
  }

  isValidSnapshot(game) {
    if (!game || game.gameType !== 'blackjack' || !['betting', 'player-turn', 'dealer-turn', 'settled'].includes(game.phase)
      || !game.rules || !Number.isInteger(game.rules.decks) || game.rules.decks < 1
      || !Array.isArray(game.players) || !game.players.length || !Array.isArray(game.shoe) || !Array.isArray(game.discardPile)
      || !game.dealer || !Array.isArray(game.dealer.cards)
      || game.players.some((player) => !player || typeof player.id !== 'string' || !Number.isFinite(player.bankroll)
        || player.bankroll < 0 || !Array.isArray(player.hands)
        || player.hands.some((hand) => !hand || !Array.isArray(hand.cards) || !Number.isFinite(hand.bet) || hand.bet <= 0))) return false;
    const cards = [
      ...game.shoe,
      ...game.discardPile,
      ...game.dealer.cards,
      ...game.players.flatMap((player) => player.hands.flatMap((hand) => hand.cards))
    ];
    if (cards.length !== game.rules.decks * 52 || cards.some((card) => !card || !card.id || !RANKS.includes(card.rank) || !SUITS.includes(card.suit))) return false;
    if (new Set(cards.map((card) => card.id)).size !== cards.length) return false;
    if (game.phase === 'player-turn') {
      const current = game.players[game.currentPlayerIndex]?.hands[game.currentHandIndex];
      return Boolean(current && current.status === 'active');
    }
    return true;
  }

  _currentHand(game, playerId) {
    if (!this.isValidSnapshot(game) || game.phase !== 'player-turn') return null;
    const player = game.players[game.currentPlayerIndex];
    if (!player || (playerId !== undefined && player.id !== playerId)) return null;
    const hand = player.hands[game.currentHandIndex];
    return hand ? { playerIndex: game.currentPlayerIndex, handIndex: game.currentHandIndex, hand } : null;
  }

  _findActiveHand(game, startPlayerIndex, startHandIndex) {
    const playerCount = game.players.length;
    for (let playerOffset = 0; playerOffset < playerCount; playerOffset += 1) {
      const playerIndex = (startPlayerIndex + playerOffset) % playerCount;
      const player = game.players[playerIndex];
      const handStart = playerIndex === startPlayerIndex ? startHandIndex : 0;
      for (let handIndex = handStart; handIndex < player.hands.length; handIndex += 1) {
        if (player.hands[handIndex].status === 'active') return { playerIndex, handIndex };
      }
    }
    return null;
  }

  _advance(game, playerIndex, handIndex) {
    const active = this._findActiveHand(game, playerIndex, handIndex + 1);
    if (active) {
      game.currentPlayerIndex = active.playerIndex;
      game.currentHandIndex = active.handIndex;
      return;
    }
    game.phase = 'dealer-turn';
    this._settleRound(game);
  }

  _settleRound(game, { dealerNatural = false } = {}) {
    const playerCanWin = game.players.some((player) => player.hands.some((hand) => !['busted', 'blackjack'].includes(hand.status)));
    if (!dealerNatural && playerCanWin) {
      while (true) {
        const dealerValue = calculateHandValue(game.dealer.cards);
        if (dealerValue.total > 17 || (dealerValue.total === 17 && (!dealerValue.soft || !game.rules.dealerHitsSoft17))) break;
        if (dealerValue.total === 17 && !game.rules.dealerHitsSoft17) break;
        const card = game.shoe.pop();
        if (!card) break;
        game.dealer.cards.push(card);
      }
    }
    const dealerValue = calculateHandValue(game.dealer.cards);
    const dealerHasNatural = calculateHandValue(game.dealer.cards).natural;
    game.dealer.holeCardHidden = false;
    game.dealer.status = dealerValue.bust ? 'busted' : 'stood';
    const results = [];

    for (const player of game.players) {
      for (const hand of player.hands) {
        const value = calculateHandValue(hand.cards);
        let outcome = 'loss';
        if (hand.status === 'busted' || value.bust) outcome = 'loss';
        else if (hand.natural) outcome = dealerHasNatural ? 'push' : 'blackjack';
        else if (dealerHasNatural) outcome = 'loss';
        else if (dealerValue.bust || value.total > dealerValue.total) outcome = 'win';
        else if (value.total === dealerValue.total) outcome = 'push';
        if (outcome === 'win') player.bankroll += hand.bet * 2;
        else if (outcome === 'push') player.bankroll += hand.bet;
        else if (outcome === 'blackjack') player.bankroll += hand.bet * (1 + game.rules.blackjackPayout);
        hand.status = 'settled';
        hand.outcome = outcome;
        results.push({ playerId: player.id, bet: hand.bet, total: value.total, outcome });
      }
    }
    game.phase = 'settled';
    game.currentPlayerIndex = -1;
    game.currentHandIndex = -1;
    game.roundResult = { dealerTotal: dealerValue.total, dealerBust: dealerValue.bust, dealerNatural: dealerHasNatural, hands: results };
  }
}
