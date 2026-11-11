export class YahtzeeController {
  constructor({ model, getState, updateGame, render } = {}) {
    if (!model || typeof getState !== "function" || typeof updateGame !== "function") {
      throw new TypeError("YahtzeeController requires a model, state accessor, and update callback.");
    }
    Object.assign(this, { model, getState, updateGame, render });
  }

  roll() {
    const game = this.getState().gameState;
    if (game?.mode === "2P" && game.activePlayerId !== this.getState().playerId) return;
    this.updateGame(this.model.roll(game));
  }

  toggleDie(index) {
    const state = this.getState();
    if (state.gameState?.mode === "2P" && state.gameState.activePlayerId !== state.playerId) return;
    this.updateGame(this.model.toggleDie(state.gameState, index));
  }

  score(category) {
    const state = this.getState();
    if (state.gameState?.mode === "2P" && state.gameState.activePlayerId !== state.playerId) return;
    this.updateGame(this.model.scoreTurn(state.gameState, category));
  }

  restart() {
    const state = this.getState();
    const current = state.gameState;
    if (!current) return;
    if (current.mode === "2P") {
      const nextGame = this.model.createMatch(current.players);
      if (!nextGame) return;
      nextGame.restartAt = Math.max(Date.now(), Number(current.restartAt || 0) + 1);
      nextGame.moveCount = current.moveCount + 1;
      this.updateGame(nextGame);
    } else {
      this.updateGame(this.model.createGame());
    }
  }
}
