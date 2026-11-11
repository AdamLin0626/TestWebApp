export const BATTLESHIP_FLEET = Object.freeze([
  Object.freeze({ id: 'carrier', length: 5 }),
  Object.freeze({ id: 'battleship', length: 4 }),
  Object.freeze({ id: 'cruiser', length: 3 }),
  Object.freeze({ id: 'submarine', length: 3 }),
  Object.freeze({ id: 'destroyer', length: 2 }),
]);

export const BATTLESHIP_BOARD_SIZE = 10;

const PLAYER_IDS = ['p1', 'p2'];
const CELL_COUNT = BATTLESHIP_BOARD_SIZE * BATTLESHIP_BOARD_SIZE;
const opponentOf = (playerId) => playerId === 'p1' ? 'p2' : 'p1';

function createShips() {
  return BATTLESHIP_FLEET.map(({ id, length }) => ({
    id,
    length,
    coordinates: [],
    orientation: 'horizontal',
    sunk: false,
  }));
}

function createPlayers() {
  return {
    p1: { ready: false, ships: createShips() },
    p2: { ready: false, ships: createShips() },
  };
}

function copyShot(shot) {
  return {
    index: shot.index,
    result: shot.result,
    shipId: shot.shipId || null,
    sunkShipId: shot.sunkShipId || null,
  };
}

export class BattleshipModel {
  constructor({ seed, mode = '1P', playerId = 'p1' } = {}) {
    this._initialSeed = seed;
    this._randomState = Number.isFinite(seed) ? seed >>> 0 : null;
    this.state = {};
    this.startNewGame({ mode, playerId });
  }

  startNewGame({ mode = this.state.mode || '1P', playerId = this.state.playerId || 'p1' } = {}) {
    if (this._initialSeed !== undefined) this._randomState = this._initialSeed >>> 0;
    this.state = {
      mode: mode === '2P' ? '2P' : '1P',
      playerId: PLAYER_IDS.includes(playerId) ? playerId : 'p1',
      phase: 'setup',
      currentPlayerId: 'p1',
      placementPlayerId: PLAYER_IDS.includes(playerId) ? playerId : 'p1',
      orientation: 'horizontal',
      selectedShipId: BATTLESHIP_FLEET[0].id,
      players: createPlayers(),
      shots: { p1: [], p2: [] },
      winner: null,
    };
    return this.state;
  }

  setSelectedShip(shipId) {
    if (BATTLESHIP_FLEET.some((ship) => ship.id === shipId)) {
      this.state.selectedShipId = shipId;
      return true;
    }
    return false;
  }

  setPlacementPlayer(playerId) {
    if (!PLAYER_IDS.includes(playerId) || this.state.phase !== 'setup') return false;
    this.state.placementPlayerId = playerId;
    return true;
  }

  placeShip(shipId, index, orientation = this.state.orientation, playerId = this.state.placementPlayerId) {
    if (this.state.phase !== 'setup' || !PLAYER_IDS.includes(playerId)) return false;
    const ship = this.state.players[playerId].ships.find((item) => item.id === shipId);
    if (!ship || !Number.isInteger(index) || index < 0 || index >= CELL_COUNT) return false;
    if (orientation !== 'horizontal' && orientation !== 'vertical') return false;

    const row = Math.floor(index / BATTLESHIP_BOARD_SIZE);
    const column = index % BATTLESHIP_BOARD_SIZE;
    const coordinates = [];
    for (let offset = 0; offset < ship.length; offset += 1) {
      const nextRow = row + (orientation === 'vertical' ? offset : 0);
      const nextColumn = column + (orientation === 'horizontal' ? offset : 0);
      if (nextRow >= BATTLESHIP_BOARD_SIZE || nextColumn >= BATTLESHIP_BOARD_SIZE) return false;
      coordinates.push(nextRow * BATTLESHIP_BOARD_SIZE + nextColumn);
    }

    const occupied = new Set(
      this.state.players[playerId].ships
        .filter((item) => item.id !== shipId)
        .flatMap((item) => item.coordinates),
    );
    if (coordinates.some((cell) => occupied.has(cell))) return false;

    ship.coordinates = coordinates;
    ship.orientation = orientation;
    ship.sunk = false;
    this.state.players[playerId].ready = false;
    return true;
  }

  rotate() {
    this.state.orientation = this.state.orientation === 'horizontal' ? 'vertical' : 'horizontal';
    return this.state.orientation;
  }

  autoPlace(playerId = this.state.placementPlayerId) {
    if (this.state.phase !== 'setup' || !PLAYER_IDS.includes(playerId)) return false;
    const ships = this.state.players[playerId].ships;
    this.state.players[playerId].ready = false;
    for (const ship of ships) {
      ship.coordinates = [];
      ship.sunk = false;
    }

    for (const ship of ships) {
      const candidates = Array.from({ length: CELL_COUNT * 2 }, (_, index) => index);
      this._shuffle(candidates);
      let placed = false;
      for (const candidate of candidates) {
        const orientation = candidate >= CELL_COUNT ? 'vertical' : 'horizontal';
        const index = candidate % CELL_COUNT;
        if (this.placeShip(ship.id, index, orientation, playerId)) {
          placed = true;
          break;
        }
      }
      if (!placed) {
        for (const item of ships) item.coordinates = [];
        this.state.players[playerId].ready = false;
        return false;
      }
    }
    return this._isFleetPlaced(playerId);
  }

  setPlayerReady(playerId, ready = true) {
    if (!PLAYER_IDS.includes(playerId) || this.state.phase !== 'setup') return false;
    if (ready && !this._isFleetPlaced(playerId)) return false;
    this.state.players[playerId].ready = Boolean(ready);
    return true;
  }

  startGame() {
    if (this.state.phase !== 'setup') return false;
    if (this.state.mode === '1P') {
      if (!this._isFleetPlaced('p1') || !this._isFleetPlaced('p2')) return false;
    } else if (!this._isFleetPlaced(this.state.playerId) || !this.state.players[this.state.playerId].ready) {
      return false;
    }
    this.state.phase = 'playing';
    this.state.currentPlayerId = 'p1';
    return true;
  }

  fire(index, playerId = this.state.playerId) {
    if (this.state.phase !== 'playing' || !PLAYER_IDS.includes(playerId)) {
      return { accepted: false, reason: 'not-playing' };
    }
    if (this.state.currentPlayerId !== playerId) return { accepted: false, reason: 'not-your-turn' };
    if (!Number.isInteger(index) || index < 0 || index >= CELL_COUNT) {
      return { accepted: false, reason: 'invalid-cell' };
    }
    if (this.state.shots[playerId].some((shot) => shot.index === index)) {
      return { accepted: false, reason: 'already-fired' };
    }

    const targetId = opponentOf(playerId);
    const targetShips = this.state.players[targetId].ships;
    const hasFleet = targetShips.some((ship) => ship.coordinates.length > 0);
    const shot = { index, result: hasFleet ? 'miss' : 'pending', shipId: null, sunkShipId: null };
    if (hasFleet) {
      const hitShip = targetShips.find((ship) => ship.coordinates.includes(index));
      if (hitShip) {
        shot.result = 'hit';
        shot.shipId = hitShip.id;
        const hitCells = new Set(
          this.state.shots[playerId]
            .filter((item) => item.result === 'hit' && item.shipId === hitShip.id)
            .map((item) => item.index),
        );
        hitCells.add(index);
        if (hitShip.coordinates.every((cell) => hitCells.has(cell))) {
          hitShip.sunk = true;
          shot.sunkShipId = hitShip.id;
        }
      }
    }

    this.state.shots[playerId].push(shot);
    this.state.currentPlayerId = targetId;
    if (shot.sunkShipId && targetShips.every((ship) => ship.sunk)) {
      this.state.winner = playerId;
      this.state.phase = 'finished';
    }
    return { accepted: true, ...copyShot(shot), by: playerId, targetId, winner: this.state.winner };
  }

  resolveShot(index, playerId, result, sunkShipId = null) {
    if (!PLAYER_IDS.includes(playerId) || !['hit', 'miss'].includes(result)) return false;
    const shot = [...this.state.shots[playerId]].reverse().find(
      (item) => item.index === index && item.result === 'pending',
    );
    if (!shot) return false;
    shot.result = result;
    shot.sunkShipId = sunkShipId || null;
    const targetId = opponentOf(playerId);
    if (sunkShipId) {
      const targetShip = this.state.players[targetId].ships.find((item) => item.id === sunkShipId);
      if (targetShip) targetShip.sunk = true;
    }
    this.state.currentPlayerId = targetId;
    if (sunkShipId && BATTLESHIP_FLEET.every(({ id }) =>
      this.state.players[targetId].ships.find((ship) => ship.id === id)?.sunk,
    )) {
      this.state.winner = playerId;
      this.state.phase = 'finished';
    }
    return true;
  }

  chooseComputerShot() {
    const playerId = 'p2';
    const tried = new Set(this.state.shots[playerId].map((shot) => shot.index));
    const available = (index) => index >= 0 && index < CELL_COUNT && !tried.has(index);
    const hitIndices = this.state.shots[playerId]
      .filter((shot) => shot.result === 'hit')
      .map((shot) => shot.index);
    const adjacent = [];
    for (const hit of hitIndices) {
      const row = Math.floor(hit / BATTLESHIP_BOARD_SIZE);
      const column = hit % BATTLESHIP_BOARD_SIZE;
      if (row > 0) adjacent.push(hit - BATTLESHIP_BOARD_SIZE);
      if (row < BATTLESHIP_BOARD_SIZE - 1) adjacent.push(hit + BATTLESHIP_BOARD_SIZE);
      if (column > 0) adjacent.push(hit - 1);
      if (column < BATTLESHIP_BOARD_SIZE - 1) adjacent.push(hit + 1);
    }
    const targets = [...new Set(adjacent)].filter(available);
    if (targets.length) return targets[Math.floor(this._random() * targets.length)];

    const hunt = Array.from({ length: CELL_COUNT }, (_, index) => index)
      .filter((index) => available(index));
    if (!hunt.length) return null;
    return hunt[Math.floor(this._random() * hunt.length)];
  }

  getSnapshot({ privateFor } = {}) {
    const isPrivate2P = this.state.mode === '2P';
    const players = {};
    for (const playerId of PLAYER_IDS) {
      const player = this.state.players[playerId];
      players[playerId] = { ready: player.ready };
      if (!isPrivate2P || (privateFor === playerId && privateFor === this.state.playerId)) {
        players[playerId].ships = player.ships.map((ship) => ({
          id: ship.id,
          length: ship.length,
          coordinates: [...ship.coordinates],
          orientation: ship.orientation,
          sunk: ship.sunk,
        }));
      }
    }
    return {
      version: 1,
      mode: this.state.mode,
      phase: this.state.phase,
      currentPlayerId: this.state.currentPlayerId,
      orientation: this.state.orientation,
      selectedShipId: this.state.selectedShipId,
      winner: this.state.winner,
      privateFor: privateFor === this.state.playerId ? privateFor : undefined,
      players,
      shots: {
        p1: this.state.shots.p1.map(copyShot),
        p2: this.state.shots.p2.map(copyShot),
      },
    };
  }

  loadSnapshot(snapshot, playerId = this.state.playerId) {
    if (!snapshot || snapshot.version !== 1 || !PLAYER_IDS.includes(playerId)) return false;
    if (!['1P', '2P'].includes(snapshot.mode) || !['setup', 'playing', 'finished'].includes(snapshot.phase)) return false;
    this.state.mode = snapshot.mode;
    this.state.phase = snapshot.phase;
    this.state.currentPlayerId = PLAYER_IDS.includes(snapshot.currentPlayerId) ? snapshot.currentPlayerId : 'p1';
    this.state.winner = PLAYER_IDS.includes(snapshot.winner) ? snapshot.winner : null;
    for (const id of PLAYER_IDS) {
      const incoming = snapshot.players?.[id];
      if (!incoming) continue;
      this.state.players[id].ready = incoming.ready === true;
      const mayLoadFleet = snapshot.mode === '1P'
        || (snapshot.privateFor === playerId && id === playerId);
      if (mayLoadFleet && Array.isArray(incoming.ships)) {
        for (const ship of this.state.players[id].ships) {
          const source = incoming.ships.find((item) => item.id === ship.id);
          if (!source || !Array.isArray(source.coordinates)) continue;
          if (source.coordinates.every((cell) => Number.isInteger(cell) && cell >= 0 && cell < CELL_COUNT)) {
            ship.coordinates = [...source.coordinates];
            ship.orientation = source.orientation === 'vertical' ? 'vertical' : 'horizontal';
            ship.sunk = source.sunk === true;
          }
        }
      }
    }
    for (const id of PLAYER_IDS) {
      if (Array.isArray(snapshot.shots?.[id])) {
        this.state.shots[id] = snapshot.shots[id]
          .filter((shot) => Number.isInteger(shot.index) && shot.index >= 0 && shot.index < CELL_COUNT
            && ['pending', 'hit', 'miss'].includes(shot.result))
          .map(copyShot);
      }
    }
    return true;
  }

  _isFleetPlaced(playerId) {
    return this.state.players[playerId].ships.every((ship) => ship.coordinates.length === ship.length);
  }

  _random() {
    if (this._randomState === null) return Math.random();
    this._randomState = (1664525 * this._randomState + 1013904223) >>> 0;
    return this._randomState / 0x100000000;
  }

  _shuffle(items) {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const other = Math.floor(this._random() * (index + 1));
      [items[index], items[other]] = [items[other], items[index]];
    }
  }
}
