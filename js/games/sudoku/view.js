const STYLE = `
.sudoku-game{--sudoku-ink:#342c3b;--sudoku-muted:#807785;--sudoku-paper:#f5f2ea;--sudoku-panel:#fff;--sudoku-line:#e6ded2;--sudoku-orange:#e48755;--sudoku-purple:#6437e8;width:100%;max-width:540px;min-height:100dvh;margin:0 auto;padding:max(12px,env(safe-area-inset-top)) 14px max(12px,env(safe-area-inset-bottom));color:var(--sudoku-ink);font:15px/1.45 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
.sudoku-game *{box-sizing:border-box}.sudoku-game button{font:inherit;color:inherit;cursor:pointer}.sudoku-game button:focus-visible{outline:3px solid var(--sudoku-purple);outline-offset:2px;z-index:2;position:relative}
.sudoku-game .sudoku-shell{display:flex;min-height:calc(100dvh - 24px);flex-direction:column;gap:9px;padding:0 0 118px;border:0;border-radius:0;background:transparent;box-shadow:none}
.sudoku-game .sudoku-header{display:grid;grid-template-columns:1fr auto 1fr;grid-template-rows:auto auto;align-items:center;gap:9px 6px;margin-bottom:1px;text-align:center}
.sudoku-game .sudoku-top-action{min-height:34px;border:1px solid var(--sudoku-line);border-radius:11px;background:var(--sudoku-panel);padding:7px 12px;color:#4f5665;font-size:11px;font-weight:650}
.sudoku-game .sudoku-top-action[data-action="exit"]{grid-column:1;grid-row:1;justify-self:start}
.sudoku-game .sudoku-top-action[data-action="restart"]{grid-column:3;grid-row:1;justify-self:end}
.sudoku-game .sudoku-mode{grid-column:2;grid-row:1;border-radius:16px;background:#ffe9df;padding:7px 10px;color:#d97843;font-size:10px;font-weight:750;white-space:nowrap}
.sudoku-game .sudoku-heading{grid-column:1/-1;grid-row:2}
.sudoku-game .sudoku-title{margin:0;color:var(--sudoku-ink);font-size:clamp(18px,5vw,24px);line-height:1.1;letter-spacing:-.045em}
.sudoku-game .sudoku-subtitle{margin:4px 0 0;color:var(--sudoku-muted);font-size:10px}
.sudoku-game .sudoku-exit,.sudoku-game .sudoku-tool{border:1px solid var(--sudoku-line);border-radius:11px;background:var(--sudoku-panel);padding:9px 13px;font-size:13px}
.sudoku-game .sudoku-stats{display:none}
.sudoku-game .sudoku-stat{min-width:106px;flex:1;border:1px solid var(--sudoku-line);border-radius:13px;background:var(--sudoku-panel);padding:10px 13px}
.sudoku-game .sudoku-stat-label{display:block;color:var(--sudoku-muted);font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
.sudoku-game .sudoku-stat-value{display:block;margin-top:3px;font-variant-numeric:tabular-nums;font-size:20px;font-weight:700}
.sudoku-game .sudoku-game-layout{display:flex;min-height:0;flex-direction:column}
.sudoku-game .sudoku-game-layout>div:first-child{order:2;border:1px solid var(--sudoku-line);border-radius:15px;background:#fff;padding:7px;box-shadow:0 2px 6px #342c3b0d}
.sudoku-game .sudoku-board{display:grid;grid-template-rows:repeat(9,minmax(0,1fr));width:100%;aspect-ratio:1;border:1px solid #cbc8c4;border-radius:8px;overflow:hidden;background:var(--sudoku-panel)}
.sudoku-game .sudoku-row{display:grid;grid-template-columns:repeat(9,minmax(0,1fr));min-height:0}
.sudoku-game .sudoku-cell{position:relative;display:grid;min-width:0;min-height:0;place-items:center;border:0;border-right:1px solid #d5ccbf;border-bottom:1px solid #d5ccbf;border-radius:0;background:var(--sudoku-panel);padding:0;font-size:clamp(14px,4vw,21px);font-weight:550;font-variant-numeric:tabular-nums}
.sudoku-game .sudoku-cell[data-box-right="true"]{border-right:2px solid var(--sudoku-ink)}.sudoku-game .sudoku-cell[data-box-bottom="true"]{border-bottom:2px solid var(--sudoku-ink)}
.sudoku-game .sudoku-cell[data-cage-top="true"]{border-top:1px dotted var(--sudoku-orange)}.sudoku-game .sudoku-cell[data-cage-right="true"]{border-right:1px dotted var(--sudoku-orange)}.sudoku-game .sudoku-cell[data-cage-bottom="true"]{border-bottom:1px dotted var(--sudoku-orange)}.sudoku-game .sudoku-cell[data-cage-left="true"]{border-left:1px dotted var(--sudoku-orange)}
.sudoku-game .sudoku-cell[data-box-right="true"][data-cage-right="true"]{border-right:2px solid var(--sudoku-ink)}.sudoku-game .sudoku-cell[data-box-bottom="true"][data-cage-bottom="true"]{border-bottom:2px solid var(--sudoku-ink)}
.sudoku-game .sudoku-cell.is-selected{background:#eee5f2;box-shadow:inset 0 0 0 2px var(--sudoku-purple);z-index:1}.sudoku-game .sudoku-cell.is-given{font-weight:750;color:#493b4e}.sudoku-game .sudoku-cell.is-filled{color:var(--sudoku-orange)}
.sudoku-game .sudoku-cell.is-peer{background:#f7f0e5}.sudoku-game .sudoku-cell.is-same-value{background:#f6e3d6}
.sudoku-game .sudoku-cage-sum{position:absolute;top:1px;left:2px;color:var(--sudoku-orange);font-size:clamp(6px,1vw,9px);font-weight:700;line-height:1;pointer-events:none}
.sudoku-game .sudoku-cell-value{line-height:1}.sudoku-game .sudoku-notes{display:grid;width:100%;height:100%;grid-template:repeat(3,1fr)/repeat(3,1fr);align-items:center;justify-items:center;padding:11% 3% 2%;color:var(--sudoku-purple);font-size:clamp(6px,1.3vw,11px);font-weight:500;line-height:1}
.sudoku-game .sudoku-tools{display:contents}.sudoku-game .sudoku-race{order:1}.sudoku-game .sudoku-keypad{position:fixed;z-index:20;right:max(12px,calc((100vw - 512px)/2));bottom:max(8px,env(safe-area-inset-bottom));left:max(12px,calc((100vw - 512px)/2));display:grid;grid-template-columns:repeat(9,minmax(0,1fr));gap:5px;border-radius:13px;background:var(--sudoku-paper);padding:6px 0}
.sudoku-game .sudoku-key{min-width:0;min-height:42px;border:1px solid var(--sudoku-line);border-radius:10px;background:var(--sudoku-panel);color:var(--sudoku-ink)!important;font-size:14px!important;font-weight:700!important}
.sudoku-game .sudoku-key:hover,.sudoku-game .sudoku-tool:hover,.sudoku-game .sudoku-exit:hover{border-color:var(--sudoku-purple)}
.sudoku-game .sudoku-tool-row{position:fixed;z-index:20;right:max(12px,calc((100vw - 512px)/2));bottom:max(58px,calc(env(safe-area-inset-bottom) + 52px));left:max(12px,calc((100vw - 512px)/2));display:grid;grid-template-columns:1fr 1fr;gap:7px}.sudoku-game .sudoku-tool-row .sudoku-tool{min-height:34px;border-radius:18px;background:#fff;padding:6px 10px;font-size:10px;font-weight:650}.sudoku-game .sudoku-tool.is-active{border-color:var(--sudoku-purple);background:#eee5f2;color:var(--sudoku-purple)}
.sudoku-game .sudoku-race{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:5px 8px;border:1px solid var(--sudoku-line);border-radius:14px;background:var(--sudoku-panel);padding:9px 11px;box-shadow:0 2px 6px #342c3b0d}
.sudoku-game .sudoku-race h2{display:none}
.sudoku-game .sudoku-racer{margin-top:0}.sudoku-game .sudoku-racer-heading{display:flex;justify-content:space-between;gap:5px;font-size:9px}
.sudoku-game .sudoku-race-time{grid-column:2;grid-row:1/3;text-align:center;color:var(--sudoku-muted);font-size:9px;font-weight:650;font-variant-numeric:tabular-nums}
.sudoku-game .sudoku-race .sudoku-racer:first-of-type{grid-column:1;grid-row:1/3}
.sudoku-game .sudoku-race .sudoku-racer:nth-of-type(2){grid-column:3;grid-row:1/3}
.sudoku-game .sudoku-racer-heading strong{font-variant-numeric:tabular-nums}.sudoku-game .sudoku-racer-track{height:6px;margin-top:4px;overflow:hidden;border-radius:9px;background:#eee9e2}
.sudoku-game .sudoku-racer-fill{height:100%;border-radius:inherit;background:var(--sudoku-orange);transition:width .2s ease}.sudoku-game .sudoku-racer.is-local .sudoku-racer-fill{background:var(--sudoku-purple)}
.sudoku-game .sudoku-status{min-height:18px;margin:4px 0 0;color:var(--sudoku-purple);font-weight:650;font-size:10px;text-align:center}
.sudoku-game .sudoku-help{display:none}
.sudoku-game .sudoku-live{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(max-width:410px){.sudoku-game{padding-right:10px;padding-left:10px}.sudoku-game .sudoku-keypad{gap:4px}.sudoku-game .sudoku-key{min-height:40px;font-size:12px!important}.sudoku-game .sudoku-cell{font-size:14px}}
`;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export class SudokuView {
  constructor(container, { t = (source) => source } = {}) {
    if (!container || typeof container.replaceChildren !== "function") {
      throw new TypeError("SudokuView requires a DOM container.");
    }
    this.container = container;
    this.t = t;
    this.handlers = null;
    this.bound = false;
  }

  render(state) {
    const activeElement = this.container.ownerDocument.activeElement;
    const activeAction = activeElement && this.container.contains(activeElement)
      ? activeElement.dataset.action
      : null;
    const activeDigit = activeElement && this.container.contains(activeElement)
      ? activeElement.dataset.digit
      : null;
    const tr = (source, params) => escapeHtml(this.t(source, params));
    const title = state.killer ? tr("Killer Sudoku") : tr("Sudoku");
    const cages = new Map();
    for (const cage of state.cages || []) {
      for (const index of cage.cells) cages.set(index, cage);
    }
    const cells = state.values.map((value, index) => {
      const row = Math.floor(index / 9);
      const column = index % 9;
      const cage = cages.get(index);
      const previous = cages.get(index - 9);
      const next = cages.get(index + 9);
      const left = cages.get(index - 1);
      const right = cages.get(index + 1);
      const isSelected = state.selectedCell === index;
      const isGiven = state.puzzle[index] !== 0;
      const isSameValue = value !== 0 && state.values[state.selectedCell] === value;
      const isPeer = Math.floor(state.selectedCell / 9) === row
        || state.selectedCell % 9 === column
        || (Math.floor(state.selectedCell / 27) === Math.floor(index / 27)
          && Math.floor((state.selectedCell % 9) / 3) === Math.floor(column / 3));
      const noteSet = new Set(state.notes[index] || []);
      const ariaValue = value
        ? tr("number {value}", { value })
        : tr("empty");
      const cageLabel = state.killer && cage && cage.cells[0] === index
        ? tr(", cage sum {sum}", { sum: cage.sum })
        : "";
      const accessibleLabel = tr("Row {row}, column {column}, {value}{given}{cage}", {
        row: row + 1,
        column: column + 1,
        value: ariaValue,
        given: isGiven ? `, ${tr("given")}` : "",
        cage: cageLabel,
      });
      const notes = value ? "" : `<span class="sudoku-notes" aria-hidden="true">${
        Array.from({ length: 9 }, (_, candidateIndex) => {
          const digit = candidateIndex + 1;
          return `<span>${noteSet.has(digit) ? digit : ""}</span>`;
        }).join("")
      }</span>`;
      const cageSum = state.killer && cage && cage.cells[0] === index
        ? `<span class="sudoku-cage-sum" aria-label="${tr("Cage sum: {sum}", { sum: cage.sum })}">${cage.sum}</span>`
        : "";
      return `<button type="button" role="gridcell" class="sudoku-cell${isSelected ? " is-selected" : ""}${isGiven ? " is-given" : ""}${value && !isGiven ? " is-filled" : ""}${isPeer && !isSelected ? " is-peer" : ""}${isSameValue && !isSelected ? " is-same-value" : ""}" data-action="cell" data-index="${index}" aria-label="${accessibleLabel}" aria-selected="${isSelected}" aria-readonly="${isGiven}" tabindex="${isSelected ? "0" : "-1"}" data-box-right="${column === 2 || column === 5}" data-box-bottom="${row === 2 || row === 5}" data-cage-top="${state.killer && cage && previous !== cage && row !== 0}" data-cage-right="${state.killer && cage && right !== cage && column !== 8}" data-cage-bottom="${state.killer && cage && next !== cage && row !== 8}" data-cage-left="${state.killer && cage && left !== cage && column !== 0}">${cageSum}<span class="sudoku-cell-value">${value || ""}</span>${notes}</button>`;
    });
    const boardRows = Array.from({ length: 9 }, (_, row) =>
      `<div role="row" class="sudoku-row">${cells.slice(row * 9, row * 9 + 9).join("")}</div>`,
    ).join("");

    const race = state.race || [
      { id: "p1", label: tr("P1"), progress: state.progress, local: true },
      { id: "p2", label: tr("P2"), progress: state.remoteProgress || 0, local: false },
    ];
    const racerMarkup = race.map((player) => {
      const progress = Math.max(0, Math.min(100, Number(player.progress) || 0));
      return `<div class="sudoku-racer${player.local ? " is-local" : ""}">
        <div class="sudoku-racer-heading"><span>${escapeHtml(player.label)}</span><strong>${progress}%</strong></div>
        <div class="sudoku-racer-track" role="progressbar" aria-label="${tr("{player} progress", { player: player.label })}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><div class="sudoku-racer-fill" style="width:${progress}%"></div></div>
      </div>`;
    }).join("");
    const speed = state.elapsedSeconds
      ? Math.round((state.progress * 60) / state.elapsedSeconds)
      : 0;
    const solvedMessage = state.mode === "2P"
      ? state.solved && state.remoteSolved
        ? state.elapsedSeconds === state.remoteElapsedSeconds
          ? tr("Both players solved the puzzle at the same time!")
          : state.elapsedSeconds < state.remoteElapsedSeconds
            ? tr("You solved it first!")
            : tr("Your opponent solved it first!")
        : state.solved
          ? tr("Puzzle solved! Waiting for your opponent.")
          : state.remoteSolved
            ? tr("Your opponent solved it first!")
            : ""
      : tr("Puzzle solved!");
    const keypad = Array.from({ length: 9 }, (_, index) =>
      `<button type="button" class="sudoku-key" data-action="digit" data-digit="${index + 1}" aria-label="${tr("Enter {digit}", { digit: index + 1 })}">${index + 1}</button>`,
    ).join("");

    this.container.innerHTML = `<style>${STYLE}</style><section class="sudoku-game" aria-label="${title}">
      <div class="sudoku-shell">
        <header class="sudoku-header">
          <button type="button" class="sudoku-top-action" data-action="exit">${tr("Exit")}</button>
          <span class="sudoku-mode">${tr(state.mode === "2P" ? "2P · Speed Race" : "1P · Solo")}</span>
          <button type="button" class="sudoku-top-action" data-action="restart">${tr("Restart")}</button>
          <div class="sudoku-heading"><h1 class="sudoku-title">${title}</h1><p class="sudoku-subtitle">${tr(state.killer ? "Dotted cages add up to their corner totals." : "Fill every row, column, and box with 1–9.")}</p></div>
        </header>
        <div class="sudoku-stats" aria-label="${tr("Game statistics")}">
          <div class="sudoku-stat"><span class="sudoku-stat-label">${tr("Time")}</span><strong class="sudoku-stat-value">${formatTime(state.elapsedSeconds)}</strong></div>
          <div class="sudoku-stat"><span class="sudoku-stat-label">${tr("Progress")}</span><strong class="sudoku-stat-value">${state.progress}%</strong></div>
          ${state.killer ? `<div class="sudoku-stat"><span class="sudoku-stat-label">${tr("Speed")}</span><strong class="sudoku-stat-value">${tr("{count}/min", { count: speed })}</strong></div>` : ""}
        </div>
        <div class="sudoku-game-layout">
          <div>
            <div class="sudoku-board" role="grid" aria-label="${tr("Sudoku board")}">${boardRows}</div>
            <p class="sudoku-status" role="status" aria-live="polite">${state.solved || state.remoteSolved ? solvedMessage : state.notesMode ? tr("Notes mode is on.") : tr("Select a cell and enter a number.")}</p>
            <span class="sudoku-live" aria-live="polite">${tr("{progress}% complete", { progress: state.progress })}</span>
          </div>
          <aside class="sudoku-tools" aria-label="${tr("Game controls")}">
            <div class="sudoku-keypad" aria-label="${tr("Number keypad")}">${keypad}</div>
            <div class="sudoku-tool-row">
              <button type="button" class="sudoku-tool${state.notesMode ? " is-active" : ""}" data-action="notes" aria-pressed="${state.notesMode}">${tr("Notes")}</button>
              <button type="button" class="sudoku-tool" data-action="clear">${tr("Clear")}</button>
            </div>
            <section class="sudoku-race" aria-label="${tr("Progress race")}">
              <h2>${tr("Progress race")}</h2>${racerMarkup}<div class="sudoku-race-time">${tr("Time")}<br>${formatTime(state.elapsedSeconds)}</div>
            </section>
            <p class="sudoku-help">${tr("Keyboard: 1–9 to enter, N for notes, Backspace to clear, arrows to move.")}</p>
          </aside>
        </div>
      </div>
    </section>`;

    if (activeAction === "cell") {
      this.container.querySelector(`[data-action="cell"][data-index="${state.selectedCell}"]`)?.focus();
    } else if (activeAction === "digit" && activeDigit !== undefined) {
      this.container.querySelector(`[data-action="digit"][data-digit="${activeDigit}"]`)?.focus();
    } else if (activeAction) {
      this.container.querySelector(`[data-action="${activeAction}"]`)?.focus();
    }
  }

  mountHandlers({ onCell, onDigit, onNotes, onClear, onExit, onRestart = () => {} }) {
    this.handlers = { onCell, onDigit, onNotes, onClear, onExit, onRestart };
    if (!this.bound) {
      this.container.addEventListener("click", this.handleClick);
      this.container.addEventListener("keydown", this.handleKeyDown);
      this.bound = true;
    }
    return () => this.unmountHandlers();
  }

  unmountHandlers() {
    if (this.bound) {
      this.container.removeEventListener("click", this.handleClick);
      this.container.removeEventListener("keydown", this.handleKeyDown);
      this.bound = false;
    }
    this.handlers = null;
  }

  handleClick = (event) => {
    const target = event.target.closest("[data-action]");
    if (!target || !this.container.contains(target) || !this.handlers) return;
    const handlers = this.handlers;
    switch (target.dataset.action) {
      case "cell":
        handlers.onCell?.(Number(target.dataset.index));
        break;
      case "digit":
        handlers.onDigit?.(Number(target.dataset.digit));
        break;
      case "notes":
        handlers.onNotes?.();
        break;
      case "clear":
        handlers.onClear?.();
        break;
      case "restart":
        handlers.onRestart?.();
        break;
      case "exit":
        handlers.onExit?.();
        break;
      default:
        break;
    }
  };

  handleKeyDown = (event) => {
    if (!this.handlers) return;
    const target = event.target.closest("[data-action]");
    const index = target && target.dataset.action === "cell" ? Number(target.dataset.index) : null;
    if (/^[1-9]$/.test(event.key)) {
      event.preventDefault();
      this.handlers.onDigit?.(Number(event.key));
    } else if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      this.handlers.onClear?.();
    } else if (event.key.toLowerCase() === "n") {
      event.preventDefault();
      this.handlers.onNotes?.();
    } else if (index !== null && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      const row = Math.floor(index / 9);
      const column = index % 9;
      const nextRow = (row + (event.key === "ArrowUp" ? 8 : event.key === "ArrowDown" ? 1 : 0)) % 9;
      const nextColumn = (column + (event.key === "ArrowLeft" ? 8 : event.key === "ArrowRight" ? 1 : 0)) % 9;
      this.handlers.onCell?.(nextRow * 9 + nextColumn);
    }
  };
}
