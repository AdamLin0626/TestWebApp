export class A1B2Controller {
  constructor({ model, getState, render, publish, onBanner = () => {} } = {}) {
    if (!model || typeof getState !== "function" || typeof render !== "function") {
      throw new TypeError("A1B2Controller requires a model, state accessor, and renderer.");
    }
    this.model = model;
    this.getState = getState;
    this.render = render;
    this.publish = publish;
    this.onBanner = onBanner;
  }

  submitSoloGuess(value) {
    const state = this.getState();
    const turn = state.gameState.turn;
    const result = this.model.scoreGuess(state.soloSecret, value);
    state.guesses[turn] = { turn, guess: value, by: state.playerId, at: Date.now() };
    state.results[turn] = result;
    if (result.a === 4) state.gameState = { ...state.gameState, phase: "won" };
    else state.gameState = { ...state.gameState, turn: turn + 1 };
    this.render();
  }

  async answerGuess(turn, guess) {
    const state = this.getState();
    if (!state.mySecret || state.results[turn]) return;
    const { a, b } = this.model.scoreGuess(state.mySecret, guess.guess);
    try {
      await this.publish(`moves/${turn}/result`, {
        turn, a, b, by: state.playerId, for: guess.by, at: Date.now()
      });
    } catch (error) {
      this.onBanner(`Could not share the result: ${error.message}`, "error");
    }
  }

  processCurrentResult() {
    const state = this.getState();
    if (!state.gameState || state.gameState.phase !== "playing") return;
    const result = state.results[state.gameState.turn];
    if (!result || state.handledResults.has(state.gameState.turn)) return;
    state.handledResults.add(state.gameState.turn);
    if (result.a === 4) {
      state.gameState = { ...state.gameState, phase: "won", winnerId: result.for };
    } else {
      state.gameState = {
        ...state.gameState,
        turn: state.gameState.turn + 1,
        activePlayerId: result.by
      };
    }
    this.publish("game", state.gameState).catch((error) =>
      this.onBanner(`Could not update the game: ${error.message}`, "error"));
    this.render();
  }

  async restart(players, soloMode) {
    const state = this.getState();
    state.guesses = {};
    state.results = {};
    state.handledResults = new Set();
    if (soloMode) {
      state.soloSecret = this.model.createSecret();
      state.gameState = { phase: "playing", turn: 1, activePlayerId: state.playerId };
      this.render();
      return;
    }
    const previousGame = state.gameState;
    const nextGame = {
      phase: "playing",
      turn: 1,
      activePlayerId: players[0]?.id,
      startedAt: Date.now(),
      restartAt: Math.max(Date.now(), Number(previousGame?.restartAt || 0) + 1)
    };
    state.gameState = nextGame;
    this.render();
    try {
      await this.publish("game", nextGame);
    } catch (error) {
      if (state.gameState === nextGame) state.gameState = previousGame;
      this.onBanner(`Could not restart the game: ${error.message}`, "error");
      this.render();
    }
  }
}
