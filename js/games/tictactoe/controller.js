export class TicTacToeController {
  constructor({ model, getState, isLocal, publish, render, onError = () => {}, onAction = () => {}, delay = 120 } = {}) {
    if (!model || typeof getState !== "function" || typeof publish !== "function") {
      throw new TypeError("TicTacToeController requires a model, state accessor, and publisher.");
    }
    Object.assign(this, { model, getState, isLocal, publish, render, onError, onAction, delay });
    this.pending = false;
  }

  async move(cell) {
    if (this.pending) return;
    const state = this.getState();
    const nextGame = this.model.applyMove(state.gameState, state.playerId, cell);
    if (!nextGame) return;
    const previousGame = state.gameState;
    state.gameState = nextGame;
    this.pending = true;
    this.render();
    if (this.isLocal()) {
      this.onAction('self');
      if (nextGame.phase === "playing") {
        await new Promise((resolve) => window.setTimeout(resolve, this.delay));
        if (!this.isLocal() || state.gameState !== nextGame) {
          this.pending = false;
          return;
        }
        const aiCell = this.model.chooseComputerMove(state.gameState, "computer");
        const aiMove = this.model.applyMove(state.gameState, "computer", aiCell);
        if (aiMove) {
          state.gameState = aiMove;
          this.onAction('opponent');
        }
      }
      this.pending = false;
      this.render();
      return;
    }
    try {
      await this.publish(nextGame);
      this.onAction('self');
    } catch (error) {
      if (state.gameState === nextGame) state.gameState = previousGame;
      this.onError(error);
    } finally {
      this.pending = false;
      this.render();
    }
  }

  async restart() {
    const state = this.getState();
    if (!state.gameState) return;
    const previousGame = state.gameState;
    const nextGame = this.model.createGame(previousGame.players);
    nextGame.restartAt = Math.max(Date.now(), Number(previousGame.restartAt || 0) + 1);
    state.gameState = nextGame;
    this.render();
    if (this.isLocal()) return;
    try {
      await this.publish(nextGame);
    } catch (error) {
      if (state.gameState === nextGame) state.gameState = previousGame;
      this.onError(error);
      this.render();
    }
  }
}
