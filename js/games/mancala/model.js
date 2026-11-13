const clone = (value) => JSON.parse(JSON.stringify(value));
const PIT_COUNT = 14;
const PLAYER_PITS = Object.freeze({ p1: [0, 5], p2: [7, 12] });
const STORE_INDEX = Object.freeze({ p1: 6, p2: 13 });

function normalizePlayers(players) {
  const input = Array.isArray(players) ? players : [];
  const result = input.length ? input : [
    { id: 'p1', name: 'Player 1' },
    { id: 'p2', name: 'Player 2' }
  ];
  if (result.length !== 2) throw new RangeError('Mancala requires exactly two players.');
  const normalized = result.map((player, index) => {
    const id = String(typeof player === 'string' ? player : player?.id ?? `p${index + 1}`).trim();
    if (!id) throw new TypeError('Player ids must be non-empty strings.');
    return { id, name: String(typeof player === 'object' && player?.name ? player.name : `Player ${index + 1}`) };
  });
  if (normalized[0].id === normalized[1].id) throw new RangeError('Mancala player ids must be unique.');
  return normalized;
}

function sideForPlayer(game, playerId) {
  return game.players.findIndex((player) => player.id === playerId) === 0 ? 'p1'
    : game.players.some((player) => player.id === playerId) ? 'p2' : null;
}

function sideIsEmpty(board, side) {
  const [start, end] = PLAYER_PITS[side];
  for (let index = start; index <= end; index += 1) {
    if (board[index] > 0) return false;
  }
  return true;
}

function sweepSide(board, side) {
  const [start, end] = PLAYER_PITS[side];
  const store = STORE_INDEX[side];
  for (let index = start; index <= end; index += 1) {
    board[store] += board[index];
    board[index] = 0;
  }
}

export class MancalaModel {
  createGame({ players, stonesPerPit = 4 } = {}) {
    if (!Number.isInteger(stonesPerPit) || stonesPerPit < 0 || stonesPerPit > 100) {
      throw new RangeError('stonesPerPit must be an integer between 0 and 100.');
    }
    const seats = normalizePlayers(players);
    const board = Array(PIT_COUNT).fill(0);
    for (const index of [...Array.from({ length: 6 }, (_, value) => value), ...Array.from({ length: 6 }, (_, value) => value + 7)]) {
      board[index] = stonesPerPit;
    }
    return {
      gameType: 'mancala',
      phase: stonesPerPit === 0 ? 'finished' : 'playing',
      players: seats,
      board,
      stores: { p1: 0, p2: 0 },
      currentPlayerId: stonesPerPit === 0 ? null : seats[0].id,
      winnerId: stonesPerPit === 0 ? null : undefined,
      draw: stonesPerPit === 0,
      stonesPerPit,
      totalStones: stonesPerPit * 12,
      moveCount: 0,
      lastMove: null
    };
  }

  getValidMoves(game, playerId = game?.currentPlayerId) {
    if (!this.isValidSnapshot(game) || game.phase !== 'playing') return [];
    const side = sideForPlayer(game, playerId);
    if (!side || playerId !== game.currentPlayerId) return [];
    const [start, end] = PLAYER_PITS[side];
    const moves = [];
    for (let index = start; index <= end; index += 1) {
      if (game.board[index] > 0) moves.push(index);
    }
    return moves;
  }

  applyMove(game, playerId, pitIndex) {
    if (!this.isValidSnapshot(game) || game.phase !== 'playing'
      || playerId !== game.currentPlayerId || !Number.isInteger(pitIndex)) return null;
    const side = sideForPlayer(game, playerId);
    if (!side) return null;
    const [start, end] = PLAYER_PITS[side];
    if (pitIndex < start || pitIndex > end || game.board[pitIndex] < 1) return null;

    const next = clone(game);
    const originalSeeds = next.board[pitIndex];
    next.board[pitIndex] = 0;
    let seeds = originalSeeds;
    let cursor = pitIndex;
    const opponentSide = side === 'p1' ? 'p2' : 'p1';
    const skippedStore = STORE_INDEX[opponentSide];

    while (seeds > 0) {
      cursor = (cursor + 1) % PIT_COUNT;
      if (cursor === skippedStore) continue;
      next.board[cursor] += 1;
      seeds -= 1;
    }

    let captured = 0;
    const landsOnOwnPit = cursor >= start && cursor <= end;
    if (landsOnOwnPit && game.board[cursor] === 0 && next.board[cursor] === 1) {
      const oppositePit = 12 - cursor;
      if (next.board[oppositePit] > 0) {
        captured = next.board[oppositePit] + 1;
        next.board[STORE_INDEX[side]] += captured;
        next.board[cursor] = 0;
        next.board[oppositePit] = 0;
      }
    }

    const extraTurn = cursor === STORE_INDEX[side];
    next.moveCount += 1;
    next.lastMove = { playerId, pitIndex, lastIndex: cursor, seeds: originalSeeds, captured, extraTurn };
    next.stores = { p1: next.board[6], p2: next.board[13] };

    if (sideIsEmpty(next.board, 'p1') || sideIsEmpty(next.board, 'p2')) {
      sweepSide(next.board, 'p1');
      sweepSide(next.board, 'p2');
      next.stores = { p1: next.board[6], p2: next.board[13] };
      next.phase = 'finished';
      next.currentPlayerId = null;
      next.draw = next.stores.p1 === next.stores.p2;
      next.winnerId = next.draw ? null : next.players[next.stores.p1 > next.stores.p2 ? 0 : 1].id;
    } else {
      next.currentPlayerId = extraTurn ? playerId : next.players[side === 'p1' ? 1 : 0].id;
      next.winnerId = undefined;
      next.draw = false;
    }
    return next;
  }

  getScores(game) {
    if (!this.isValidSnapshot(game)) return null;
    return { p1: game.board[6], p2: game.board[13] };
  }

  isValidSnapshot(game) {
    if (!game || game.gameType !== 'mancala' || !['playing', 'finished'].includes(game.phase)
      || !Array.isArray(game.players) || game.players.length !== 2
      || game.players.some((player) => !player || typeof player.id !== 'string')
      || game.players[0].id === game.players[1].id
      || !Array.isArray(game.board) || game.board.length !== PIT_COUNT
      || game.board.some((stones) => !Number.isInteger(stones) || stones < 0)
      || !Number.isInteger(game.totalStones) || game.board.reduce((sum, stones) => sum + stones, 0) !== game.totalStones
      || !Number.isInteger(game.moveCount) || game.moveCount < 0) return false;
    if (game.phase === 'playing') return game.players.some((player) => player.id === game.currentPlayerId);
    return game.currentPlayerId === null && typeof game.draw === 'boolean';
  }
}
