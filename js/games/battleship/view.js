const SIZE = 10;

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})[character]);

const shipName = (id, t) => t(id[0].toUpperCase() + id.slice(1));

const styles = `
.bs-game{--bs-paper:#f5f2ea;--bs-ink:#342c3b;--bs-orange:#e48755;--bs-purple:#6437e8;--bs-line:#e6ded2;min-height:0;flex:1;color:var(--bs-ink);background:transparent;font:500 14px/1.4 Inter,ui-sans-serif,system-ui,sans-serif;padding:0;box-sizing:border-box;max-width:520px;margin:0 auto}
.bs-game *{box-sizing:border-box}.bs-game button{font:inherit;color:inherit;cursor:pointer}
.bs-button{min-height:34px;border:1px solid var(--bs-line);border-radius:11px;background:#fff;padding:7px 12px;font-size:11px;font-weight:650}
.bs-button:focus-visible,.bs-cell:focus-visible{outline:3px solid #c5a6fa;outline-offset:2px}
.bs-button-primary{background:var(--bs-orange);border-color:var(--bs-orange);color:#281c28!important;font-weight:750}
.bs-button:disabled{opacity:.55;cursor:not-allowed}
.bs-status{min-height:1.5em;margin:4px 0 8px;color:#62586c;text-align:center;font-size:11px;font-weight:650}
.bs-boards{display:grid;grid-template-columns:1fr;gap:11px}
.bs-board-panel{min-width:0;border:1px solid var(--bs-line);border-radius:14px;background:#fff;padding:12px;box-shadow:0 2px 6px #342c3b0d}
.bs-board-panel h2{font-size:11px;margin:0 0 9px;text-align:center}
.bs-board{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:3px;aspect-ratio:1;width:100%;margin:0 auto}
.bs-cell{display:grid;place-items:center;min-width:0;padding:0;border:1px solid #d6c6b8;border-radius:4px;background:#fff;aspect-ratio:1;font-size:clamp(8px,2vw,13px);line-height:1}
.bs-cell-marker{line-height:1;transform:translateY(-1px)}
.bs-cell:disabled{cursor:default}
.bs-cell-ship{background:#e8c99e}
.bs-cell-hit{background:#e87962;color:#211617}
.bs-cell-miss{background:#dce7e6}
.bs-cell-sunk{background:#75528f;color:#fff}
.bs-legend{display:flex;justify-content:center;flex-wrap:wrap;gap:9px;margin:10px 0;color:#574961;font-size:10px}
.bs-legend span{display:inline-flex;align-items:center;gap:4px}
.bs-mark{width:10px;height:10px;border-radius:3px;background:#e8c99e}
.bs-mark-hit{background:#e87962}
.bs-mark-miss{background:#dce7e6}
.bs-mark-sunk{background:#75528f}
.bs-setup-controls{display:grid;gap:8px;margin:8px 0;border:1px solid var(--bs-line);border-radius:14px;background:#fff;padding:9px}
.bs-ship-picker{display:flex;justify-content:center;flex-wrap:wrap;gap:6px}
.bs-ship-token{display:flex;min-height:34px;align-items:center;gap:5px;border:1px solid var(--bs-line);border-radius:10px;background:#fff;padding:5px 8px;font-size:10px;font-weight:650;touch-action:none;user-select:none}
.bs-ship-token.is-selected{border-color:var(--bs-purple);box-shadow:0 0 0 2px #6437e822}
.bs-ship-token.is-dragging{opacity:.6}
.bs-ship-shape{display:flex;gap:2px}
.bs-ship-shape i{width:6px;height:13px;border-radius:2px;background:#e8c99e}
.bs-control-row{display:flex;justify-content:center;flex-wrap:wrap;gap:7px}

/* 遊玩階段：上方小面板與數據的平行排列 */
.bs-own-content{display:flex;align-items:center;justify-content:flex-start;gap:20px;padding:0 8px}
.bs-own-mini .bs-board-wrapper{width:160px;flex-shrink:0}
.bs-own-mini .bs-board{gap:2px}
.bs-own-mini .bs-cell{border-radius:2px}
.bs-stats{font-size:11px;color:#574961;display:flex;flex-direction:column;gap:8px;font-weight:650;white-space:nowrap}
.bs-stats strong{color:#342c3b;font-weight:750;margin-left:4px}

.bs-help{margin:4px 0 10px;color:#655c68;text-align:center;font-size:10px}
.bs-game[data-phase="setup"] .bs-boards{margin-top:5px}
`;

export class BattleshipView {
  constructor({ root, t = (value) => value, onAction = () => {} } = {}) {
    if (!root) throw new TypeError('BattleshipView requires a root element');
    this.root = root;
    this.t = t;
    this.onAction = onAction;
    this.styleElement = document.createElement('style');
    this.styleElement.textContent = styles;
    this.root.append(this.styleElement);
    this.handleClick = this.handleClick.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handlePointerCancel = this.handlePointerCancel.bind(this);
    this.root.addEventListener('click', this.handleClick);
    this.root.addEventListener('pointerdown', this.handlePointerDown);
    this.root.addEventListener('pointerup', this.handlePointerUp);
    this.root.addEventListener('pointercancel', this.handlePointerCancel);
    this.drag = null;
  }

  render(snapshot, playerId) {
    const t = this.t;
    const mode = snapshot.mode;
    const phase = snapshot.phase;
    const ownId = playerId;
    const targetId = ownId === 'p1' ? 'p2' : 'p1';
    const own = snapshot.players[ownId] || { ships: [] };
    const ownShips = own.ships || [];
    const selected = snapshot.selectedShipId || 'carrier';
    const ownShots = snapshot.shots[ownId] || [];
    const incomingShots = snapshot.shots[targetId] || [];
    const allPlaced = ownShips.length === 5 && ownShips.every((ship) => ship.coordinates?.length === ship.length);
    let status;
    if (phase === 'finished') {
      status = snapshot.winner === ownId ? t('You win!') : t('Game over');
    } else if (phase === 'setup') {
      status = mode === '2P'
        ? (allPlaced
          ? (own.ready ? t('Fleet ready. Waiting for the other player.') : t('Fleet placed. Press Ready when you are done.'))
          : t('Place your fleet on your board.'))
        : t('Place your fleet, then start the game.');
    } else if (mode === '2P') {
      status = snapshot.currentPlayerId === ownId ? t('Your turn. Choose a target cell.') : t('Opponent’s turn.');
    } else {
      status = snapshot.currentPlayerId === 'p1' ? t('Your turn. Choose a target cell.') : t('Computer is choosing a target.');
    }

    const shipOptions = ownShips.map((ship) => {
      const placed = ship.coordinates?.length === ship.length;
      const shape = Array.from({ length: ship.length }, () => '<i></i>').join('');
      return `<button class="bs-ship-token${ship.id === selected ? ' is-selected' : ''}" type="button" data-action="select-ship" data-drag-ship="${escapeHtml(ship.id)}" aria-pressed="${ship.id === selected}" aria-label="${escapeHtml(shipName(ship.id, t))}, ${ship.length}${placed ? '' : `, ${escapeHtml(t('Not placed'))}`}"><span class="bs-ship-shape" aria-hidden="true">${shape}</span><span>${escapeHtml(shipName(ship.id, t))}${placed ? ' ✓' : ''}</span></button>`;
    }).join('');
    
    const controls = phase === 'setup'
      ? `<div class="bs-setup-controls"><div class="bs-ship-picker" aria-label="${escapeHtml(t('Ship'))}">${shipOptions}</div><div class="bs-control-row"><button class="bs-button" type="button" data-action="rotate">${escapeHtml(t('Rotate'))} · ${escapeHtml(t(snapshot.orientation === 'vertical' ? 'vertical' : 'horizontal'))}</button><button class="bs-button" type="button" data-action="auto-place">${escapeHtml(t('Auto-place fleet'))}</button>${mode === '1P' ? `<button class="bs-button bs-button-primary" type="button" data-action="start" ${allPlaced ? '' : 'disabled'}>${escapeHtml(t('Start game'))}</button>` : `<button class="bs-button bs-button-primary" type="button" data-action="ready" ${allPlaced && !own.ready ? '' : 'disabled'}>${escapeHtml(t(own.ready ? 'Ready ✓' : 'Ready'))}</button>`}</div></div>`
      : '';
      
    const ownBoard = this.renderBoard({
      board: 'own', title: t(mode === '2P' ? 'Your fleet' : 'Opponent attack progress'),
      ships: ownShips, shots: incomingShots, phase, mode, active: phase === 'setup', playerId: ownId,
    });
    
    const targetBoard = this.renderBoard({
      board: 'target', title: t(mode === '2P' ? 'Opponent’s board' : 'Computer’s board'),
      ships: [], shots: ownShots, phase, mode,
      active: phase === 'playing' && snapshot.currentPlayerId === ownId, playerId: ownId,
    });

    const boards = phase === 'setup'
      ? ownBoard
      : `${ownBoard}${targetBoard}`;
      
    this.root.innerHTML = `<style>${styles}</style><section class="bs-game" data-phase="${phase}" aria-label="${escapeHtml(t('Battleship game'))}"><p class="bs-status" role="status" aria-live="polite">${escapeHtml(status)}</p>${controls}<p class="bs-help">${escapeHtml(phase === 'setup' ? t('Drag a ship to your board. Tap a ship to select it; rotate before placing.') : t('Select a cell on the opposing board to fire.'))}</p><div class="bs-boards">${boards}</div><div class="bs-legend" aria-label="${escapeHtml(t('Board legend'))}"><span><i class="bs-mark"></i>${escapeHtml(t('Ship'))}</span><span><i class="bs-mark bs-mark-hit"></i>${escapeHtml(t('Hit'))}</span><span><i class="bs-mark bs-mark-miss"></i>${escapeHtml(t('Miss'))}</span><span><i class="bs-mark bs-mark-sunk"></i>${escapeHtml(t('Sunk'))}</span></div></section>`;
  }

  renderBoard({ board, title, ships, shots, phase, active, playerId }) {
    const t = this.t;
    const occupied = new Map();
    for (const ship of ships) {
      for (const index of ship.coordinates || []) occupied.set(index, ship);
    }
    const shotMap = new Map(shots.map((shot) => [shot.index, shot]));
    const sunkShipIds = new Set(shots.filter((shot) => shot.sunkShipId).map((shot) => shot.sunkShipId));
    let cells = '';
    for (let index = 0; index < SIZE * SIZE; index += 1) {
      const ship = occupied.get(index);
      const shot = shotMap.get(index);
      const classes = ['bs-cell'];
      let marker = '';
      if (ship?.sunk || (ship && sunkShipIds.has(ship.id))) {
        classes.push('bs-cell-sunk');
      } else if (ship) {
        classes.push('bs-cell-ship');
      }
      if (shot?.result === 'hit') {
        if (shot.sunkShipId || sunkShipIds.has(shot.shipId) || ship?.sunk) {
          classes.push('bs-cell-sunk');
        } else {
          classes.push('bs-cell-hit');
        }
        marker = shot.sunkShipId ? '✕' : '×';
      } else if (shot?.result === 'miss') {
        classes.push('bs-cell-miss');
        marker = '•';
      }

      const disabled = !active || (board === 'target' && Boolean(shot)) || shot?.result === 'pending';
      const row = Math.floor(index / SIZE) + 1;
      const column = index % SIZE + 1;
      let description = `${t(board === 'own' ? 'Your board' : 'Opponent board')}, ${t('row')} ${row}, ${t('column')} ${column}`;
      if (ship) description += `, ${shipName(ship.id, t)}`;
      if (shot?.result === 'hit') description += `, ${t('Hit')}`;
      if (shot?.result === 'miss') description += `, ${t('Miss')}`;
      if (shot?.result === 'pending') description += `, ${t('Shot pending')}`;
      if (phase === 'setup' && board === 'own' && active) description += `, ${t('Place ship here')}`;
      if (board === 'target' && active && !shot) description += `, ${t('Fire here')}`;
      cells += `<button type="button" class="${classes.join(' ')}" data-action="cell" data-board="${board}" data-index="${index}" aria-label="${escapeHtml(description)}"${disabled ? ' disabled' : ''}>${marker ? `<span class="bs-cell-marker" aria-hidden="true">${marker}</span>` : ''}</button>`;
    }

    const isPlayingOwn = phase === 'playing' && board === 'own';
    if (isPlayingOwn) {
      const hitsTaken = shots.filter((s) => s.result === 'hit').length;
      const sunkCount = ships.filter((ship) => ship.coordinates?.length > 0 && ship.coordinates.every((c) => shotMap.get(c)?.result === 'hit')).length;
      const activeShips = (ships.length > 0 ? ships.length : 5) - sunkCount;

      return `<section class="bs-board-panel bs-own-mini" aria-label="${escapeHtml(title)}"><h2>${escapeHtml(title)}</h2><div class="bs-own-content"><div class="bs-board-wrapper"><div class="bs-board" role="group" aria-label="${escapeHtml(title)}">${cells}</div></div><div class="bs-stats"><div>${escapeHtml(t('Hits taken'))} <strong>${hitsTaken}/17</strong></div><div>${escapeHtml(t('Ships active'))} <strong>${activeShips}/${ships.length || 5}</strong></div></div></div></section>`;
    }

    return `<section class="bs-board-panel" aria-label="${escapeHtml(title)}"><h2>${escapeHtml(title)}</h2><div class="bs-board" role="group" aria-label="${escapeHtml(title)}">${cells}</div></section>`;
  }

  handleClick(event) {
    const element = event.target.closest('[data-action]');
    if (!element || !this.root.contains(element)) return;
    if (element.dataset.action === 'select-ship') {
      this.onAction({ type: 'select-ship', shipId: element.dataset.dragShip });
      return;
    }
    if (element.dataset.action === 'cell') {
      this.onAction({ type: 'cell', board: element.dataset.board, index: Number(element.dataset.index) });
      return;
    }
    this.onAction({ type: element.dataset.action });
  }

  handlePointerDown(event) {
    const token = event.target.closest('[data-drag-ship]');
    if (!token || !this.root.contains(token)) return;
    this.drag = { shipId: token.dataset.dragShip, pointerId: event.pointerId, element: token };
    token.classList.add('is-dragging');
  }

  handlePointerUp(event) {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    const { shipId } = this.drag;
    this.drag.element.classList.remove('is-dragging');
    this.drag = null;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-action="cell"][data-board="own"]');
    if (target && this.root.contains(target)) {
      this.onAction({ type: 'drop-ship', shipId, index: Number(target.dataset.index) });
    }
  }

  handlePointerCancel(event) {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    this.drag.element.classList.remove('is-dragging');
    this.drag = null;
  }

  dispose() {
    this.root.removeEventListener('click', this.handleClick);
    this.root.removeEventListener('pointerdown', this.handlePointerDown);
    this.root.removeEventListener('pointerup', this.handlePointerUp);
    this.root.removeEventListener('pointercancel', this.handlePointerCancel);
    this.root.replaceChildren();
  }
}