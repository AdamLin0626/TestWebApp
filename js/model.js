const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DOTS_COLUMNS = 4;
const DOTS_ROWS = 6;

export class GameModel {
  constructor() {
    this.state = {
      room: "",
      gameType: "1a2b",
      playerId: "",
      playerName: "",
      mySecret: "",
      players: {},
      gameState: null,
      guesses: {},
      results: {},
      handledResults: new Set(),
      joined: false,
      joining: false,
      mode: "1P",
      soloMode: false,
      soloSecret: ""
    };
  }

  validName(name) {
    return name.trim().slice(0, 20);
  }

  isValidCode(value) {
    return /^(?!.*(.).*\1)[0-9]{4}$/.test(value);
  }

  isValidRoomCode(value) {
    return /^[A-HJ-NP-Z2-9]{6}$/.test(value);
  }

  scoreGuess(secret, guess) {
    const a = [...guess].filter((digit, index) => digit === secret[index]).length;
    const b = [...guess].filter((digit) => secret.includes(digit)).length - a;
    return { a, b };
  }

  createSecret() {
    const digits = "0123456789".split("");
    for (let index = digits.length - 1; index > 0; index--) {
      const swap = crypto.getRandomValues(new Uint32Array(1))[0] % (index + 1);
      [digits[index], digits[swap]] = [digits[swap], digits[index]];
    }
    return digits.slice(0, 4).join("");
  }

  createRoomCode() {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  }

  getPlayers() {
    return Object.values(this.state.players)
      .filter((player) => player.online !== false)
      .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0) || a.id.localeCompare(b.id));
  }

  roomTopic() {
    return `fourfold/${this.state.gameType}/v1/${this.state.room}`;
  }

  playerTopic(id) {
    return `${this.roomTopic()}/players/${id}/presence`;
  }

  secretKey() {
    return `fourfold.secret.${this.state.room}.${this.state.playerId}`;
  }

  resetGame() {
    Object.assign(this.state, {
      room: "",
      gameType: "1a2b",
      playerId: "",
      players: {},
      gameState: null,
      guesses: {},
      results: {},
      handledResults: new Set(),
      joined: false,
      joining: false,
      soloMode: false,
      soloSecret: "",
      mySecret: ""
    });
  }

  createTicTacToeGame(players) {
    const [first, second] = players;
    return {
      phase: "playing",
      board: Array(9).fill(null),
      players: [
        { id: first.id, mark: "O" },
        { id: second.id, mark: "X" }
      ],
      activePlayerId: first.id,
      moveCount: 0,
      startedAt: Date.now()
    };
  }

  chooseTicTacToeMove(game, playerId) {
    const rootPlayerId = playerId;
    const path = new Set();
    const preferredCells = [4, 0, 2, 6, 8, 1, 3, 5, 7];

    const getPositionKey = (position) => {
      const age = new Map(
        position.board
          .map((move, cell) => move ? { cell, moveNumber: move.moveNumber } : null)
          .filter(Boolean)
          .sort((a, b) => a.moveNumber - b.moveNumber)
          .map((move, index) => [move.cell, index])
      );
      return `${position.activePlayerId}|${position.board.map((move, cell) =>
        move ? `${move.mark}${age.get(cell)}` : "-"
      ).join("")}`;
    };

    const search = (position, depth, alpha, beta) => {
      if (position.phase === "won") {
        return position.winnerId === rootPlayerId ? 100 - depth : depth - 100;
      }

      const key = getPositionKey(position);
      if (path.has(key)) return 0;
      path.add(key);

      const isMaximizing = position.activePlayerId === rootPlayerId;
      let bestScore = isMaximizing ? -Infinity : Infinity;
      const availableCells = preferredCells.filter((cell) => !position.board[cell]);
      for (const cell of availableCells) {
        const nextPosition = this.applyTicTacToeMove(position, position.activePlayerId, cell);
        if (!nextPosition) continue;
        const score = search(nextPosition, depth + 1, alpha, beta);
        if (isMaximizing) {
          bestScore = Math.max(bestScore, score);
          alpha = Math.max(alpha, bestScore);
        } else {
          bestScore = Math.min(bestScore, score);
          beta = Math.min(beta, bestScore);
        }
        if (beta <= alpha) break;
      }

      path.delete(key);
      return Number.isFinite(bestScore) ? bestScore : 0;
    };

    if (game?.phase !== "playing" || game.activePlayerId !== playerId) return null;
    let bestCell = null;
    let bestScore = -Infinity;
    let alpha = -Infinity;
    for (const cell of preferredCells.filter((index) => !game.board[index])) {
      const nextPosition = this.applyTicTacToeMove(game, playerId, cell);
      if (!nextPosition) continue;
      const score = search(nextPosition, 1, alpha, Infinity);
      if (score > bestScore) {
        bestScore = score;
        bestCell = cell;
      }
      alpha = Math.max(alpha, bestScore);
    }
    return bestCell;
  }

  applyTicTacToeMove(game, playerId, cell) {
    if (!game || game.phase !== "playing" || game.activePlayerId !== playerId ||
      !Number.isInteger(cell) || cell < 0 || cell > 8 || game.board[cell]) return null;

    const board = [...game.board];
    let removed = null;
    if (board.every(Boolean)) {
      removed = board.reduce((oldest, move, index) =>
        move.moveNumber < oldest.move.moveNumber ? { move, index } : oldest,
      { move: board[0], index: 0 });
      board[removed.index] = null;
    }

    const player = game.players.find((entry) => entry.id === playerId);
    if (!player) return null;
    const moveCount = game.moveCount + 1;
    board[cell] = { mark: player.mark, playerId, moveNumber: moveCount };
    const winnerId = this.getTicTacToeWinner(board);
    if (!winnerId && board.every(Boolean)) {
      removed = board.reduce((oldest, move, index) =>
        move.moveNumber < oldest.move.moveNumber ? { move, index } : oldest,
      { move: board[0], index: 0 });
      board[removed.index] = null;
    }
    const nextPlayer = game.players.find((entry) => entry.id !== playerId);

    return {
      ...game,
      board,
      moveCount,
      phase: winnerId ? "won" : "playing",
      winnerId,
      activePlayerId: winnerId ? null : nextPlayer.id,
      lastRemoved: removed ? { mark: removed.move.mark, cell: removed.index } : null,
      updatedAt: Date.now()
    };
  }

  getTicTacToeWinner(board) {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (const [first, second, third] of lines) {
      const move = board[first];
      if (move && move.mark === board[second]?.mark && move.mark === board[third]?.mark) {
        return move.playerId;
      }
    }
    return null;
  }

  createDotsAndBoxesGame(players) {
    const [first, second] = players;
    const horizontalEdgeCount = (DOTS_ROWS + 1) * DOTS_COLUMNS;
    const edgeCount = horizontalEdgeCount + DOTS_ROWS * (DOTS_COLUMNS + 1);
    return {
      phase: "playing",
      columns: DOTS_COLUMNS,
      rows: DOTS_ROWS,
      edges: Array(edgeCount).fill(null),
      boxes: Array(DOTS_COLUMNS * DOTS_ROWS).fill(null),
      players: [
        { id: first.id, mark: "A" },
        { id: second.id, mark: "B" }
      ],
      scores: { [first.id]: 0, [second.id]: 0 },
      activePlayerId: first.id,
      moveCount: 0,
      startedAt: Date.now()
    };
  }

  getDotsBoxEdges(boxIndex) {
    const columns = DOTS_COLUMNS;
    const row = Math.floor(boxIndex / columns);
    const column = boxIndex % columns;
    const horizontalEdgeCount = (DOTS_ROWS + 1) * columns;
    return [
      row * columns + column,
      (row + 1) * columns + column,
      horizontalEdgeCount + row * (columns + 1) + column,
      horizontalEdgeCount + row * (columns + 1) + column + 1
    ];
  }

  applyDotsAndBoxesMove(game, playerId, edgeIndex) {
    if (!game || game.phase !== "playing" || game.activePlayerId !== playerId ||
      !Number.isInteger(edgeIndex) || edgeIndex < 0 || edgeIndex >= game.edges.length || game.edges[edgeIndex]) return null;
    const player = game.players.find((entry) => entry.id === playerId);
    if (!player) return null;

    const edges = [...game.edges];
    edges[edgeIndex] = { playerId, mark: player.mark, moveNumber: game.moveCount + 1 };
    const boxes = [...game.boxes];
    const completedBoxes = [];
    for (let boxIndex = 0; boxIndex < boxes.length; boxIndex++) {
      if (boxes[boxIndex]) continue;
      if (this.getDotsBoxEdges(boxIndex).every((edge) => edges[edge])) {
        boxes[boxIndex] = playerId;
        completedBoxes.push(boxIndex);
      }
    }

    const scores = { ...game.scores, [playerId]: game.scores[playerId] + completedBoxes.length };
    const moveCount = game.moveCount + 1;
    const finished = moveCount === game.edges.length;
    let winnerId = null;
    if (finished && scores[game.players[0].id] !== scores[game.players[1].id]) {
      winnerId = scores[game.players[0].id] > scores[game.players[1].id]
        ? game.players[0].id
        : game.players[1].id;
    }

    return {
      ...game,
      edges,
      boxes,
      scores,
      moveCount,
      phase: finished ? "won" : "playing",
      winnerId,
      activePlayerId: finished || completedBoxes.length ? (finished ? null : playerId) :
        game.players.find((entry) => entry.id !== playerId).id,
      lastMove: edgeIndex,
      lastCompletedBoxes: completedBoxes,
      updatedAt: Date.now()
    };
  }

  chooseDotsAndBoxesMove(game, playerId, nodeLimit = 30000) {
    if (game?.phase !== "playing" || game.activePlayerId !== playerId) return null;

    const boxEdges = Array.from({ length: game.boxes.length }, (_, box) =>
      this.getDotsBoxEdges(box)
    );
    const fullMask = (1n << BigInt(game.edges.length)) - 1n;
    let initialMask = 0n;
    game.edges.forEach((edge, index) => {
      if (edge) initialMask |= 1n << BigInt(index);
    });
    const transpositions = new Map();
    let nodes = 0;

    const sidesInBox = (mask, edges) =>
      edges.reduce((count, edge) => count + Number(Boolean(mask & (1n << BigInt(edge)))), 0);
    const movesFor = (mask) => {
      const captures = [];
      const safe = [];
      const all = [];
      for (let edge = 0; edge < game.edges.length; edge++) {
        const bit = 1n << BigInt(edge);
        if (mask & bit) continue;
        all.push(edge);
        let boxesCompleted = 0;
        let createsCapture = false;
        for (const edges of boxEdges) {
          if (edges.includes(edge)) {
            const sides = sidesInBox(mask, edges);
            if (sides === 3) createsCapture = true;
            if (sides === 3) boxesCompleted++;
          }
        }
        if (boxesCompleted) captures.push({ edge, boxesCompleted });
        if (!createsCapture) safe.push(edge);
      }
      const candidates = captures.length ? captures :
        safe.length ? safe.map((edge) => ({ edge, boxesCompleted: 0 })) :
          all.map((edge) => ({ edge, boxesCompleted: 0 }));
      candidates.sort((a, b) => b.boxesCompleted - a.boxesCompleted);
      return candidates;
    };
    const evaluate = (mask, turn) => {
      let value = 0;
      for (const edges of boxEdges) {
        const sides = sidesInBox(mask, edges);
        if (sides === 4) continue;
        if (sides === 3) value += turn === playerId ? 0.9 : -0.9;
        else if (sides === 2) value += turn === playerId ? 0.08 : -0.08;
      }
      return value;
    };

    const search = (mask, turn, depth, alpha, beta) => {
      nodes++;
      if (mask === fullMask) return 0;
      if (depth === 0 || nodes >= nodeLimit) return evaluate(mask, turn);

      const key = `${mask}:${turn}`;
      const cached = transpositions.get(key);
      if (cached !== undefined) return cached;

      const maximizing = turn === playerId;
      let best = maximizing ? -Infinity : Infinity;
      let fullySearched = true;
      for (const move of movesFor(mask)) {
        const nextMask = mask | (1n << BigInt(move.edge));
        const score = move.boxesCompleted * (maximizing ? 1 : -1) +
          search(nextMask, move.boxesCompleted ? turn : game.players.find((entry) => entry.id !== turn).id,
            depth - 1, alpha, beta);
        if (maximizing) {
          best = Math.max(best, score);
          alpha = Math.max(alpha, best);
        } else {
          best = Math.min(best, score);
          beta = Math.min(beta, best);
        }
        if (beta <= alpha || nodes >= nodeLimit) {
          fullySearched = false;
          break;
        }
      }
      if (fullySearched) transpositions.set(key, best);
      return Number.isFinite(best) ? best : 0;
    };

    let bestEdge = null;
    let bestScore = -Infinity;
    let alpha = -Infinity;
    for (const move of movesFor(initialMask)) {
      const turnAfterMove = move.boxesCompleted
        ? playerId
        : game.players.find((entry) => entry.id !== playerId).id;
      const score = move.boxesCompleted +
        search(initialMask | (1n << BigInt(move.edge)), turnAfterMove, 17, alpha, Infinity);
      if (score > bestScore) {
        bestScore = score;
        bestEdge = move.edge;
      }
      alpha = Math.max(alpha, bestScore);
      if (nodes >= nodeLimit) break;
    }
    return bestEdge;
  }
}
