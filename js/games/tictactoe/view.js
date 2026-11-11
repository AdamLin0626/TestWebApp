export class TicTacToeView {
  constructor(gameView) {
    this.gameView = gameView;
  }

  render(state, getPlayers, pendingMove = false) {
    this.gameView.renderTicTacToe(state, getPlayers, pendingMove);
  }

  mountHandlers(root, onMove) {
    this.handleClick = (event) => {
      const cell = event.target.closest("[data-cell]");
      if (cell && !cell.disabled && root.contains(cell)) onMove(Number(cell.dataset.cell));
    };
    root.addEventListener("click", this.handleClick);
    return () => {
      root.removeEventListener("click", this.handleClick);
    };
  }
}
