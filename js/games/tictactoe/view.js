export class TicTacToeView {
  constructor(gameView) {
    this.gameView = gameView;
  }

  render(state, getPlayers, pendingMove = false) {
    this.gameView.renderTicTacToe(state, getPlayers, pendingMove);
  }

  mountHandlers(root, onMove, restart, onRestart) {
    this.handleClick = (event) => {
      const cell = event.target.closest("[data-cell]");
      if (cell && !cell.disabled && root.contains(cell)) onMove(Number(cell.dataset.cell));
    };
    root.addEventListener("click", this.handleClick);
    this.handleRestart = onRestart;
    this.restartButton = restart;
    this.handleRestartClick = () => this.handleRestart?.();
    restart.addEventListener("click", this.handleRestartClick);
    return () => {
      root.removeEventListener("click", this.handleClick);
      restart.removeEventListener("click", this.handleRestartClick);
    };
  }
}
