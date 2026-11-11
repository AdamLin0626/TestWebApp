const STYLE = `
.chess-mvc-root{--chess-ink:#342c3b;--chess-paper:#f5f2ea;--chess-orange:#e48755;--chess-purple:#6437e8;min-height:100dvh;color:var(--chess-ink);font:500 13px/1.4 Inter,ui-sans-serif,system-ui,sans-serif;background:var(--chess-paper);padding:max(12px,env(safe-area-inset-top)) 14px max(86px,env(safe-area-inset-bottom));box-sizing:border-box;max-width:520px;margin:auto}
.chess-mvc-root *{box-sizing:border-box}.chess-mvc-root button{font:inherit;color:inherit}
.chess-mvc-root .chess-header{display:grid;grid-template-columns:1fr auto 1fr;grid-template-rows:auto auto;align-items:center;gap:8px;margin-bottom:10px}
.chess-mvc-root .chess-header h2{grid-column:2;grid-row:1;margin:0;font-size:15px;white-space:nowrap}.chess-mvc-root .chess-mode{grid-column:1;grid-row:2;justify-self:start;border-radius:14px;background:#ffe9df;padding:6px 9px;color:#d97843;font-size:9px;font-weight:750}.chess-mvc-root .chess-actions{grid-column:1/-1;grid-row:1;display:flex;justify-content:space-between;pointer-events:none}.chess-mvc-root .chess-actions button{pointer-events:auto}.chess-mvc-root .chess-header .chess-turn{display:none}
.chess-mvc-root .chess-layout{display:flex;flex-direction:column;gap:9px;align-items:stretch}
.chess-mvc-root .chess-board{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));width:100%;max-width:430px;margin:0 auto;aspect-ratio:1;border:3px solid #594d61;border-radius:9px;overflow:hidden}
.chess-mvc-root .chess-square{border:0;padding:0;display:grid;place-items:center;position:relative;cursor:pointer;min-width:0;aspect-ratio:1}
.chess-mvc-root .chess-square.light{background:#f4ead9}.chess-mvc-root .chess-square.dark{background:#bd9c91}
.chess-mvc-root .chess-square.selected{box-shadow:inset 0 0 0 4px var(--chess-orange)}
.chess-mvc-root .chess-square.last-move{background-image:linear-gradient(#efad6c66,#efad6c66)}
.chess-mvc-root .chess-square.legal:after{content:"";width:22%;height:22%;border-radius:50%;background:#7660928a;position:absolute}
.chess-mvc-root .chess-square.legal:has(.chess-piece):after{width:88%;height:88%;background:transparent;border:4px solid #766092aa}
.chess-mvc-root .chess-piece{width:80%;height:80%;z-index:1;pointer-events:none}
.chess-mvc-root .piece-white{color:#fffdf7;filter:drop-shadow(0 1px 1px #362b3b)}
.chess-mvc-root .piece-black{color:#43394b;filter:drop-shadow(0 1px 1px #fff8)}
.chess-mvc-root .chess-player{display:flex;width:100%;align-items:center;gap:8px;max-width:430px;min-height:36px;margin:0 auto;border:1px solid #e6ded2;border-radius:12px;background:#fff;padding:6px 10px;font-size:10px;font-weight:700}.chess-mvc-root .chess-player .chess-captures{margin-left:auto}.chess-mvc-root .chess-player.is-active{border-color:var(--chess-purple);box-shadow:0 0 0 2px #6437e81c}.chess-mvc-root .chess-layout>.chess-player:first-child{order:0}.chess-mvc-root .chess-layout>section{order:1}.chess-mvc-root .chess-layout>.chess-player:nth-child(3){order:2}
.chess-mvc-root .chess-panel{display:grid;width:100%;grid-template-columns:1fr;order:3;gap:7px}.chess-mvc-root .chess-card{min-width:0;background:#fff;border:1px solid #e6ded2;border-radius:12px;padding:8px}
.chess-mvc-root .chess-card h3{font-size:.92rem;margin:0 0 8px}.chess-mvc-root .chess-history{list-style:none;padding:0;margin:0;max-height:95px;overflow:auto;font-size:10px}
.chess-mvc-root .chess-history li{display:grid;grid-template-columns:2.5rem minmax(0,1fr) minmax(0,1fr);gap:8px;padding:3px 0;white-space:nowrap}
.chess-mvc-root .chess-history li:nth-child(odd){background:#f7f1e9}.chess-mvc-root .chess-captures{min-height:22px;display:flex;flex-wrap:wrap;gap:2px}
.chess-mvc-root .chess-captures .chess-piece{width:22px;height:22px}.chess-mvc-root .chess-status{margin:0;color:var(--chess-purple);font-weight:700}
.chess-mvc-root[data-player="p2"] .chess-board{transform:rotate(180deg)}.chess-mvc-root[data-player="p2"] .chess-board .chess-piece{transform:rotate(180deg)}
.chess-mvc-root .chess-exit{min-height:34px;border:1px solid #e6ded2;background:#fff;border-radius:10px;padding:6px 11px;font-size:10px;font-weight:650;cursor:pointer}
.chess-mvc-root .chess-promotion{display:flex;gap:8px;margin-top:12px;justify-content:center}.chess-mvc-root .chess-promotion button{border:1px solid #e1d6c6;background:#fffdf9;border-radius:9px;padding:8px;cursor:pointer}
.chess-mvc-root button:focus-visible{outline:3px solid var(--chess-orange);outline-offset:2px}
.chess-mvc-root .chess-turn-banner{position:fixed;z-index:10;right:max(12px,calc((100vw - 496px)/2));bottom:max(10px,env(safe-area-inset-bottom));left:max(12px,calc((100vw - 496px)/2));border-radius:13px;background:#252333;padding:11px;color:#fff;text-align:center;font-size:11px;font-weight:700;box-shadow:0 5px 16px #342c3b22}
@media(max-width:390px){.chess-mvc-root{padding-right:10px;padding-left:10px}.chess-mvc-root .chess-panel{grid-template-columns:1fr}.chess-mvc-root .chess-card{padding:6px}.chess-mvc-root .chess-history{max-height:76px}}
`;

const PIECE_NAMES = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function pieceSvg(piece, t) {
  const type = piece.toLowerCase();
  const color = piece === piece.toUpperCase() ? 'white' : 'black';
  const shapes = {
    p: '<circle cx="50" cy="27" r="13"/><path d="M37 43h26l5 23H32zM27 72h46v8H27z"/>',
    n: '<path d="M27 74h47v7H27zM31 68l4-22 8-8 1-15 12 9 10 2 3 12-10 5-9-3-7 20z"/><circle cx="53" cy="34" r="2" class="eye"/>',
    b: '<circle cx="50" cy="26" r="9"/><path d="M44 37c-4 9-14 16-14 29h40c0-13-10-20-14-29a11 11 0 0 1-12 0zM27 72h46v8H27z"/><path d="m43 40 14 17"/>',
    r: '<path d="M28 22h12v10h8V22h8v10h8V22h9v20l-7 6 5 22H29l5-22-6-6zM26 73h48v8H26z"/>',
    q: '<circle cx="27" cy="27" r="5"/><circle cx="50" cy="20" r="5"/><circle cx="73" cy="27" r="5"/><path d="m28 34 12 10 10-17 10 17 12-10-6 34H34zM27 72h46v8H27z"/>',
    k: '<path d="M45 18h10v12h12v9H55v9h-10v-9H33v-9h12zM36 51c0-9 7-14 14-14s14 5 14 14l8 17H28zM26 72h48v8H26z"/>',
  };
  const pieceName = t(`${color === 'white' ? 'White' : 'Black'} ${PIECE_NAMES[type]}`);
  return `<svg class="chess-piece piece-${color}" viewBox="0 0 100 100" role="img" aria-label="${escapeHtml(pieceName)}" xmlns="http://www.w3.org/2000/svg"><g fill="currentColor" stroke="#51465a" stroke-width="3" stroke-linejoin="round">${shapes[type]}</g><style>.eye{fill:#51465a;stroke:none}</style></svg>`;
}

export class ChessView {
  constructor(container, { t = (value) => value } = {}) {
    if (!container || typeof container.appendChild !== 'function') throw new TypeError('A DOM container is required');
    this.container = container;
    this.t = t;
    this.handlers = null;
    this.boundClick = (event) => {
      const square = event.target.closest('[data-square]');
      if (square && this.container.contains(square)) {
        this.handlers?.onSquare?.(square.dataset.square);
        return;
      }
      const promotion = event.target.closest('[data-promotion]');
      if (promotion && this.container.contains(promotion)) {
        this.handlers?.onPromotion?.(promotion.dataset.promotion);
        return;
      }
      const exit = event.target.closest('[data-exit]');
      if (exit && this.container.contains(exit)) this.handlers?.onExit?.();
      const restart = event.target.closest('[data-restart]');
      if (restart && this.container.contains(restart)) this.handlers?.onRestart?.();
    };
    this.container.classList.add('chess-mvc-root');
    this.container.addEventListener('click', this.boundClick);
  }

  render(state, legalMoves = []) {
    const t = (value) => escapeHtml(this.t(value));
    const pieceAt = (square) => state.pieces?.[square] || null;
    const legalTargets = new Set(legalMoves.map((move) => move.to));
    const selected = state.selectedSquare || '';
    const last = state.lastMove;
    let board = '';
    for (let rank = 7; rank >= 0; rank -= 1) {
      for (let file = 0; file < 8; file += 1) {
        const square = `${'abcdefgh'[file]}${rank + 1}`;
        const piece = pieceAt(square);
        const classes = [
          'chess-square',
          (file + rank) % 2 ? 'dark' : 'light',
          selected === square ? 'selected' : '',
          legalTargets.has(square) ? 'legal' : '',
          last && (last.from === square || last.to === square) ? 'last-move' : '',
        ].filter(Boolean).join(' ');
        const colorLabel = piece ? `${piece === piece.toUpperCase() ? 'White' : 'Black'} ${PIECE_NAMES[piece.toLowerCase()]}` : 'empty square';
        const squareLabel = t(`${colorLabel} on ${square}`);
        board += `<button type="button" class="${classes}" data-square="${square}" aria-label="${squareLabel}" aria-pressed="${selected === square}">${piece ? pieceSvg(piece, this.t) : ''}</button>`;
      }
    }
    const turns = state.history || [];
    let moveRows = '';
    for (let index = 0; index < turns.length; index += 2) {
      moveRows += `<li><span>${t(`Move ${Math.floor(index / 2) + 1}`)}</span><span>${t(turns[index])}</span><span>${turns[index + 1] ? t(turns[index + 1]) : ''}</span></li>`;
    }
    const captured = (pieces) => (pieces || []).map((piece) => pieceSvg(piece, this.t)).join('');
    const turnText = state.status?.over
      ? state.status.reason === 'checkmate'
        ? `${t(state.status.winner === 'w' ? 'White' : 'Black')} ${t('wins by checkmate')}`
        : t(state.status.reason === 'stalemate' ? 'Draw by stalemate' : state.status.reason === 'fifty-move' ? 'Draw by fifty-move rule' : 'Draw by insufficient material')
      : `${t(state.turn === 'w' ? 'White to move' : 'Black to move')}${state.status?.inCheck ? ` — ${t('Check')}` : ''}`;
    const promotion = state.promotionPending
      ? `<div class="chess-promotion" role="group" aria-label="${t('Choose promotion piece')}">${['q', 'r', 'b', 'n'].map((choice) =>
        `<button type="button" data-promotion="${choice}" aria-label="${t(`Promote to ${PIECE_NAMES[choice]}`)}">${pieceSvg(state.turn === 'w' ? choice.toUpperCase() : choice, this.t)}</button>`).join('')}</div>`
      : '';
    const whiteCaptures = captured(state.captured?.w);
    const blackCaptures = captured(state.captured?.b);
    const topColor = state.playerId === 'p1' ? 'b' : 'w';
    const bottomColor = topColor === 'w' ? 'b' : 'w';
    const colorName = (color) => t(color === 'w' ? 'White' : 'Black');
    const capturesFor = (color) => color === 'w' ? whiteCaptures : blackCaptures;
    this.container.dataset.player = state.playerId;
    this.container.innerHTML = `<style>${STYLE}</style><header class="chess-header"><h2>${t('Chess')}</h2><span class="chess-mode">${t(state.mode === '2P' ? '2P · Pass & Play' : '1P · Solo')}</span><div class="chess-actions"><button type="button" class="chess-exit" data-exit>${t('Exit')}</button><button type="button" class="chess-exit" data-restart>${t('Restart')}</button></div><strong class="chess-turn" aria-live="polite">${turnText}</strong></header><div class="chess-layout"><div class="chess-player${state.turn === topColor ? ' is-active' : ''}"><span>${colorName(topColor)}</span><div class="chess-captures" aria-label="${t('Captured pieces')}">${capturesFor(topColor)}</div></div><section><div class="chess-board" role="grid" aria-label="${t('Chess board')}">${board}</div>${promotion}</section><div class="chess-player${state.turn === bottomColor ? ' is-active' : ''}"><span>${colorName(bottomColor)} · ${t('You')}</span><div class="chess-captures" aria-label="${t('Captured pieces')}">${capturesFor(bottomColor)}</div></div><aside class="chess-panel"><section class="chess-card history-card"><h3>${t('Move history')}</h3><ol class="chess-history">${moveRows || `<li>${t('No moves yet')}</li>`}</ol></section></aside></div><div class="chess-turn-banner" role="status" aria-live="polite">${turnText}</div>`;
  }

  mountHandlers({ onSquare, onPromotion, onExit, onRestart } = {}) {
    this.handlers = { onSquare, onPromotion, onExit, onRestart };
  }

  dispose() {
    this.container.removeEventListener('click', this.boundClick);
    this.handlers = null;
  }
}

export default ChessView;
