function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

export class MemoryView {
  constructor(root, { t = (value) => value } = {}) {
    if (!root) throw new TypeError('MemoryView requires a root element');
    this.root = root;
    this.t = t;
    this.handlers = null;
    this.root.classList.add('standalone-game', 'memory-root');
    this.root.innerHTML = `
      <div class="turn-game-shell">
        <div class="memory-scores" id="memory-scores" aria-label="Players and scores"></div>
        <p class="turn-game-status" id="memory-status" role="status" aria-live="polite"></p>
        <div class="memory-board" id="memory-board" role="group" aria-label="Memory match cards"></div>
        <p class="turn-game-rule">${escapeHtml(t('Find matching pairs. Correct matches earn a point and another turn.'))}</p>
      </div>`;
    this.scores = root.querySelector('#memory-scores');
    this.status = root.querySelector('#memory-status');
    this.board = root.querySelector('#memory-board');
    this.onClick = (event) => {
      const button = event.target.closest('[data-card]');
      if (button && !button.disabled && this.root.contains(button)) {
        this.handlers?.onFlip?.(Number(button.dataset.card));
      }
    };
    this.root.addEventListener('click', this.onClick);
  }

  mountHandlers({ onFlip } = {}) {
    this.handlers = { onFlip };
  }

  render(state, playerId, { pending = false, mode = '1P' } = {}) {
    const names = Object.fromEntries((state.players || []).map((player) => [player.id, player.name]));
    const playerName = (id) => id === 'p2' && mode === '1P'
      ? this.t('Computer')
      : names[id] || this.t(id === 'p2' ? 'Computer' : 'Player 1');
    const label = (id) => escapeHtml(playerName(id));
    this.scores.innerHTML = ['p1', 'p2'].map((id) => `<div class="memory-score${state.currentPlayerId === id && state.phase === 'playing' ? ' is-turn' : ''}" data-player="${id}"><span>${label(id)}${playerId === id ? ` · ${escapeHtml(this.t('You'))}` : ''}</span><strong>${state.scores[id]}</strong></div>`).join('');
    this.status.textContent = state.phase === 'finished'
      ? state.winnerId ? `${playerName(state.winnerId)} ${this.t('wins!')}` : this.t('It’s a tie')
      : state.phase === 'mismatch' ? this.t('No match — remember the cards!')
        : pending ? this.t('Computer is thinking…')
          : state.currentPlayerId === playerId ? this.t('Your turn — find a pair.')
            : `${playerName(state.currentPlayerId)} ${this.t('is thinking…')}`;
    const faceUp = new Set([...state.flipped, ...state.matched]);
    const locked = new Set(state.matched);
    this.board.innerHTML = state.deck.map((symbol, index) => {
      const visible = faceUp.has(index);
      const matched = locked.has(index);
      const disabled = matched || visible || state.phase !== 'playing' || pending || state.currentPlayerId !== playerId;
      return `<button type="button" class="memory-card${visible ? ' is-open' : ''}${matched ? ' is-matched' : ''}" data-card="${index}" aria-label="${escapeHtml(visible ? `${this.t('Card')} ${index + 1}: ${symbol}` : `${this.t('Hidden card')} ${index + 1}`)}" aria-pressed="${visible}" ${disabled ? 'disabled' : ''}><span class="memory-card-face">${visible ? symbol : '?'}</span></button>`;
    }).join('');
  }

  dispose() {
    this.root.removeEventListener('click', this.onClick);
    this.handlers = null;
  }
}
