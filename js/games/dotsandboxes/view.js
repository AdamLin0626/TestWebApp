export class DotsAndBoxesView {
  constructor(gameView) {
    this.gameView = gameView;
  }

  render(state, getPlayers, pendingMove = false, localMode = false) {
    this.gameView.renderDotsAndBoxes(state, getPlayers, pendingMove, localMode);
  }

  mountHandlers(root, onMove) {
    this.handleClick = (event) => {
      const edge = event.target.closest("[data-edge]");
      if (edge && !edge.disabled && root.contains(edge)) onMove(Number(edge.dataset.edge));
    };
    root.addEventListener("click", this.handleClick);
    return () => {
      root.removeEventListener("click", this.handleClick);
    };
  }
}
