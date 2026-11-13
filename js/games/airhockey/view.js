function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

export class AirHockeyView {
  constructor(root, { t = (value) => value } = {}) {
    if (!root) throw new TypeError('AirHockeyView requires a root element');
    this.root = root;
    this.t = t;
    this.handlers = null;
    this.state = null;
    this.playerId = 'p1';
    this.root.classList.add('standalone-game', 'airhockey-root');
    this.root.innerHTML = `
      <div class="airhockey-shell">
        <div class="airhockey-scorebar" id="airhockey-scorebar" role="status" aria-live="polite"></div>
        <canvas class="airhockey-table" id="airhockey-table" tabindex="0" aria-label="Air hockey table"></canvas>
        <p class="airhockey-hint" id="airhockey-hint"></p>
      </div>`;
    this.canvas = root.querySelector('#airhockey-table');
    this.scorebar = root.querySelector('#airhockey-scorebar');
    this.hint = root.querySelector('#airhockey-hint');
    this.context = this.canvas.getContext('2d');
    this.onPointer = (event) => {
      if (!this.handlers?.onMove) return;
      const bounds = this.canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      this.canvas.focus({ preventScroll: true });
      this.handlers.onMove({
        x: ((event.clientX - bounds.left) / bounds.width) * 100,
        y: ((event.clientY - bounds.top) / bounds.height) * 160
      });
    };
    this.onKeyDown = (event) => {
      const directions = {
        ArrowLeft: [-4, 0], ArrowRight: [4, 0], ArrowUp: [0, -4], ArrowDown: [0, 4]
      };
      const direction = directions[event.key];
      if (!direction || !this.handlers?.onKeyMove) return;
      event.preventDefault();
      this.handlers.onKeyMove(direction[0], direction[1]);
    };
    this.canvas.addEventListener('pointerdown', this.onPointer);
    this.canvas.addEventListener('pointermove', this.onPointer);
    this.canvas.addEventListener('keydown', this.onKeyDown);
  }

  mountHandlers({ onMove, onKeyMove } = {}) {
    this.handlers = { onMove, onKeyMove };
  }

  render(state, playerId, { mode = '1P' } = {}) {
    this.state = state;
    this.playerId = playerId;
    const names = Object.fromEntries((state.players || []).map((player) => [player.id, player.name]));
    const playerName = (id) => id === 'p2' && mode === '1P'
      ? this.t('Computer')
      : names[id] || this.t(id === 'p2' ? 'Computer' : 'Player 1');
    const p1 = escapeHtml(playerName('p1'));
    const p2 = escapeHtml(playerName('p2'));
    this.scorebar.innerHTML = `<div class="airhockey-player${state.phase === 'playing' && playerId === 'p1' ? ' is-turn' : ''}"><span>${p1}${playerId === 'p1' ? ` · ${escapeHtml(this.t('You'))}` : ''}</span><strong>${state.scores.p1}</strong></div><span class="airhockey-score-dash">:</span><div class="airhockey-player${state.phase === 'playing' && playerId === 'p2' ? ' is-turn' : ''}"><strong>${state.scores.p2}</strong><span>${p2}</span></div>`;
    this.hint.textContent = state.phase === 'finished'
      ? `${playerName(state.winnerId)} ${this.t('wins!')} · ${this.t('First to 7')}`
      : mode === '1P'
        ? this.t('Move your paddle with a finger, mouse, or arrow keys.')
        : this.t('Move your paddle. In a friend room, each player controls one end.');
    this.canvas.setAttribute('aria-label', this.t('Air hockey table. Move your paddle with a finger, mouse, or arrow keys.'));
    this._draw(state);
  }

  _draw(state) {
    const bounds = this.canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height || !this.context) return;
    const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const width = bounds.width;
    const height = bounds.height;
    const pixelWidth = Math.round(width * ratio);
    const pixelHeight = Math.round(height * ratio);
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }
    const context = this.context;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#f1ece4';
    context.fillRect(0, 0, width, height);

    const scaleX = width / 100;
    const scaleY = height / 160;
    context.save();
    context.scale(scaleX, scaleY);
    context.strokeStyle = '#d7cec3';
    context.lineWidth = 1.2;
    context.strokeRect(2, 2, 96, 156);
    context.beginPath();
    context.moveTo(2, 80);
    context.lineTo(98, 80);
    context.stroke();
    context.beginPath();
    context.arc(50, 80, 15, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = '#e48755';
    context.fillRect(33, 0, 34, 2.8);
    context.fillStyle = '#6437e8';
    context.fillRect(33, 157.2, 34, 2.8);

    for (const playerId of ['p1', 'p2']) {
      const paddle = state.paddles[playerId];
      context.beginPath();
      context.arc(paddle.x, paddle.y, 8.2, 0, Math.PI * 2);
      context.fillStyle = playerId === 'p1' ? '#e48755' : '#6437e8';
      context.fill();
      context.lineWidth = 1.2;
      context.strokeStyle = '#fff';
      context.stroke();
    }
    context.beginPath();
    context.arc(state.puck.x, state.puck.y, 3.2, 0, Math.PI * 2);
    context.fillStyle = '#342c3b';
    context.fill();
    context.restore();
  }

  dispose() {
    this.canvas.removeEventListener('pointerdown', this.onPointer);
    this.canvas.removeEventListener('pointermove', this.onPointer);
    this.canvas.removeEventListener('keydown', this.onKeyDown);
    this.handlers = null;
  }
}
