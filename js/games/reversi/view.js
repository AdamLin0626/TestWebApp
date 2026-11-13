function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

export class ReversiView {
  constructor(root, { t = (value) => value } = {}) {
    if (!root) throw new TypeError('ReversiView requires a root element');
    this.root = root;
    this.t = t;
    this.handlers = null;
    this.root.classList.add('standalone-game', 'reversi-root');
    this.root.innerHTML = `
      <div class="turn-game-shell">
        <div class="reversi-scores" id="reversi-scores" aria-label="Players and scores"></div>
        <p class="turn-game-status" id="reversi-status" role="status" aria-live="polite"></p>
        <div class="reversi-board" id="reversi-board" role="grid" aria-label="Reversi 8 by 8 board"></div>
        <p class="turn-game-rule">${escapeHtml(t('Place a disc to outflank and flip your opponent’s discs. Most discs wins.'))}</p>
      </div>`;
    this.scores = root.querySelector('#reversi-scores');
    this.status = root.querySelector('#reversi-status');
    this.board = root.querySelector('#reversi-board');
    this.onClick = (event) => {
      const button = event.target.closest('[data-square]');
      if (button && !button.disabled && this.root.contains(button)) {
        this.handlers?.onMove?.(Number(button.dataset.square));
      }
    };
    this.root.addEventListener('click', this.onClick);
  }

  mountHandlers({ onMove } = {}) {
    this.handlers = { onMove };
  }

  render(state, playerId, legalMoves = [], { pending = false, mode = '1P' } = {}) {
    const names = Object.fromEntries((state.players || []).map((player) => [player.id, player.name]));
    const playerName = (id) => id === 'p2' && mode === '1P'
      ? this.t('Computer')
      : names[id] || this.t(id === 'p2' ? 'Computer' : 'Player 1');
    const label = (id) => escapeHtml(playerName(id));
    this.scores.innerHTML = ['p1', 'p2'].map((id) => `<div class="reversi-score${state.currentPlayerId === id && state.phase === 'playing' ? ' is-turn' : ''}" data-player="${id}"><span><i class="reversi-disc reversi-disc-${id}" aria-hidden="true"></i>${label(id)}${playerId === id ? ` · ${escapeHtml(this.t('You'))}` : ''}</span><strong>${state.scores[id]}</strong></div>`).join('');
    this.status.textContent = state.phase === 'finished'
      ? state.winnerId ? `${playerName(state.winnerId)} ${this.t('wins!')}` : this.t('It’s a tie')
      : state.passedPlayerId ? `${playerName(state.passedPlayerId)} ${this.t('has no legal moves and passes.')}`
        : pending ? this.t('Computer is thinking…')
          : state.currentPlayerId === playerId ? this.t('Your turn — choose a highlighted square.')
            : `${playerName(state.currentPlayerId)} ${this.t('is thinking…')}`;
    const legal = new Set(legalMoves);
    const canPlay = state.phase === 'playing' && !pending && state.currentPlayerId === playerId;
    this.board.innerHTML = state.board.map((mark, index) => {
      const row = Math.floor(index / 8) + 1;
      const column = (index % 8) + 1;
      const available = legal.has(index);
      const disc = mark ? `<span class="reversi-disc reversi-disc-${mark}" aria-hidden="true"></span>` : '';
      return `<button type="button" class="reversi-cell${available && canPlay ? ' is-legal' : ''}" data-square="${index}" role="gridcell" aria-label="${escapeHtml(this.t('Row'))} ${row}, ${escapeHtml(this.t('Column'))} ${column}${mark ? `, ${label(mark)}` : available ? `, ${escapeHtml(this.t('Legal move'))}` : ''}" ${!canPlay || !available ? 'disabled' : ''}>${disc}</button>`;
    }).join('');
  }

  dispose() {
    this.root.removeEventListener('click', this.onClick);
    this.handlers = null;
  }
}
