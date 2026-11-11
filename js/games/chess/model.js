const FILES = 'abcdefgh';
const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function squareIndex(square) {
  if (Number.isInteger(square) && square >= 0 && square < 64) return square;
  if (typeof square !== 'string' || !/^[a-h][1-8]$/i.test(square)) return -1;
  return (Number(square[1]) - 1) * 8 + FILES.indexOf(square[0].toLowerCase());
}

function squareName(index) {
  return FILES[index % 8] + (Math.floor(index / 8) + 1);
}

function colorOf(piece) {
  return piece === piece.toUpperCase() ? 'w' : 'b';
}

function clonePosition(position) {
  return {
    board: position.board.slice(),
    turn: position.turn,
    castling: position.castling,
    enPassant: position.enPassant,
    halfmove: position.halfmove,
    fullmove: position.fullmove,
  };
}

function parseFen(fen) {
  if (typeof fen !== 'string') throw new TypeError('FEN must be a string');
  const fields = fen.trim().split(/\s+/);
  if (fields.length !== 6) throw new Error('FEN must contain six fields');
  const board = Array(64).fill(null);
  const ranks = fields[0].split('/');
  if (ranks.length !== 8) throw new Error('FEN must contain eight ranks');
  ranks.forEach((rank, row) => {
    let file = 0;
    for (const token of rank) {
      if (/^[1-8]$/.test(token)) file += Number(token);
      else if (/^[pnbrqkPNBRQK]$/.test(token) && file < 8) {
        board[(7 - row) * 8 + file] = token;
        file += 1;
      } else {
        throw new Error('Invalid FEN board');
      }
    }
    if (file !== 8) throw new Error('Invalid FEN rank width');
  });
  if (!['w', 'b'].includes(fields[1])) throw new Error('Invalid FEN turn');
  if (fields[2] !== '-' && !/^(?!.*(.).*\1)[KQkq]+$/.test(fields[2])) {
    throw new Error('Invalid FEN castling rights');
  }
  const enPassant = fields[3] === '-' ? null : squareIndex(fields[3]);
  if (fields[3] !== '-' && (enPassant < 0 || ![2, 5].includes(Math.floor(enPassant / 8)))) {
    throw new Error('Invalid FEN en passant square');
  }
  const halfmove = Number(fields[4]);
  const fullmove = Number(fields[5]);
  if (!Number.isInteger(halfmove) || halfmove < 0 || !Number.isInteger(fullmove) || fullmove < 1) {
    throw new Error('Invalid FEN move counters');
  }
  if (board.filter((piece) => piece === 'K').length !== 1 || board.filter((piece) => piece === 'k').length !== 1) {
    throw new Error('FEN must contain one king per side');
  }
  return { board, turn: fields[1], castling: fields[2] === '-' ? '' : fields[2], enPassant, halfmove, fullmove };
}

function toFen(position) {
  const ranks = [];
  for (let rank = 7; rank >= 0; rank -= 1) {
    let empty = 0;
    let text = '';
    for (let file = 0; file < 8; file += 1) {
      const piece = position.board[rank * 8 + file];
      if (!piece) empty += 1;
      else {
        if (empty) text += empty;
        empty = 0;
        text += piece;
      }
    }
    if (empty) text += empty;
    ranks.push(text);
  }
  return `${ranks.join('/')} ${position.turn} ${position.castling || '-'} ${position.enPassant === null ? '-' : squareName(position.enPassant)} ${position.halfmove} ${position.fullmove}`;
}

function findKing(position, color) {
  return position.board.indexOf(color === 'w' ? 'K' : 'k');
}

function isAttacked(position, target, byColor) {
  const board = position.board;
  const targetFile = target % 8;
  const targetRank = Math.floor(target / 8);
  const pawnSourceRank = targetRank + (byColor === 'w' ? -1 : 1);
  for (const df of [-1, 1]) {
    const file = targetFile + df;
    if (file >= 0 && file < 8 && pawnSourceRank >= 0 && pawnSourceRank < 8) {
      const piece = board[pawnSourceRank * 8 + file];
      if (piece && colorOf(piece) === byColor && piece.toLowerCase() === 'p') return true;
    }
  }
  for (const [df, dr] of [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]) {
    const file = targetFile + df;
    const rank = targetRank + dr;
    if (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
      const piece = board[rank * 8 + file];
      if (piece && colorOf(piece) === byColor && piece.toLowerCase() === 'n') return true;
    }
  }
  for (const [df, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    let file = targetFile + df;
    let rank = targetRank + dr;
    let distance = 1;
    while (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
      const piece = board[rank * 8 + file];
      if (piece) {
        if (colorOf(piece) === byColor) {
          const type = piece.toLowerCase();
          if (type === 'q' || (distance === 1 && type === 'k') ||
            (Math.abs(df) + Math.abs(dr) === 1 && type === 'r') ||
            (Math.abs(df) === 1 && Math.abs(dr) === 1 && type === 'b')) return true;
        }
        break;
      }
      file += df;
      rank += dr;
      distance += 1;
    }
  }
  return false;
}

function inCheck(position, color) {
  const king = findKing(position, color);
  return king < 0 || isAttacked(position, king, color === 'w' ? 'b' : 'w');
}

function applyPosition(position, move) {
  const next = clonePosition(position);
  const piece = next.board[move.from];
  const capturedSquare = move.enPassant ? move.to + (colorOf(piece) === 'w' ? -8 : 8) : move.to;
  const captured = next.board[capturedSquare];
  next.board[move.from] = null;
  if (move.enPassant) next.board[capturedSquare] = null;
  next.board[move.to] = move.promotion ? (colorOf(piece) === 'w' ? move.promotion.toUpperCase() : move.promotion) : piece;
  if (move.castle) {
    const rookFrom = move.to > move.from ? move.from + 3 : move.from - 4;
    const rookTo = move.to > move.from ? move.from + 1 : move.from - 1;
    next.board[rookTo] = next.board[rookFrom];
    next.board[rookFrom] = null;
  }
  let rights = next.castling;
  if (piece.toLowerCase() === 'k') rights = rights.replace(colorOf(piece) === 'w' ? /[KQ]/g : /[kq]/g, '');
  const revokeRook = (square) => {
    rights = rights.replace(({ 0: 'Q', 7: 'K', 56: 'q', 63: 'k' })[square] || /$^/, '');
  };
  if (piece.toLowerCase() === 'r') revokeRook(move.from);
  if (captured && captured.toLowerCase() === 'r') revokeRook(capturedSquare);
  next.castling = rights;
  next.enPassant = piece.toLowerCase() === 'p' && Math.abs(move.to - move.from) === 16
    ? (move.from + move.to) / 2 : null;
  next.halfmove = piece.toLowerCase() === 'p' || captured ? 0 : next.halfmove + 1;
  if (colorOf(piece) === 'b') next.fullmove += 1;
  next.turn = colorOf(piece) === 'w' ? 'b' : 'w';
  return { position: next, captured };
}

function pseudoMoves(position, from) {
  const piece = position.board[from];
  if (!piece) return [];
  const color = colorOf(piece);
  const type = piece.toLowerCase();
  const file = from % 8;
  const rank = Math.floor(from / 8);
  const moves = [];
  const add = (to, extra = {}) => {
    if (to < 0 || to >= 64) return;
    const target = position.board[to];
    if (target && colorOf(target) === color) return;
    moves.push({ from, to, ...extra });
  };
  if (type === 'p') {
    const direction = color === 'w' ? 1 : -1;
    const startRank = color === 'w' ? 1 : 6;
    const promotionRank = color === 'w' ? 7 : 0;
    const one = from + direction * 8;
    if (one >= 0 && one < 64 && !position.board[one]) {
      if (Math.floor(one / 8) === promotionRank) {
        for (const promotion of ['q', 'r', 'b', 'n']) moves.push({ from, to: one, promotion });
      } else {
        add(one);
        const two = from + direction * 16;
        if (rank === startRank && !position.board[two]) add(two);
      }
    }
    for (const df of [-1, 1]) {
      const targetFile = file + df;
      const to = from + direction * 8 + df;
      if (targetFile < 0 || targetFile > 7 || to < 0 || to >= 64) continue;
      if (position.board[to] && colorOf(position.board[to]) !== color) {
        if (Math.floor(to / 8) === promotionRank) {
          for (const promotion of ['q', 'r', 'b', 'n']) moves.push({ from, to, promotion });
        } else add(to);
      } else if (position.enPassant === to &&
        position.board[to + (color === 'w' ? -8 : 8)] === (color === 'w' ? 'p' : 'P')) {
        moves.push({ from, to, enPassant: true });
      }
    }
    return moves;
  }
  if (type === 'n' || type === 'k') {
    const offsets = type === 'n'
      ? [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]
      : [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (const [df, dr] of offsets) {
      const targetFile = file + df;
      const targetRank = rank + dr;
      if (targetFile >= 0 && targetFile < 8 && targetRank >= 0 && targetRank < 8) add(targetRank * 8 + targetFile);
    }
    if (type === 'k' && !inCheck(position, color)) {
      const home = color === 'w' ? 4 : 60;
      const enemy = color === 'w' ? 'b' : 'w';
      if (from === home) {
        const kingRight = color === 'w' ? 'K' : 'k';
        const queenRight = color === 'w' ? 'Q' : 'q';
        if (position.castling.includes(kingRight) && !position.board[home + 1] && !position.board[home + 2] &&
          position.board[home + 3] === (color === 'w' ? 'R' : 'r') &&
          !isAttacked(position, home + 1, enemy) && !isAttacked(position, home + 2, enemy)) {
          moves.push({ from, to: home + 2, castle: true });
        }
        if (position.castling.includes(queenRight) && !position.board[home - 1] && !position.board[home - 2] && !position.board[home - 3] &&
          position.board[home - 4] === (color === 'w' ? 'R' : 'r') &&
          !isAttacked(position, home - 1, enemy) && !isAttacked(position, home - 2, enemy)) {
          moves.push({ from, to: home - 2, castle: true });
        }
      }
    }
    return moves;
  }
  const directions = type === 'b' ? [[1, 1], [1, -1], [-1, 1], [-1, -1]]
    : type === 'r' ? [[1, 0], [-1, 0], [0, 1], [0, -1]]
      : [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [df, dr] of directions) {
    let targetFile = file + df;
    let targetRank = rank + dr;
    while (targetFile >= 0 && targetFile < 8 && targetRank >= 0 && targetRank < 8) {
      const to = targetRank * 8 + targetFile;
      if (position.board[to]) {
        if (colorOf(position.board[to]) !== color) add(to);
        break;
      }
      add(to);
      targetFile += df;
      targetRank += dr;
    }
  }
  return moves;
}

function legalMoves(position, color = position.turn) {
  const result = [];
  position.board.forEach((piece, from) => {
    if (!piece || colorOf(piece) !== color) return;
    for (const move of pseudoMoves(position, from)) {
      const next = applyPosition(position, move).position;
      if (!inCheck(next, color)) result.push(move);
    }
  });
  return result;
}

function statusOf(position) {
  const checked = inCheck(position, position.turn);
  const moves = legalMoves(position);
  if (!moves.length) {
    if (checked) return { over: true, winner: position.turn === 'w' ? 'b' : 'w', reason: 'checkmate', inCheck: true };
    return { over: true, winner: null, reason: 'stalemate', inCheck: false };
  }
  if (position.halfmove >= 100) return { over: true, winner: null, reason: 'fifty-move', inCheck: checked };
  const material = position.board.filter(Boolean).map((piece) => piece.toLowerCase());
  if (material.every((piece) => piece === 'k' || piece === 'b' || piece === 'n') &&
      material.filter((piece) => piece !== 'k').length <= 1) {
    return { over: true, winner: null, reason: 'insufficient-material', inCheck: checked };
  }
  return { over: false, winner: null, reason: null, inCheck: checked };
}

function evaluate(position) {
  let score = 0;
  position.board.forEach((piece, index) => {
    if (!piece) return;
    const value = PIECE_VALUES[piece.toLowerCase()];
    const rank = Math.floor(index / 8);
    const advancement = piece.toLowerCase() === 'p' ? (colorOf(piece) === 'w' ? rank : 7 - rank) * 5 : 0;
    score += (colorOf(piece) === 'w' ? 1 : -1) * (value + advancement);
  });
  return score;
}

function search(position, depth, alpha, beta, ply = 0) {
  const moves = legalMoves(position);
  if (!moves.length) {
    if (inCheck(position, position.turn)) return position.turn === 'w' ? -100000 + ply : 100000 - ply;
    return 0;
  }
  if (depth === 0) return evaluate(position);
  const maximizing = position.turn === 'w';
  let best = maximizing ? -Infinity : Infinity;
  for (const move of moves) {
    const next = applyPosition(position, move).position;
    const score = search(next, depth - 1, alpha, beta, ply + 1);
    best = maximizing ? Math.max(best, score) : Math.min(best, score);
    if (maximizing) alpha = Math.max(alpha, best);
    else beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

export class ChessModel {
  constructor({ fen } = {}) {
    this.createGame(fen);
  }

  createGame(fen = START_FEN) {
    this.position = parseFen(fen);
    this.history = [];
    this.captured = { w: [], b: [] };
    this.lastMove = null;
    return this.getSnapshot();
  }

  getLegalMoves(square) {
    const from = squareIndex(square);
    if (from < 0 || !this.position.board[from] || colorOf(this.position.board[from]) !== this.position.turn) return [];
    return legalMoves(this.position).filter((move) => move.from === from)
      .map((move) => ({ ...move, from: squareName(move.from), to: squareName(move.to) }));
  }

  makeMove(fromSquare, toSquare, promotion) {
    const from = squareIndex(fromSquare);
    const to = squareIndex(toSquare);
    if (from < 0 || to < 0) return false;
    const candidates = legalMoves(this.position).filter((move) => move.from === from && move.to === to);
    if (!candidates.length) return false;
    let move;
    if (candidates.some((candidate) => candidate.promotion)) {
      const chosen = typeof promotion === 'string' ? promotion.toLowerCase() : 'q';
      move = candidates.find((candidate) => candidate.promotion === chosen);
      if (!move) return false;
    } else {
      if (promotion) return false;
      [move] = candidates;
    }
    const movingPiece = this.position.board[from];
    const { position: next, captured } = applyPosition(this.position, move);
    let notation;
    if (move.castle) notation = to > from ? 'O-O' : 'O-O-O';
    else {
      const type = movingPiece.toLowerCase();
      const capture = Boolean(captured);
      let prefix = type === 'p' ? (capture ? FILES[from % 8] : '') : movingPiece.toUpperCase();
      if (type !== 'p') {
        const alternatives = legalMoves(this.position).filter((other) =>
          other.from !== from && other.to === to &&
          this.position.board[other.from].toLowerCase() === type);
        if (alternatives.length) {
          const sameFile = alternatives.some((other) => other.from % 8 === from % 8);
          const sameRank = alternatives.some((other) => Math.floor(other.from / 8) === Math.floor(from / 8));
          prefix += !sameFile ? FILES[from % 8] : !sameRank ? String(Math.floor(from / 8) + 1) : squareName(from);
        }
      }
      notation = `${prefix}${capture ? 'x' : ''}${squareName(to)}${move.promotion ? `=${move.promotion.toUpperCase()}` : ''}`;
    }
    this.position = next;
    if (captured) this.captured[colorOf(movingPiece)].push(captured);
    const status = statusOf(next);
    if (status.inCheck) notation += status.reason === 'checkmate' ? '#' : '+';
    this.history.push(notation);
    this.lastMove = { from: squareName(from), to: squareName(to), notation };
    return this.getSnapshot();
  }

  getSnapshot() {
    const pieces = {};
    this.position.board.forEach((piece, index) => {
      if (piece) pieces[squareName(index)] = piece;
    });
    return {
      fen: toFen(this.position),
      pieces,
      turn: this.position.turn,
      history: this.history.slice(),
      captured: { w: this.captured.w.slice(), b: this.captured.b.slice() },
      lastMove: this.lastMove ? { ...this.lastMove } : null,
      status: statusOf(this.position),
    };
  }

  loadSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') throw new TypeError('Snapshot must be an object');
    const position = parseFen(snapshot.fen);
    this.position = position;
    this.history = Array.isArray(snapshot.history) ? snapshot.history.filter((item) => typeof item === 'string') : [];
    this.captured = {
      w: Array.isArray(snapshot.captured?.w) ? snapshot.captured.w.filter((piece) => /^[pnbrqk]$/i.test(piece)) : [],
      b: Array.isArray(snapshot.captured?.b) ? snapshot.captured.b.filter((piece) => /^[pnbrqk]$/i.test(piece)) : [],
    };
    this.lastMove = snapshot.lastMove && typeof snapshot.lastMove === 'object'
      ? { from: String(snapshot.lastMove.from), to: String(snapshot.lastMove.to), notation: String(snapshot.lastMove.notation) }
      : null;
    return this.getSnapshot();
  }

  chooseComputerMove() {
    const moves = legalMoves(this.position);
    if (!moves.length || statusOf(this.position).over) return null;
    let bestMove = moves[0];
    let bestScore = this.position.turn === 'w' ? -Infinity : Infinity;
    for (const move of moves) {
      const next = applyPosition(this.position, move).position;
      const score = search(next, 1, -Infinity, Infinity, 1);
      if ((this.position.turn === 'w' && score > bestScore) || (this.position.turn === 'b' && score < bestScore)) {
        bestScore = score;
        bestMove = move;
      }
    }
    const result = this.makeMove(squareName(bestMove.from), squareName(bestMove.to), bestMove.promotion);
    return result ? { ...this.lastMove } : null;
  }
}

export { START_FEN, squareIndex, squareName, toFen };
export default ChessModel;
