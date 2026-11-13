const ROWS = 6;
const COLUMNS = 7;
const CENTER_ORDER = [3, 2, 4, 1, 5, 0, 6];
const clone = (value) => JSON.parse(JSON.stringify(value));

function normalizePlayers(players = [], localName = 'Player') {
  return [
    { id: 'p1', name: players[0]?.name || localName || 'Player' },
    { id: 'p2', name: players[1]?.name || 'Computer' }
  ];
}

function winnerAt(board, row, column, playerId) {
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of directions) {
    let count = 1;
    for (const sign of [-1, 1]) {
      let r = row + dr * sign;
      let c = column + dc * sign;
      while (r >= 0 && r < ROWS && c >= 0 && c < COLUMNS
        && board[r * COLUMNS + c] === playerId) {
        count += 1;
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (count >= 4) return true;
  }
  return false;
}

function drop(board, column, playerId) {
  if (!Number.isInteger(column) || column < 0 || column >= COLUMNS) return null;
  for (let row = ROWS - 1; row >= 0; row -= 1) {
    const index = row * COLUMNS + column;
    if (!board[index]) {
      const next = board.slice();
      next[index] = playerId;
      return { board: next, row, column };
    }
  }
  return null;
}

function allWindows(board) {
  const windows = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
        const endRow = row + dr * 3;
        const endColumn = column + dc * 3;
        if (endRow < 0 || endRow >= ROWS || endColumn < 0 || endColumn >= COLUMNS) continue;
        windows.push([0, 1, 2, 3].map((step) => board[(row + dr * step) * COLUMNS + column + dc * step]));
      }
    }
  }
  return windows;
}

export class ConnectFourModel {
  createGame(players = [], { restartAt = Date.now(), localName = 'Player' } = {}) {
    return {
      gameType: 'connectfour',
      phase: 'playing',
      board: Array(ROWS * COLUMNS).fill(null),
      players: normalizePlayers(players, localName),
      currentPlayerId: 'p1',
      winnerId: null,
      restartAt,
      moveCount: 0
    };
  }

  applyMove(game, playerId, column) {
    if (!game || game.phase !== 'playing' || game.currentPlayerId !== playerId) return null;
    const placed = drop(game.board, column, playerId);
    if (!placed) return null;
    const next = clone(game);
    next.board = placed.board;
    next.moveCount += 1;
    if (winnerAt(next.board, placed.row, placed.column, playerId)) {
      next.phase = 'finished';
      next.winnerId = playerId;
    } else if (next.moveCount >= ROWS * COLUMNS) {
      next.phase = 'finished';
    } else {
      next.currentPlayerId = playerId === 'p1' ? 'p2' : 'p1';
    }
    return next;
  }

  chooseComputerMove(game, playerId = 'p2') {
    const legal = CENTER_ORDER.filter((column) => game.board[column] === null);
    if (!legal.length) return null;
    const opponentId = playerId === 'p1' ? 'p2' : 'p1';
    let bestColumn = legal[0];
    let bestScore = -Infinity;
    for (const column of legal) {
      const move = drop(game.board, column, playerId);
      if (winnerAt(move.board, move.row, column, playerId)) return column;
      const score = this._minimax(move.board, 4, -Infinity, Infinity, false, playerId, opponentId);
      if (score > bestScore) {
        bestScore = score;
        bestColumn = column;
      }
    }
    return bestColumn;
  }

  _minimax(board, depth, alpha, beta, maximizing, computerId, opponentId) {
    const legal = CENTER_ORDER.filter((column) => board[column] === null);
    if (!legal.length || depth === 0) return this._evaluate(board, computerId, opponentId);
    const activeId = maximizing ? computerId : opponentId;
    if (maximizing) {
      let value = -Infinity;
      for (const column of legal) {
        const move = drop(board, column, activeId);
        if (winnerAt(move.board, move.row, column, activeId)) return 100000 + depth;
        value = Math.max(value, this._minimax(move.board, depth - 1, alpha, beta, false, computerId, opponentId));
        alpha = Math.max(alpha, value);
        if (alpha >= beta) break;
      }
      return value;
    }
    let value = Infinity;
    for (const column of legal) {
      const move = drop(board, column, activeId);
      if (winnerAt(move.board, move.row, column, activeId)) return -100000 - depth;
      value = Math.min(value, this._minimax(move.board, depth - 1, alpha, beta, true, computerId, opponentId));
      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return value;
  }

  _evaluate(board, computerId, opponentId) {
    let score = 0;
    for (let row = 0; row < ROWS; row += 1) {
      if (board[row * COLUMNS + 3] === computerId) score += 4;
      if (board[row * COLUMNS + 3] === opponentId) score -= 4;
    }
    for (const window of allWindows(board)) {
      const computer = window.filter((cell) => cell === computerId).length;
      const opponent = window.filter((cell) => cell === opponentId).length;
      const empty = 4 - computer - opponent;
      if (!opponent) score += [0, 2, 11, 65, 100000][computer];
      if (!computer) score -= [0, 3, 14, 78, 100000][opponent];
      if (empty === 1 && computer === 2) score += 5;
    }
    return score;
  }

  isValidSnapshot(game) {
    return Boolean(game && game.gameType === 'connectfour' && Array.isArray(game.board)
      && game.board.length === ROWS * COLUMNS
      && ['playing', 'finished'].includes(game.phase)
      && ['p1', 'p2'].includes(game.currentPlayerId)
      && Number.isFinite(game.restartAt) && Number.isFinite(game.moveCount));
  }
}
