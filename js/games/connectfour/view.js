function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

export class ConnectFourView {
  constructor(root, { t = (value) => value } = {}) {
    if (!root) throw new TypeError('ConnectFourView requires a root element');
    this.root = root;
    this.t = t;
    this.handlers = null;
    this.root.classList.add('standalone-game', 'connectfour-root');
    this.root.innerHTML = `
      <div class="turn-game-shell">
        <div class="connectfour-scores" id="connectfour-scores" aria-label="Players and scores"></div>
        <p class="turn-game-status" id="connectfour-status" role="status" aria-live="polite"></p>
        <div class="connectfour-drop-row" id="connectfour-drop-row" role="group" aria-label="Choose a column"></div>
        <div class="connectfour-board" id="connectfour-board" role="grid" aria-label="Connect Four board"></div>
        <p class="turn-game-rule">${escapeHtml(t('Connect four discs in a row.'))}</p>
      </div>`;
    this.scores = root.querySelector('#connectfour-scores');
    this.status = root.querySelector('#connectfour-status');
    this.dropRow = root.querySelector('#connectfour-drop-row');
    this.board = root.querySelector('#connectfour-board');
    this.onClick = (event) => {
      const button = event.target.closest('[data-column]');
      if (button && !button.disabled && this.root.contains(button)) {
        this.handlers?.onDrop?.(Number(button.dataset.column));
      }
    };
    this.root.addEventListener('click', this.onClick);
  }

  mountHandlers({ onDrop } = {}) {
    this.handlers = { onDrop };
  }

  render(state, playerId, { pending = false, mode = '1P' } = {}) {
    const names = Object.fromEntries((state.players || []).map((player) => [player.id, player.name]));
    const playerName = (id) => id === 'p2' && mode === '1P'
      ? this.t('Computer')
      : names[id] || this.t(id === 'p2' ? 'Computer' : 'Player 1');
    const label = (id) => escapeHtml(playerName(id));
    this.scores.innerHTML = ['p1', 'p2'].map((id) => `<div class="connectfour-score${state.currentPlayerId === id && state.phase === 'playing' ? ' is-turn' : ''}" data-player="${id}"><span>${label(id)}${playerId === id ? ` · ${escapeHtml(this.t('You'))}` : ''}</span><i aria-hidden="true"></i></div>`).join('');
    this.status.textContent = state.phase === 'finished'
      ? state.winnerId ? `${playerName(state.winnerId)} ${this.t('wins!')}` : this.t('It’s a tie')
      : pending ? this.t('Computer is thinking…')
        : state.currentPlayerId === playerId ? this.t('Your turn — choose a column.')
          : `${playerName(state.currentPlayerId)} ${this.t('is thinking…')}`;
    const canPlay = state.phase === 'playing' && !pending && state.currentPlayerId === playerId;
    const columns = Array.from({ length: 7 }, (_, column) => column);
    this.dropRow.innerHTML = columns.map((column) => {
      const full = state.board[column] !== null;
      const name = `${this.t('Drop in column')} ${column + 1}`;
      return `<button type="button" class="connectfour-drop" data-column="${column}" aria-label="${escapeHtml(name)}" ${!canPlay || full ? 'disabled' : ''}>↓</button>`;
    }).join('');
    this.board.innerHTML = state.board.map((mark, index) => {
      const playerClass = mark ? ` is-${mark}` : '';
      const row = Math.floor(index / 7) + 1;
      const column = (index % 7) + 1;
      return `<div class="connectfour-cell${playerClass}" role="gridcell" aria-label="${escapeHtml(this.t('Row'))} ${row}, ${escapeHtml(this.t('Column'))} ${column}${mark ? `, ${label(mark)}` : ''}"><span>${mark ? (mark === 'p1' ? '●' : '●') : ''}</span></div>`;
    }).join('');
  }

  dispose() {
    this.root.removeEventListener('click', this.onClick);
    this.handlers = null;
  }
}
