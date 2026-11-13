const clone = (value) => JSON.parse(JSON.stringify(value));

function normalizePlayers(players) {
  const input = Array.isArray(players) && players.length ? players : [
    { id: 'p1', name: 'Player 1' },
    { id: 'p2', name: 'Player 2' }
  ];
  if (input.length < 2 || input.length > 10) throw new RangeError('Liar\'s Dice requires 2 to 10 players.');
  const result = input.map((player, index) => {
    const id = String(typeof player === 'string' ? player : player?.id ?? `p${index + 1}`).trim();
    if (!id) throw new TypeError('Player ids must be non-empty strings.');
    return { id, name: String(typeof player === 'object' && player?.name ? player.name : `Player ${index + 1}`), diceCount: 0, dice: [] };
  });
  if (new Set(result.map((player) => player.id)).size !== result.length) throw new RangeError('Liar\'s Dice player ids must be unique.');
  return result;
}

function rollDice(count, rng) {
  const dice = [];
  for (let index = 0; index < count; index += 1) {
    const sample = Number(rng());
    if (!Number.isFinite(sample) || sample < 0 || sample >= 1) throw new RangeError('Liar\'s Dice RNG must return a number in [0, 1).');
    dice.push(1 + Math.floor(sample * 6));
  }
  return dice;
}

function nextActivePlayer(players, fromPlayerId) {
  const start = players.findIndex((player) => player.id === fromPlayerId);
  if (start < 0) return null;
  for (let step = 1; step <= players.length; step += 1) {
    const player = players[(start + step) % players.length];
    if (player.diceCount > 0) return player.id;
  }
  return null;
}

export class LiarsDiceModel {
  constructor({ rng = Math.random } = {}) {
    if (typeof rng !== 'function') throw new TypeError('Liar\'s Dice RNG must be a function.');
    this.rng = rng;
  }

  createGame({ players, dicePerPlayer = 5, onesWild = false, rng = this.rng } = {}) {
    if (typeof rng !== 'function') throw new TypeError('Liar\'s Dice RNG must be a function.');
    if (!Number.isInteger(dicePerPlayer) || dicePerPlayer < 1 || dicePerPlayer > 10) {
      throw new RangeError('dicePerPlayer must be an integer between 1 and 10.');
    }
    if (typeof onesWild !== 'boolean') throw new TypeError('onesWild must be a boolean.');
    this.rng = rng;
    const seats = normalizePlayers(players);
    for (const player of seats) {
      player.diceCount = dicePerPlayer;
      player.dice = rollDice(dicePerPlayer, rng);
    }
    return {
      gameType: 'liarsdice',
      phase: 'bidding',
      players: seats,
      currentPlayerId: seats[0].id,
      currentBid: null,
      lastBidderId: null,
      round: 1,
      onesWild,
      moveCount: 0,
      lastRound: null,
      history: []
    };
  }

  placeBid(game, playerId, quantity, face) {
    if (!this.isValidSnapshot(game) || game.phase !== 'bidding' || playerId !== game.currentPlayerId
      || !Number.isInteger(quantity) || quantity < 1 || quantity > this.totalDice(game)
      || !Number.isInteger(face) || face < 1 || face > 6) return null;
    const previous = game.currentBid;
    if (previous && !(quantity > previous.quantity || (quantity === previous.quantity && face > previous.face))) return null;
    const next = clone(game);
    next.currentBid = { quantity, face };
    next.lastBidderId = playerId;
    next.currentPlayerId = nextActivePlayer(next.players, playerId);
    next.moveCount += 1;
    return next;
  }

  challenge(game, playerId) {
    if (!this.isValidSnapshot(game) || game.phase !== 'bidding' || playerId !== game.currentPlayerId
      || !game.currentBid || playerId === game.lastBidderId) return null;
    const reveal = game.players.map((player) => ({ id: player.id, dice: [...player.dice], diceCount: player.diceCount }));
    const actualCount = this.countBid(game, game.currentBid);
    const bidIsTrue = actualCount >= game.currentBid.quantity;
    const loserId = bidIsTrue ? playerId : game.lastBidderId;
    const next = clone(game);
    const loser = next.players.find((player) => player.id === loserId);
    if (!loser || loser.diceCount < 1) return null;
    loser.diceCount -= 1;
    if (!loser.diceCount) loser.dice = [];
    next.lastRound = {
      round: game.round,
      bid: clone(game.currentBid),
      actualCount,
      bidIsTrue,
      bidderId: game.lastBidderId,
      challengerId: playerId,
      loserId,
      reveal
    };
    next.history.push({ round: game.round, bid: clone(game.currentBid), actualCount, bidIsTrue, loserId });
    next.moveCount += 1;

    const activePlayers = next.players.filter((player) => player.diceCount > 0);
    if (activePlayers.length <= 1) {
      next.phase = 'finished';
      next.winnerId = activePlayers[0]?.id ?? null;
      next.currentPlayerId = null;
      return next;
    }

    next.round += 1;
    for (const player of activePlayers) player.dice = rollDice(player.diceCount, this.rng);
    next.players.filter((player) => player.diceCount === 0).forEach((player) => { player.dice = []; });
    next.currentPlayerId = loser.diceCount > 0 ? loserId : nextActivePlayer(next.players, loserId);
    next.currentBid = null;
    next.lastBidderId = null;
    next.phase = 'bidding';
    return next;
  }

  countBid(game, bid) {
    if (!this.isValidSnapshot(game) || !bid || !Number.isInteger(bid.face) || bid.face < 1 || bid.face > 6) return 0;
    let count = 0;
    for (const player of game.players) {
      for (const face of player.dice) {
        if (face === bid.face || (game.onesWild && bid.face !== 1 && face === 1)) count += 1;
      }
    }
    return count;
  }

  totalDice(game) {
    return game?.players?.reduce((total, player) => total + player.diceCount, 0) ?? 0;
  }

  getPublicState(game, viewerId) {
    if (!this.isValidSnapshot(game)) return null;
    const snapshot = clone(game);
    snapshot.players = snapshot.players.map((player) => ({
      ...player,
      dice: player.id === viewerId || game.phase === 'finished' ? [...player.dice] : null
    }));
    return snapshot;
  }

  isValidSnapshot(game) {
    if (!game || game.gameType !== 'liarsdice' || !['bidding', 'finished'].includes(game.phase)
      || !Array.isArray(game.players) || game.players.length < 2 || game.players.length > 10
      || new Set(game.players.map((player) => player?.id)).size !== game.players.length
      || typeof game.onesWild !== 'boolean' || !Number.isInteger(game.round) || game.round < 1
      || !Number.isInteger(game.moveCount) || game.moveCount < 0
      || game.players.some((player) => !player || typeof player.id !== 'string'
        || !Number.isInteger(player.diceCount) || player.diceCount < 0 || !Array.isArray(player.dice)
        || (player.diceCount > 0 && player.dice.length !== player.diceCount)
        || player.dice.some((face) => !Number.isInteger(face) || face < 1 || face > 6))) return false;
    if (game.currentBid && (!Number.isInteger(game.currentBid.quantity) || game.currentBid.quantity < 1
      || game.currentBid.quantity > this.totalDice(game)
      || !Number.isInteger(game.currentBid.face) || game.currentBid.face < 1 || game.currentBid.face > 6)) return false;
    if (game.phase === 'bidding') return game.players.some((player) => player.id === game.currentPlayerId && player.diceCount > 0);
    return game.currentPlayerId === null && (game.winnerId === null || game.players.some((player) => player.id === game.winnerId));
  }
}
