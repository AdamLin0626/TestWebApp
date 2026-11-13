const WIDTH = 100;
const HEIGHT = 160;
const GOAL_MIN = 33;
const GOAL_MAX = 67;
const PUCK_RADIUS = 3.2;
const PADDLE_RADIUS = 8.2;
const WIN_SCORE = 7;
const X_SCALE = WIDTH / HEIGHT;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const clone = (value) => JSON.parse(JSON.stringify(value));

function normalizePlayers(players = [], localName = 'Player') {
  return [
    { id: 'p1', name: players[0]?.name || localName || 'Player' },
    { id: 'p2', name: players[1]?.name || 'Computer' }
  ];
}

function makePuck(direction = -1) {
  return {
    x: 50,
    y: 80,
    vx: (Math.random() - 0.5) * 18,
    vy: direction * 48
  };
}

export class AirHockeyModel {
  createGame(players = [], { restartAt = Date.now(), localName = 'Player' } = {}) {
    return {
      gameType: 'airhockey',
      phase: 'playing',
      restartAt,
      moveCount: 0,
      players: normalizePlayers(players, localName),
      scores: { p1: 0, p2: 0 },
      winnerId: null,
      paddles: {
        p1: { x: 50, y: 137 },
        p2: { x: 50, y: 23 }
      },
      puck: makePuck(),
      serveAt: 0,
      lastScorer: null
    };
  }

  setPaddle(game, playerId, x, y) {
    if (!game || !['p1', 'p2'].includes(playerId) || game.phase !== 'playing') return game;
    const next = clone(game);
    const bounds = playerId === 'p1' ? [98, 151] : [9, 62];
    next.paddles[playerId] = {
      x: clamp(Number.isFinite(Number(x)) ? Number(x) : 50, 9, 91),
      y: clamp(Number.isFinite(Number(y)) ? Number(y) : (playerId === 'p1' ? 137 : 23), bounds[0], bounds[1])
    };
    next.moveCount += 1;
    return next;
  }

  moveComputerPaddle(game, deltaSeconds) {
    if (!game || game.phase !== 'playing') return game;
    const puck = game.puck;
    const targetX = puck.y < 96 ? puck.x : 50;
    const targetY = puck.y < 67 ? clamp(puck.y + 11, 18, 54) : 31;
    const factor = Math.min(1, Math.max(0.04, deltaSeconds * 4.6));
    const paddle = game.paddles.p2;
    return this.setPaddle(
      game,
      'p2',
      paddle.x + (targetX - paddle.x) * factor,
      paddle.y + (targetY - paddle.y) * factor
    );
  }

  step(game, deltaSeconds, now = Date.now()) {
    if (!game || game.phase !== 'playing' || now < game.serveAt) return game;
    const next = clone(game);
    const dt = clamp(Number(deltaSeconds) || 0, 0, 0.035);
    const puck = next.puck;
    puck.x += puck.vx * dt;
    puck.y += puck.vy * dt;

    if (puck.x < PUCK_RADIUS) {
      puck.x = PUCK_RADIUS;
      puck.vx = Math.abs(puck.vx);
    } else if (puck.x > WIDTH - PUCK_RADIUS) {
      puck.x = WIDTH - PUCK_RADIUS;
      puck.vx = -Math.abs(puck.vx);
    }

    if (puck.y < PUCK_RADIUS) {
      if (puck.x >= GOAL_MIN && puck.x <= GOAL_MAX) return this._score(next, 'p1', now);
      puck.y = PUCK_RADIUS;
      puck.vy = Math.abs(puck.vy);
    } else if (puck.y > HEIGHT - PUCK_RADIUS) {
      if (puck.x >= GOAL_MIN && puck.x <= GOAL_MAX) return this._score(next, 'p2', now);
      puck.y = HEIGHT - PUCK_RADIUS;
      puck.vy = -Math.abs(puck.vy);
    }

    for (const playerId of ['p1', 'p2']) {
      const paddle = next.paddles[playerId];
      const dx = puck.x - paddle.x;
      const dy = puck.y - paddle.y;
      const physicalDx = dx * X_SCALE;
      const distance = Math.hypot(physicalDx, dy);
      const minimum = PADDLE_RADIUS + PUCK_RADIUS;
      if (distance >= minimum || distance < 0.001) continue;
      const nx = physicalDx / distance;
      const ny = dy / distance;
      puck.x = paddle.x + (nx * (minimum + 0.15)) / X_SCALE;
      puck.y = paddle.y + ny * (minimum + 0.15);
      const dot = puck.vx * X_SCALE * nx + puck.vy * ny;
      if (dot < 0) {
        puck.vx -= (2 * dot * nx) / X_SCALE;
        puck.vy -= 2 * dot * ny;
      }
      puck.vx += nx * 5.5 / X_SCALE;
      puck.vy += ny * 5.5;
      const speed = Math.hypot(puck.vx * X_SCALE, puck.vy);
      if (speed > 86) {
        const scale = 86 / speed;
        puck.vx *= scale;
        puck.vy *= scale;
      }
    }

    next.moveCount += 1;
    return next;
  }

  _score(game, scorer, now) {
    const next = clone(game);
    next.scores[scorer] += 1;
    next.lastScorer = scorer;
    next.moveCount += 1;
    if (next.scores[scorer] >= WIN_SCORE) {
      next.phase = 'finished';
      next.winnerId = scorer;
      return next;
    }
    next.paddles = { p1: { x: 50, y: 137 }, p2: { x: 50, y: 23 } };
    next.puck = makePuck(scorer === 'p1' ? 1 : -1);
    next.serveAt = now + 750;
    return next;
  }

  isValidSnapshot(snapshot) {
    return Boolean(snapshot && snapshot.gameType === 'airhockey'
      && ['playing', 'finished'].includes(snapshot.phase)
      && snapshot.scores && Number.isFinite(snapshot.scores.p1) && Number.isFinite(snapshot.scores.p2)
      && snapshot.puck && Number.isFinite(snapshot.puck.x) && Number.isFinite(snapshot.puck.y)
      && Number.isFinite(snapshot.restartAt) && Number.isFinite(snapshot.moveCount));
  }
}
