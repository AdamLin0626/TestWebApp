const SIZE = 8;
const DIRECTIONS = [-1, 0, 1].flatMap((rowStep) => [-1, 0, 1]
  .filter((columnStep) => rowStep !== 0 || columnStep !== 0)
  .map((columnStep) => [rowStep, columnStep]));
const CORNER_INDICES = new Set([0, 7, 56, 63]);
const clone = (value) => JSON.parse(JSON.stringify(value));

function normalizePlayers(players = [], localName = 'Player') {
  return [
    { id: 'p1', name: players[0]?.name || localName || 'Player' },
    { id: 'p2', name: players[1]?.name || 'Computer' }
  ];
}

function capturesFor(board, index, playerId) {
  if (!Number.isInteger(index) || index < 0 || index >= SIZE * SIZE || board[index]) return [];
  const opponentId = playerId === 'p1' ? 'p2' : 'p1';
  const row = Math.floor(index / SIZE);
  const column = index % SIZE;
  const captured = [];
  for (const [dr, dc] of DIRECTIONS) {
    const line = [];
    let r = row + dr;
    let c = column + dc;
    while (r >= 0 && r < SIZE && c >= 0 && c < SIZE
      && board[r * SIZE + c] === opponentId) {
      line.push(r * SIZE + c);
      r += dr;
      c += dc;
    }
    if (line.length && r >= 0 && r < SIZE && c >= 0 && c < SIZE
      && board[r * SIZE + c] === playerId) captured.push(...line);
  }
  return captured;
}

function countDiscs(board) {
  return {
    p1: board.filter((cell) => cell === 'p1').length,
    p2: board.filter((cell) => cell === 'p2').length
  };
}

export class ReversiModel {
  createGame(players = [], { restartAt = Date.now(), localName = 'Player' } = {}) {
    const board = Array(64).fill(null);
    board[27] = 'p2';
    board[28] = 'p1';
    board[35] = 'p1';
    board[36] = 'p2';
    return {
      gameType: 'reversi',
      phase: 'playing',
      board,
      players: normalizePlayers(players, localName),
      currentPlayerId: 'p1',
      winnerId: null,
      scores: countDiscs(board),
      restartAt,
      moveCount: 0,
      passedPlayerId: null
    };
  }

  getLegalMoves(board, playerId) {
    const moves = [];
    for (let index = 0; index < board.length; index += 1) {
      if (capturesFor(board, index, playerId).length) moves.push(index);
    }
    return moves;
  }

  applyMove(game, playerId, index) {
    if (!game || game.phase !== 'playing' || game.currentPlayerId !== playerId) return null;
    const captured = capturesFor(game.board, index, playerId);
    if (!captured.length) return null;
    const next = clone(game);
    next.board[index] = playerId;
    for (const capturedIndex of captured) next.board[capturedIndex] = playerId;
    next.moveCount += 1;
    next.passedPlayerId = null;
    const other = playerId === 'p1' ? 'p2' : 'p1';
    const nextMoves = this.getLegalMoves(next.board, other);
    const sameMoves = this.getLegalMoves(next.board, playerId);
    if (nextMoves.length) {
      next.currentPlayerId = other;
    } else if (sameMoves.length) {
      next.currentPlayerId = playerId;
      next.passedPlayerId = other;
    } else {
      next.phase = 'finished';
      const scores = countDiscs(next.board);
      next.winnerId = scores.p1 === scores.p2 ? null : scores.p1 > scores.p2 ? 'p1' : 'p2';
    }
    next.scores = countDiscs(next.board);
    return next;
  }

  chooseComputerMove(game, playerId = 'p2') {
    const moves = this.getLegalMoves(game.board, playerId);
    if (!moves.length) return null;
    const opponentId = playerId === 'p1' ? 'p2' : 'p1';
    const weights = [100, -18, 12, 7, 7, 12, -18, 100,
      -18, -28, -3, -3, -3, -3, -28, -18,
      12, -3, 8, 4, 4, 8, -3, 12,
      7, -3, 4, 2, 2, 4, -3, 7,
      7, -3, 4, 2, 2, 4, -3, 7,
      12, -3, 8, 4, 4, 8, -3, 12,
      -18, -28, -3, -3, -3, -3, -28, -18,
      100, -18, 12, 7, 7, 12, -18, 100];
    let bestMove = moves[0];
    let bestScore = -Infinity;
    for (const move of moves) {
      const nextBoard = game.board.slice();
      nextBoard[move] = playerId;
      for (const index of capturesFor(game.board, move, playerId)) nextBoard[index] = playerId;
      const mobility = this.getLegalMoves(nextBoard, opponentId).length;
      const flips = nextBoard.filter((cell) => cell === playerId).length
        - game.board.filter((cell) => cell === playerId).length;
      const score = weights[move] - mobility * 1.4 + flips * 0.2;
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    return bestMove;
  }

  isValidSnapshot(game) {
    return Boolean(game && game.gameType === 'reversi' && Array.isArray(game.board)
      && game.board.length === 64 && ['playing', 'finished'].includes(game.phase)
      && ['p1', 'p2'].includes(game.currentPlayerId)
      && Number.isFinite(game.restartAt) && Number.isFinite(game.moveCount));
  }
}
